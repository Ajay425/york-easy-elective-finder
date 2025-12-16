from playwright.sync_api import sync_playwright
from playwright_stealth import stealth_sync
import os
import re
import time
import random
import datetime
import logging
from typing import List, Tuple, Set, Optional

# ----------------------------------------------------------
# ⚙️ USER SETTINGS
# ----------------------------------------------------------
FAST_MODE = False  # Set this to True for faster scraping (switch here)
MAX_SUBJECTS = None
CAMPUS_NAME = "Keele"
SAVE_DIR = "york_courses"
PROGRESS_FILE = "progress.txt"
LOG_FILE = "scraper.log"
ERROR_THRESHOLD = 5  # Max errors before cooldown
COOLDOWN_SECONDS = 600  # 10 minutes
# ----------------------------------------------------------
# Logging setup
logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
# ----------------------------------------------------------
# Dynamic timing based on FAST_MODE
if FAST_MODE:
    HUMAN_DELAY_MIN = 3  # .1 and 0.4 bottom , #1 and 3 work well seems like
    HUMAN_DELAY_MAX = 6
else:
    HUMAN_DELAY_MIN = 15.0  # 15 and 25 work
    HUMAN_DELAY_MAX = 25.0

def human_pause(min_sec: Optional[float] = None, max_sec: Optional[float] = None) -> None:
    """Realistic random delay between actions, with jitter."""
    time.sleep(random.uniform(min_sec or HUMAN_DELAY_MIN, max_sec or HUMAN_DELAY_MAX))
    time.sleep(random.uniform(0.1, 0.5))  # Add jitter

def sanitize_filename(name: str) -> str:
    """Clean unsafe characters for filenames."""
    return re.sub(r'[\\/*?:"<>|]', "_", name.strip())[:120]

# ----------------------------------------------------------
# 🕐 DAILY MAINTENANCE CHECK (with 5-minute leeway)
# ----------------------------------------------------------
def check_maintenance_window() -> None:
    """Pause scraper between 11:55 p.m. and 1:45 a.m."""
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
# 🧠 SESSION DETECTION + RECOVERY HELPERS
# ----------------------------------------------------------
def session_expired(page) -> bool:
    """Detect York's 'session ended' error page."""
    try:
        html = page.content().lower()
        if any(msg in html for msg in [
            "your session has been ended",
            "you have exceeded the maximum time limit",
            "You have exceeded the maximum time limit. Your session has been ended.",
            "Your session has been ended.",
            "access denied",
            "please log in",
            "unauthorized",
        ]):
            logging.warning("⚠️ York session timeout or access denied detected.")
            return True
    except Exception:
        pass
    return False

def reload_york_main(page, start_url: str, subject_value: Optional[str] = None, campus_name: Optional[str] = None) -> None:
    """Safely reload the main York course search page and optionally re-select subject/campus."""
    logging.info("🔄 Re-loading main York course site...")
    retries = 3
    for attempt in range(1, retries + 1):
        try:
            page.goto(start_url, wait_until="domcontentloaded", timeout=60000)
            page.locator("img[alt='Search By Subject']").click()
            page.wait_for_load_state("networkidle", timeout=60000)
            break
        except Exception as e:
            logging.warning(f"⚠️ Reload attempt {attempt} failed: {e}")
            if attempt < retries:
                wait_time = 10 * attempt
                logging.info(f"   ⏳ Waiting {wait_time}s before retry...")
                time.sleep(wait_time)
            else:
                logging.error("❌ All reload attempts failed. Continuing with next subject.")
                return
    if subject_value and campus_name:
        try:
            page.select_option("#subjectSelect", value=subject_value)
            page.evaluate(f"""
                const campus = document.getElementById('campusSelect');
                for (const o of campus.options) o.selected = false;
                for (const o of campus.options)
                    if (o.text.includes('{campus_name}')) o.selected = true;
            """)
            page.locator("input[type=submit][value='Search Courses']").click()
            page.wait_for_load_state("networkidle", timeout=60000)
        except Exception as e:
            logging.error(f"⚠️ Failed to re-select subject/campus after reload: {e}")

