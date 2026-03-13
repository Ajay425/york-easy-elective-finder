from playwright.sync_api import sync_playwright
from playwright_stealth import stealth_sync
import os
import re
import time
import random
import datetime
import json
import logging
from typing import List, Tuple, Set, Optional

# ----------------------------------------------------------
# ⚙️ USER SETTINGS
# ----------------------------------------------------------
FAST_MODE = False
MAX_SUBJECTS = None
SESSION_SELECT = "1"              # "0" for Fall/Winter 2025-2026, "1" for Summer 2026
CAMPUS_NAME = "Keele"
SAVE_DIR = "york_courses"
PROGRESS_FILE = "progress.txt"
LOG_FILE = "scraper.log"
RUN_COMPLETE_MARKER = "run_complete.marker"
# Persist session metadata so downstream steps can tag offerings with term+year
SESSION_META_FILE = "session_meta.json"

# Use absolute paths so paths are consistent regardless of cwd.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SAVE_DIR_PATH = os.path.join(BASE_DIR, SAVE_DIR)
PROGRESS_FILE_PATH = os.path.join(BASE_DIR, PROGRESS_FILE)

COOLDOWN_SECONDS = 300              # 5 minutes (only after many consecutive fails)
SUBJECT_ERROR_THRESHOLD = 5
COURSE_MAX_CONSEC_FAILS = 5         # only cooldown after 5 consecutive failures
SHORT_BACKOFF_BASE = 10             # seconds; doubles each retry attempt
RELAUNCH_PAUSE_SECONDS = 15         # pause after relaunch to avoid instant re-block
SESSION_MAX_COURSES = 50            # Relaunch browser every N courses to refresh fingerprint
# ----------------------------------------------------------

logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)

# Slower default pacing to reduce bot-blocking risk
if FAST_MODE:
    HUMAN_DELAY_MIN = 2.0
    HUMAN_DELAY_MAX = 5.0
    BETWEEN_PAGES_MIN = 2.0
    BETWEEN_PAGES_MAX = 4.0
else:
    HUMAN_DELAY_MIN = 15.0
    HUMAN_DELAY_MAX = 20
    BETWEEN_PAGES_MIN = 14
    BETWEEN_PAGES_MAX = 19

def human_pause(min_sec: Optional[float] = None, max_sec: Optional[float] = None) -> None:
    """More natural: single random sleep instead of two consecutive ones"""
    time.sleep(random.uniform(min_sec or HUMAN_DELAY_MIN, max_sec or HUMAN_DELAY_MAX))

def between_pages_pause() -> None:
    """More natural: single random sleep"""
    time.sleep(random.uniform(BETWEEN_PAGES_MIN, BETWEEN_PAGES_MAX))

def short_backoff_seconds(attempt: int) -> int:
    # attempt is 1..N
    return min(SHORT_BACKOFF_BASE * (2 ** (attempt - 1)), 180)  # cap at 3 minutes

def sanitize_filename(name: str) -> str:
    return re.sub(r'[\\/*?:"<>|]', "_", name.strip())[:160]

def file_is_valid_html(path: str, min_bytes: int = 800) -> bool:
    try:
        return os.path.exists(path) and os.path.getsize(path) >= min_bytes
    except Exception:
        return False

def cooldown(reason: str) -> None:
    logging.warning(f"🧊 Cooldown ({COOLDOWN_SECONDS/60:.0f} min): {reason}")
    time.sleep(COOLDOWN_SECONDS)

# ----------------------------------------------------------
# 🕐 DAILY MAINTENANCE CHECK
# ----------------------------------------------------------
def check_maintenance_window() -> None:
    now = datetime.datetime.now()
    start = now.replace(hour=23, minute=55, second=0, microsecond=0)
    end = now.replace(hour=1, minute=45, second=0, microsecond=0)
    if now.hour < 2:
        start = (now - datetime.timedelta(days=1)).replace(hour=23, minute=55, second=0, microsecond=0)
    if start <= now <= end:
        target = now.replace(hour=1, minute=45, second=0, microsecond=0)
        if now.hour >= 23:
            target = (now + datetime.timedelta(days=1)).replace(hour=1, minute=45, second=0, microsecond=0)
        wait_seconds = (target - now).total_seconds()
        logging.info(f"🕐 Maintenance window detected ({now.strftime('%H:%M')} → 1:45 a.m.).")
        logging.info(f"💤 Sleeping for {wait_seconds/60:.1f} minutes...")
        time.sleep(wait_seconds)
        logging.info("✅ Maintenance window over — resuming.")