# ----------------------------------------------------------
# 🚀 MAIN SCRAPER
# ----------------------------------------------------------
def scrape_course_page(page, link: str, filepath: str, max_retries: int = 3) -> bool:
    """Scrape a single course page with retries. Returns True if successful."""
    for attempt in range(max_retries):
        try:
            # Go to the course page
            page.goto(link, wait_until="domcontentloaded", timeout=60000)

            # Wait for a specific element to be visible, ensuring the page has finished loading
            page.wait_for_selector("body", timeout=60000)  # Wait for body to be visible

            # Check if the body is empty (a clear indicator of a failed load)
            body_content = page.locator("body").inner_html()
            if not body_content.strip():  # Check if the body is empty
                logging.warning(f"      ⚠️ The body content for {filepath} is empty. Retrying...")
                return False

            # Check if the page content seems valid
            html = page.content()
            if "<html></html>" in html or len(html.strip()) < 500:  # If the page is empty or too small, treat as failed
                logging.warning(f"      ⚠️ The page content for {filepath} seems empty. Retrying...")
                return False

            # Save the page HTML to file
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(html)
            logging.info(f"      💾 Saved {os.path.basename(filepath)}")
            return True

        except Exception as e:
            logging.warning(f"      ❌ Attempt {attempt + 1} failed: {e}")
            if attempt == max_retries - 1:
                logging.error(f"      ❌ Max retries reached for {filepath}")
                return False
            human_pause(5.0, 10.0)  # Delay before retry
    return False

def get_user_agents() -> List[str]:
    """Return a list of user agents for rotation."""
    return [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15",
    ]