# ----------------------------------------------------------
# 🧠 SESSION / BLOCK DETECTION
# ----------------------------------------------------------
def page_looks_blocked_or_expired(page) -> bool:
    try:
        html = page.content().lower()
    except Exception:
        return True

    needles = [
        "your session has been ended",
        "you have exceeded the maximum time limit",
        "access denied",
        "please log in",
        "unauthorized",
        "attention required",
        "cloudflare",
        "verify you are human",
        "checking your browser",
        "ray id",
    ]
    return any(n in html for n in needles)

def page_is_dead(page) -> bool:
    try:
        return page.is_closed()
    except Exception:
        return True

# ----------------------------------------------------------
# 🌐 NAV HELPERS (optimized timeouts)
# ----------------------------------------------------------
def open_search_by_subject(page, start_url: str) -> None:
    page.goto(start_url, wait_until="domcontentloaded", timeout=30000)

    if page_looks_blocked_or_expired(page):
        raise RuntimeError("Blocked/interstitial detected on start page.")

    page.wait_for_selector("img[alt='Search By Subject']", timeout=20000)

    human_pause(0.6, 1.4)
    page.locator("img[alt='Search By Subject']").click()
    
    # Wait for the page to load after clicking
    page.wait_for_load_state("networkidle", timeout=45000)
    page.wait_for_selector("#sessionSelect", timeout=30000)
    
    # Select the session (e.g., Summer 2026)
    page.select_option("#sessionSelect", value=SESSION_SELECT)
    human_pause(0.5, 1.0)

    # Persist what session/term+year we selected (to later tag offerings in DB)
    try:
        session_label = page.locator("#sessionSelect option:checked").inner_text().strip()
        if session_label:
            meta_path = os.path.join(BASE_DIR, SESSION_META_FILE)
            with open(meta_path, "w", encoding="utf-8") as f:
                json.dump({"termAndYear": session_label}, f, indent=2)
            logging.info(f"📝 Saved session metadata: {meta_path} -> {session_label}")
    except Exception as e:
        logging.warning(f"⚠️ Failed to write {SESSION_META_FILE}: {e}")

    page.wait_for_selector("#subjectSelect", timeout=30000)

    if page_looks_blocked_or_expired(page):
        raise RuntimeError("Blocked/interstitial detected after clicking Search By Subject.")

def open_subject_results(page, start_url: str, subject_value: str, campus_name: str) -> None:
    open_search_by_subject(page, start_url)

    page.select_option("#subjectSelect", value=subject_value)

    page.evaluate(f"""
        const campus = document.getElementById('campusSelect');
        for (const o of campus.options) o.selected = false;
        for (const o of campus.options)
            if (o.text.includes('{campus_name}')) o.selected = true;
    """)

    human_pause(1.0, 2.5)
    page.locator("input[type=submit][value='Search Courses']").click()

    # Wait for page to start loading
    page.wait_for_load_state("domcontentloaded", timeout=30000)
    
    # Check if blocked BEFORE waiting for specific elements
    time.sleep(2.0)  # Brief pause to let any block page show
    if page_looks_blocked_or_expired(page):
        raise RuntimeError("Blocked/session-expired immediately after submitting search.")

    page.wait_for_selector("h1:has-text('Current Courses Search Results')", timeout=45000)
    
    # Check if "No courses were found" message exists
    no_courses = page.locator("text=No courses were found").count() > 0
    if no_courses:
        logging.info("   ℹ️ No courses found for this subject (empty subject)")
        return  # This will cause collect_course_list to be skipped
    
    page.wait_for_selector("table", timeout=45000)

    # Wait for at least one "Course Schedule" link to exist
    page.wait_for_function(
        """() => Array.from(document.querySelectorAll('a'))
              .some(a => (a.textContent || '').includes('Course Schedule'))""",
        timeout=45000
    )

    # Brief networkidle wait to ensure page is stable
    try:
        page.wait_for_load_state("networkidle", timeout=15000)
    except Exception:
        pass
    
    if page_looks_blocked_or_expired(page):
        raise RuntimeError("Blocked/session-expired page detected on subject results.")

# ----------------------------------------------------------
# ✅ Results parsing + click schedule
# ----------------------------------------------------------
def collect_course_list(page) -> List[Tuple[str, str]]:
    code_re = re.compile(r"^[A-Z]{2}\/[A-Z0-9]{2,}\s+\d{4}\s+\d\.\d{2}$")

    rows = page.locator("table tr").all()
    courses: List[Tuple[str, str]] = []
    seen = set()

    for tr in rows:
        tds = tr.locator("td")
        if tds.count() < 3:
            continue
        code = tds.nth(0).inner_text().strip()
        title = tds.nth(1).inner_text().strip()
        if not code_re.match(code) or not title:
            continue
        key = (code, title)
        if key in seen:
            continue
        seen.add(key)
        courses.append(key)

    if not courses:
        raise RuntimeError("Found 0 valid course rows (results not loaded or markup changed).")
    return courses

def click_course_schedule_link_for_row(page, code: str, title: str) -> None:
    rows = page.locator("table tr").all()
    for tr in rows:
        tds = tr.locator("td")
        if tds.count() < 3:
            continue

        r_code = tds.nth(0).inner_text().strip()
        r_title = tds.nth(1).inner_text().strip()
        if r_code != code or r_title != title:
            continue

        link_locator = tds.nth(2).locator("a").filter(has_text="Course Schedule").first

        href = link_locator.get_attribute("href")
        if not href or "/Apps/WebObjects/cdm.woa/" not in href:
            raise RuntimeError("Row found, but course schedule link href missing/unexpected.")

        link_locator.scroll_into_view_if_needed(timeout=15000)
        link_locator.wait_for(state="visible", timeout=15000)

        human_pause(0.8, 1.8)
        link_locator.click(timeout=20000)

        page.wait_for_load_state("domcontentloaded", timeout=45000)
        page.wait_for_selector("body", timeout=45000)
        
        # Brief networkidle wait for stability
        try:
            page.wait_for_load_state("networkidle", timeout=15000)
        except Exception:
            pass

        if page_looks_blocked_or_expired(page):
            raise RuntimeError("Blocked/session-expired page detected after opening schedule page.")
        return

    raise RuntimeError(f"Could not find matching row to click schedule link: {code} – {title}")

# ----------------------------------------------------------
# 💾 Save logic
# ----------------------------------------------------------
def wait_until_page_ready_for_save(page, max_wait_seconds: int = 25) -> None:
    """
    Wait until the page has loaded enough content to save.
    Uses content stabilization to determine readiness.
    """
    deadline = time.time() + max_wait_seconds
    
    try:
        page.wait_for_load_state("domcontentloaded", timeout=10000)
    except Exception:
        pass
    
    try:
        page.wait_for_selector("body", timeout=10000)
    except Exception:
        raise RuntimeError("Body element never appeared")
    
    # Wait for page to stabilize (content stops growing)
    last_html_len = 0
    stable_count = 0
    min_html_size = 3000
    
    while time.time() < deadline:
        if page_looks_blocked_or_expired(page):
            raise RuntimeError("Blocked/session-expired while waiting to save.")
        
        try:
            html_len = page.evaluate("() => document.documentElement ? document.documentElement.outerHTML.length : 0")
            body_len = page.evaluate("() => document.body ? document.body.innerText.length : 0")
            
            if html_len >= min_html_size and body_len >= 500:
                if html_len == last_html_len:
                    stable_count += 1
                    if stable_count >= 1:
                        logging.info(f"      📄 Page ready: {html_len} bytes HTML, {body_len} chars text")
                        return
                else:
                    stable_count = 0
                    last_html_len = html_len
            else:
                last_html_len = html_len
                stable_count = 0
            
        except Exception as e:
            logging.warning(f"      ⚠️ Error checking page size: {e}")
            time.sleep(1.0)
            continue
        
        time.sleep(1.0)
    
    # Timeout - check if we have minimal content
    try:
        html_len = page.evaluate("() => document.documentElement ? document.documentElement.outerHTML.length : 0")
        if html_len >= min_html_size:
            logging.warning(f"      ⏱️ Timeout but page has {html_len} bytes - proceeding")
            return
    except Exception:
        pass
    
    raise RuntimeError(f"Page never became ready for save (timeout after {max_wait_seconds}s)")