def main() -> None:
    with sync_playwright() as p:
        logging.info(f"🚀 Launching Playwright browser (FAST_MODE={FAST_MODE})")
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
                "--disable-features=UseSkiaRenderer",
                "--ignore-gpu-blacklist",
            ],
        )
        user_agent = random.choice(get_user_agents())
        context = browser.new_context(
            user_agent=user_agent,
            viewport={"width": 1366, "height": 768},
            locale="en-US,en;q=0.9",
            geolocation={"latitude": 43.7767, "longitude": -79.5011},
            permissions=["geolocation"],
        )
        stealth_sync(context)  # Enable stealth mode
        page = context.new_page()
        page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        base_url = "https://w2prod.sis.yorku.ca"
        start_url = f"{base_url}/Apps/WebObjects/cdm.woa/"
        
        check_maintenance_window()
        logging.info("🌐 Opening York course site...")
        page.goto(start_url, timeout=30000)
        page.locator("img[alt='Search By Subject']").click()
        page.wait_for_load_state("networkidle", timeout=60000)
        
        options = page.locator("#subjectSelect option").all()
        subjects = [
            (opt.inner_text().strip(), opt.get_attribute("value"))
            for opt in options
            if opt.get_attribute("value")
        ]
        if MAX_SUBJECTS:
            subjects = subjects[:MAX_SUBJECTS]
        logging.info(f"📚 Found {len(subjects)} subjects to scrape")
        os.makedirs(SAVE_DIR, exist_ok=True)
        
        completed_subjects: Set[str] = set()
        if os.path.exists(PROGRESS_FILE):
            with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
                completed_subjects = {line.strip() for line in f if line.strip()}
        logging.info(f"🔁 Resuming — {len(completed_subjects)} subjects already completed")
        
        error_count = 0
        for idx, (subject_name, subject_value) in enumerate(subjects, start=1):
            check_maintenance_window()
            if subject_name in completed_subjects:
                logging.info(f"⏭️ Skipping {subject_name} — already completed.")
                continue
            logging.info(f"\n🎓 [{idx}/{len(subjects)}] Scraping subject: {subject_name}")
            if error_count >= ERROR_THRESHOLD:
                logging.warning("⚠️ Too many errors — cooling down for 10 minutes...")
                time.sleep(COOLDOWN_SECONDS)
                error_count = 0

            logging.info(f"   🧭 Selecting subject {subject_name} ...")
            try:
                page.wait_for_selector("#subjectSelect", timeout=30000)
            except:
                logging.warning("⚠️ subjectSelect not found — reloading main York site.")
                reload_york_main(page, start_url)
                error_count += 1
                continue
            try:
                page.select_option("#subjectSelect", value=subject_value)
            except Exception as e:
                logging.warning(f"⚠️ Retry select_option failed: {e}")
                reload_york_main(page, start_url)
                error_count += 1
                continue

            page.evaluate(f"""
                const campus = document.getElementById('campusSelect');
                for (const o of campus.options) o.selected = false;
                for (const o of campus.options)
                    if (o.text.includes('{CAMPUS_NAME}')) o.selected = true;
            """)
            human_pause()
            page.locator("input[type=submit][value='Search Courses']").click()
            page.wait_for_load_state("networkidle")
            
            # --- Session expired handling ---
            if session_expired(page):
                logging.warning("⚠️ Session expired detected. Reloading the main page and retrying the subject.")
                reload_york_main(page, start_url, subject_value, CAMPUS_NAME)
                error_count += 1
                # Skip to the next subject will now not occur. We are retrying the same subject.
                continue  # Retry this subject after reloading

            # Gather course links
            try:
                page.wait_for_selector("table:has-text('Course')", timeout=15000)
            except:
                logging.warning(f"⚠️ No course table found for {subject_name}")
                reload_york_main(page, start_url)
                error_count += 1
                continue

            rows = page.locator("table >> tr").all()[2:]
            subj_dir = os.path.join(SAVE_DIR, sanitize_filename(subject_name))
            os.makedirs(subj_dir, exist_ok=True)
            course_links: List[Tuple[str, str, str]] = []
            for row in rows:
                tds = row.locator("td")
                if tds.count() < 3:
                    continue
                code = tds.nth(0).inner_text().strip()
                title = tds.nth(1).inner_text().strip()
                hrefs = tds.nth(2).locator("a").evaluate_all("els => els.map(e => e.getAttribute('href'))")
                href = next((h for h in hrefs if h and h.startswith("/Apps/WebObjects/cdm.woa/")), None)
                if href:
                    course_links.append((code, title, base_url + href))
            logging.info(f"   → Found {len(course_links)} courses")

            # Step 4: Visit each course and save HTML
            for i, (code, title, link) in enumerate(course_links, start=1):
                check_maintenance_window()
                filename = sanitize_filename(f"{code}_{title}.html")
                filepath = os.path.join(subj_dir, filename)
                logging.info(f"   ↳ [{i}/{len(course_links)}] {code} – {title}")
                
                # Scrape the course page
                if not scrape_course_page(page, link, filepath):
                    error_count += 1
                    continue

                human_pause(1.0, 2.0)  # Pause to ensure page is stable
                
                try:
                    page.go_back(wait_until="networkidle", timeout=60000)
                    human_pause(1.0, 2.0)
                    if session_expired(page):
                        logging.warning("⚠️ Session expired after going back — reloading main site.")
                        reload_york_main(page, start_url, subject_value, CAMPUS_NAME)
                        error_count += 1
                except Exception as e:
                    logging.warning(f"⚠️ go_back failed ({e}), reloading main site.")
                    reload_york_main(page, start_url, subject_value, CAMPUS_NAME)
                    error_count += 1
                human_pause()

            # --- Return to main search page only after scraping the course ---
            try:
                logging.info("   ↩️ Returning to main search page...")
                page.goto(start_url, wait_until="domcontentloaded", timeout=60000)
                human_pause(0.5, 1.0)
                try:
                    page.locator("img[alt='Search By Subject']").click()
                    page.wait_for_load_state("networkidle", timeout=60000)
                except Exception:
                    human_pause(1.0, 2.0)
            except Exception as e:
                logging.warning(f"⚠️ Failed to return to main: {e}")
                error_count += 1

            # Update progress only after the subject is fully processed
            with open(PROGRESS_FILE, "a", encoding="utf-8") as f:
                f.write(subject_name + "\n")
            logging.info(f"✅ Finished {subject_name} (saved to {PROGRESS_FILE})")
            human_pause()
        
        logging.info("\n🎉 Done! All subjects processed.")
        input("Press ENTER to close...")
        browser.close()

if __name__ == "__main__":
    main()