def save_current_page_html(page, filepath: str) -> None:
    wait_until_page_ready_for_save(page)
    html = page.content()
    
    if not html or len(html.strip()) < 2000:
        raise RuntimeError(f"HTML too small/empty when saving ({len(html)} bytes).")
    
    if page_looks_blocked_or_expired(page):
        raise RuntimeError("Blocked/session-expired HTML when saving.")

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(html)

# ----------------------------------------------------------
# 🚀 MAIN
# ----------------------------------------------------------
def get_user_agents() -> List[str]:
    """Updated user agents to more recent versions"""
    return [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    ]

def main() -> None:
    with sync_playwright() as p:
        base_url = "https://w2prod.sis.yorku.ca"
        start_url = f"{base_url}/Apps/WebObjects/cdm.woa/"

        def new_session():
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--disable-infobars",
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                    "--disable-software-rasterizer",
                    "--disable-backgrounding-occluded-windows",
                    "--disable-background-timer-throttling",
                    "--ignore-gpu-blacklist",
                    "--disable-features=IsolateOrigins,site-per-process",
                    "--disable-site-isolation-trials",
                ],
            )
            ua = random.choice(get_user_agents())
            
            # Randomize viewport slightly for more natural fingerprint
            viewport_width = random.randint(1320, 1920)
            viewport_height = random.randint(720, 1080)
            
            context = browser.new_context(
                user_agent=ua,
                viewport={"width": viewport_width, "height": viewport_height},
                locale="en-US,en;q=0.9",
                geolocation={"latitude": 43.7767, "longitude": -79.5011},
                permissions=["geolocation"],
                extra_http_headers={
                    "Accept-Language": "en-US,en;q=0.9",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                    "DNT": "1",
                    "Connection": "keep-alive",
                    "Upgrade-Insecure-Requests": "1",
                }
            )
            stealth_sync(context)
            page = context.new_page()
            page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            return browser, context, page

        def close_session(browser, context):
            try:
                try: context.close()
                except Exception: pass
                try: browser.close()
                except Exception: pass
            except Exception:
                pass

        logging.info(f"🚀 Launching Playwright browser (FAST_MODE={FAST_MODE})")
        browser, context, page = new_session()
        courses_in_session = 0

        # Build subjects list
        check_maintenance_window()
        logging.info("🌐 Opening York course site...")
        open_search_by_subject(page, start_url)

        options = page.locator("#subjectSelect option").all()
        subjects = [
            (opt.inner_text().strip(), opt.get_attribute("value"))
            for opt in options
            if opt.get_attribute("value")
        ]
        if MAX_SUBJECTS:
            subjects = subjects[:MAX_SUBJECTS]
        logging.info(f"📚 Found {len(subjects)} subjects to scrape")

        # Load prior progress, if any.
        completed_subjects: Set[str] = set()
        if os.path.exists(PROGRESS_FILE_PATH):
            try:
                with open(PROGRESS_FILE_PATH, "r", encoding="utf-8") as f:
                    completed_subjects = {line.strip() for line in f if line.strip()}
            except Exception as e:
                logging.warning(f"⚠️ Failed to read {PROGRESS_FILE_PATH}: {e}")

        # Determine if the prior run finished completely; if so, archive its output.
        run_complete_marker = os.path.join(BASE_DIR, RUN_COMPLETE_MARKER)
        run_finished_cleanly = os.path.exists(run_complete_marker)
        run_finished_by_progress = len(completed_subjects) == len(subjects) and len(subjects) > 0

        if (run_finished_cleanly or run_finished_by_progress) and os.path.isdir(SAVE_DIR_PATH):
            try:
                ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
                archive_root = os.path.join(BASE_DIR, "archive")
                os.makedirs(archive_root, exist_ok=True)
                base = os.path.basename(os.path.normpath(SAVE_DIR))
                archive_dir = os.path.join(archive_root, f"{base}_completed_{ts}")
                if os.path.exists(archive_dir):
                    suffix = 1
                    while os.path.exists(f"{archive_dir}_{suffix}"):
                        suffix += 1
                    archive_dir = f"{archive_dir}_{suffix}"
                os.rename(SAVE_DIR_PATH, archive_dir)
                logging.info(f"🧹 Archived previous scraper output to {archive_dir}")
            except Exception as e:
                logging.warning(f"⚠️ Failed to archive existing {SAVE_DIR_PATH}: {e}")

            try:
                open(PROGRESS_FILE_PATH, "w", encoding="utf-8").close()
                logging.info(f"🧹 Cleared {PROGRESS_FILE_PATH}")
            except Exception as e:
                logging.warning(f"⚠️ Failed to clear {PROGRESS_FILE_PATH}: {e}")

            try:
                os.remove(run_complete_marker)
            except Exception:
                pass

            completed_subjects = set()

        os.makedirs(SAVE_DIR_PATH, exist_ok=True)
        logging.info(f"🔁 Resuming — {len(completed_subjects)} subjects already completed")

        for idx, (subject_name, subject_value) in enumerate(subjects, start=1):
            check_maintenance_window()

            if subject_name in completed_subjects:
                logging.info(f"⏭️ Skipping {subject_name} — already completed.")
                continue

            logging.info(f"\n🎓 [{idx}/{len(subjects)}] Scraping subject: {subject_name}")

            subj_dir = os.path.join(SAVE_DIR_PATH, sanitize_filename(subject_name))
            os.makedirs(subj_dir, exist_ok=True)

            subject_errors = 0
            while True:
                check_maintenance_window()

                # Periodic session refresh to avoid fingerprint staleness
                if courses_in_session >= SESSION_MAX_COURSES:
                    logging.info(f"🔄 Refreshing session after {courses_in_session} courses (fingerprint renewal)")
                    close_session(browser, context)
                    browser, context, page = new_session()
                    courses_in_session = 0
                    time.sleep(RELAUNCH_PAUSE_SECONDS)

                if page_is_dead(page):
                    logging.warning("Page died. Relaunching session.")
                    close_session(browser, context)
                    browser, context, page = new_session()
                    courses_in_session = 0
                    time.sleep(RELAUNCH_PAUSE_SECONDS)

                try:
                    open_subject_results(page, start_url, subject_value, CAMPUS_NAME)
                    
                    # Check if page has "No courses were found" message
                    no_courses = page.locator("text=No courses were found").count() > 0
                    if no_courses:
                        logging.info(f"   ✅ Subject has no courses - marking as complete")
                        with open(PROGRESS_FILE, "a", encoding="utf-8") as f:
                            f.write(subject_name + "\n")
                        
                        # Refresh browser and move to next subject
                        logging.info("🔄 Refreshing browser session...")
                        close_session(browser, context)
                        time.sleep(random.uniform(8, 15))
                        browser, context, page = new_session()
                        courses_in_session = 0
                        break
                    
                    courses = collect_course_list(page)
                    logging.info(f"   → Found {len(courses)} courses")
                except Exception as e:
                    subject_errors += 1
                    logging.warning(f"⚠️ Subject load failed: {e}")
                    if subject_errors >= SUBJECT_ERROR_THRESHOLD:
                        cooldown("Too many subject errors; backing off.")
                        subject_errors = 0
                        close_session(browser, context)
                        browser, context, page = new_session()
                        courses_in_session = 0
                        time.sleep(RELAUNCH_PAUSE_SECONDS)
                    continue

                # Per-course loop
                for i, (code, title) in enumerate(courses, start=1):
                    check_maintenance_window()
                    filename = sanitize_filename(f"{code}_{title}_CourseSchedule.html")
                    filepath = os.path.join(subj_dir, filename)

                    logging.info(f"   ↳ [{i}/{len(courses)}] {code} – {title}")

                    if file_is_valid_html(filepath):
                        logging.info(f"      ✅ Already have {os.path.basename(filepath)} (skipping)")
                        # Still need to pace ourselves even when skipping
                        continue

                    consec_fail = 0

                    while True:
                        check_maintenance_window()
                        t0 = time.time()

                        try:
                            open_subject_results(page, start_url, subject_value, CAMPUS_NAME)
                            human_pause(1.0, 2.0)

                            click_course_schedule_link_for_row(page, code, title)

                            time.sleep(1.5)

                            save_current_page_html(page, filepath)
                            logging.info(f"      💾 Saved {os.path.basename(filepath)}")

                            courses_in_session += 1
                            between_pages_pause()
                            break

                        except Exception as e:
                            elapsed = time.time() - t0
                            consec_fail += 1

                            logging.warning(
                                f"      ⚠️ Attempt took {elapsed:.1f}s before failing for {code}: {e}"
                            )

                            msg = str(e)
                            if ("Search By Subject" in msg) or ("Blocked/interstitial" in msg) or ("cloudflare" in msg.lower()) or ("session" in msg.lower()):
                                logging.warning("      ♻️ Bad state/blocked detected; relaunching browser/context.")
                                close_session(browser, context)
                                browser, context, page = new_session()
                                courses_in_session = 0
                                time.sleep(RELAUNCH_PAUSE_SECONDS)
                                if "Blocked" in msg or "session" in msg.lower():
                                    extra_wait = random.uniform(20, 40)
                                    logging.warning(f"      🛑 Adding extra cooldown: {extra_wait:.1f}s")
                                    time.sleep(extra_wait)

                            if consec_fail < COURSE_MAX_CONSEC_FAILS:
                                wait_s = short_backoff_seconds(consec_fail)
                                if "Blocked" in msg or "session" in msg.lower():
                                    extra = random.uniform(15, 30)
                                    wait_s += extra
                                    logging.warning(
                                        f"      ↻ Block detected - retry SAME course after {wait_s:.1f}s "
                                        f"({consec_fail}/{COURSE_MAX_CONSEC_FAILS})."
                                    )
                                else:
                                    logging.warning(
                                        f"      ↻ Retry SAME course after short backoff {wait_s}s "
                                        f"({consec_fail}/{COURSE_MAX_CONSEC_FAILS})."
                                    )
                                time.sleep(wait_s)
                            else:
                                cooldown(f"Course failed {consec_fail} consecutive times ({code}). {e}")
                                consec_fail = 0

                            if page_is_dead(page):
                                close_session(browser, context)
                                browser, context, page = new_session()
                                courses_in_session = 0
                                time.sleep(RELAUNCH_PAUSE_SECONDS)

                            continue

                # Verify completion
                all_ok = True
                for (code, title) in courses:
                    fn = sanitize_filename(f"{code}_{title}_CourseSchedule.html")
                    fp = os.path.join(subj_dir, fn)
                    if not file_is_valid_html(fp):
                        all_ok = False
                        logging.warning(f"❌ Subject NOT complete; missing/invalid: {fn}")
                        break

                if all_ok:
                    with open(PROGRESS_FILE, "a", encoding="utf-8") as f:
                        f.write(subject_name + "\n")
                    logging.info(f"✅ Finished {subject_name} (saved to {PROGRESS_FILE})")
                    
                    # Refresh browser between subjects to avoid staleness
                    logging.info("🔄 Refreshing browser session between subjects...")
                    close_session(browser, context)
                    time.sleep(random.uniform(8, 15))
                    browser, context, page = new_session()
                    courses_in_session = 0
                    
                    break
                else:
                    cooldown("Subject incomplete; retrying subject from scratch.")
                    continue

        logging.info("\n🎉 Done! All subjects processed.")

        # Mark this run as complete so the next run can archive its output.
        try:
            open(os.path.join(BASE_DIR, RUN_COMPLETE_MARKER), "w", encoding="utf-8").close()
        except Exception as e:
            logging.warning(f"⚠️ Failed to write run-complete marker: {e}")

        close_session(browser, context)

if __name__ == "__main__":
    main()