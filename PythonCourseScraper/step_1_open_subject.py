from playwright.sync_api import sync_playwright
import os, re, time, random

# ----------------------------------------------------------
# ⚙️ USER SETTINGS
# ----------------------------------------------------------

# 🏃‍♂️ FAST_MODE = True  →  Much faster scraping (≈4–6 s/page)
# 🐢 FAST_MODE = False →  Slower but safer (≈15–20 s/page, less Cloudflare risk)
FAST_MODE = False

# 🧠 Only scrape the first N subjects (for testing)
# Set to None for all subjects.
MAX_SUBJECTS = None

# Campus to select for every search
CAMPUS_NAME = "Keele"

# Output directory
SAVE_DIR = "york_courses"

# Progress tracking file
PROGRESS_FILE = "progress.txt"

# ----------------------------------------------------------
# Dynamic timing based on FAST_MODE
if FAST_MODE:
    HUMAN_DELAY_MIN = 0.1
    HUMAN_DELAY_MAX = 0.4
else:
    HUMAN_DELAY_MIN = 15.0
    HUMAN_DELAY_MAX = 25.0


def human_pause(min_sec=None, max_sec=None):
    """Realistic random delay between actions"""
    time.sleep(random.uniform(min_sec or HUMAN_DELAY_MIN, max_sec or HUMAN_DELAY_MAX))


def sanitize_filename(name: str) -> str:
    """Clean unsafe characters for filenames"""
    return re.sub(r'[\\/*?:"<>|]', "_", name.strip())[:120]


# ----------------------------------------------------------
# 🧠 SESSION DETECTION + RECOVERY HELPERS
# ----------------------------------------------------------
def session_expired(page):
    """Detect York's 'session ended' error page by looking for known phrases."""
    try:
        html = page.content().lower()
        if "your session has been ended" in html or "you have exceeded the maximum time limit" in html:
            print("⚠️ York session timeout detected.")
            return True
    except Exception:
        pass
    return False

def reload_york_main(page, start_url, subject_value=None, campus_name=None):
    """Safely reloads the main York course search page and optionally re-selects subject/campus."""
    print("🔄 Re-loading main York course site...")
    retries = 3
    for attempt in range(1, retries + 1):
        try:
            page.goto(start_url, wait_until="domcontentloaded", timeout=60000)
            page.locator("img[alt='Search By Subject']").click()
            page.wait_for_load_state("networkidle", timeout=60000)
            break  # success
        except Exception as e:
            print(f"⚠️ Reload attempt {attempt} failed: {e}")
            if attempt < retries:
                wait_time = 10 * attempt
                print(f"   ⏳ Waiting {wait_time}s before retry...")
                time.sleep(wait_time)
            else:
                print("❌ All reload attempts failed. Continuing with next subject.")
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
            print(f"⚠️ Failed to re-select subject/campus after reload: {e}")


# ----------------------------------------------------------
# 🚀 MAIN SCRAPER
# ----------------------------------------------------------
with sync_playwright() as p:
    print(f"🚀 Launching Playwright browser (FAST_MODE={FAST_MODE})")

    browser = p.chromium.launch(
        headless=False,
        args=[
            "--disable-blink-features=AutomationControlled",
            "--disable-infobars",
            "--no-sandbox",
            "--disable-dev-shm-usage",
        ]
    )

    context = browser.new_context(
        user_agent=(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        viewport={"width": 1366, "height": 768},
    )
    page = context.new_page()
    page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

    base_url = "https://w2prod.sis.yorku.ca"
    start_url = f"{base_url}/Apps/WebObjects/cdm.woa/"

    # ----------------------------------------------------------
    # Step 1 – Open main site and reach “Search by Subject”
    # ----------------------------------------------------------
    print("🌐 Opening York course site...")
    page.goto(start_url, timeout=60000)
    human_pause()
    page.locator("img[alt='Search By Subject']").click()
    human_pause(0.5, 1.5)
    page.wait_for_load_state("networkidle")

    # ----------------------------------------------------------
    # Step 2 – Collect all subject options
    # ----------------------------------------------------------
    options = page.locator("#subjectSelect option").all()
    subjects = [
        (opt.inner_text().strip(), opt.get_attribute("value"))
        for opt in options
        if opt.get_attribute("value")
    ]
    if MAX_SUBJECTS:
        subjects = subjects[:MAX_SUBJECTS]

    print(f"📚 Found {len(subjects)} subjects to scrape")

    os.makedirs(SAVE_DIR, exist_ok=True)

    # ----------------------------------------------------------
    # 🧠 Auto-detect completed subjects from existing folders
    # ----------------------------------------------------------
    existing_folders = {
        name for name in os.listdir(SAVE_DIR)
        if os.path.isdir(os.path.join(SAVE_DIR, name))
    }

    progress_set = set()
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
            progress_set = {line.strip() for line in f if line.strip()}

    newly_completed = existing_folders - progress_set
    if newly_completed:
        with open(PROGRESS_FILE, "a", encoding="utf-8") as f:
            for folder_name in newly_completed:
                f.write(folder_name + "\n")
        print(f"🧾 Added {len(newly_completed)} pre-existing folders to {PROGRESS_FILE}")
    else:
        print("✅ No new pre-existing folders found to add.")

    # Reload final progress set
    with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
        completed_subjects = {line.strip() for line in f if line.strip()}
    print(f"🔁 Resuming — {len(completed_subjects)} subjects already completed")

    # ----------------------------------------------------------
    # Step 3 – Loop through each subject
    # ----------------------------------------------------------
    for idx, (subject_name, subject_value) in enumerate(subjects, start=1):
        if subject_name in completed_subjects:
            print(f"⏭️ Skipping {subject_name} — already completed.")
            continue

        print(f"\n🎓 [{idx}/{len(subjects)}] Scraping subject: {subject_name}")

        # --- Select subject + campus ---
        print(f"   🧭 Selecting subject {subject_name} ...")
        try:
            page.wait_for_selector("#subjectSelect", timeout=60000)
        except:
            print("⚠️ subjectSelect not found — reloading main York site.")
            reload_york_main(page, start_url)
            try:
                page.wait_for_selector("#subjectSelect", timeout=60000)
            except:
                print("❌ Could not reload subject selection page.")
                continue

        try:
            page.select_option("#subjectSelect", value=subject_value)
        except Exception as e:
            print(f"⚠️ Retry select_option failed: {e}")
            reload_york_main(page, start_url)
            try:
                page.wait_for_selector("#subjectSelect", timeout=60000)
                page.select_option("#subjectSelect", value=subject_value)
            except Exception as e2:
                print(f"❌ Could not recover for {subject_name}: {e2}")
                continue

        # --- Select campus ---
        page.evaluate(f"""
            const campus = document.getElementById('campusSelect');
            for (const o of campus.options) o.selected = false;
            for (const o of campus.options)
                if (o.text.includes('{CAMPUS_NAME}')) o.selected = true;
        """)

        human_pause()
        page.locator("input[type=submit][value='Search Courses']").click()
        page.wait_for_load_state("networkidle")

        if session_expired(page):
            reload_york_main(page, start_url, subject_value, CAMPUS_NAME)

        # Gather course links
        try:
            page.wait_for_selector("table:has-text('Course')", timeout=15000)
        except:
            print(f"⚠️ No course table found for {subject_name}")
            reload_york_main(page, start_url)
            continue

        rows = page.locator("table >> tr").all()[2:]
        subj_dir = os.path.join(SAVE_DIR, sanitize_filename(subject_name))
        os.makedirs(subj_dir, exist_ok=True)

        course_links = []
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

        print(f"   → Found {len(course_links)} courses")

        # ----------------------------------------------------------
        # Step 4 – Visit each course, save HTML, return to list
        # ----------------------------------------------------------
        for i, (code, title, link) in enumerate(course_links, start=1):
            filename = sanitize_filename(f"{code}_{title}.html")
            filepath = os.path.join(subj_dir, filename)
            print(f"   ↳ [{i}/{len(course_links)}] {code} – {title}")

            try:
                page.goto(link, wait_until="networkidle", timeout=60000)
                if session_expired(page):
                    reload_york_main(page, start_url, subject_value, CAMPUS_NAME)
                    continue

                html = page.content()
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(html)
                print(f"      💾 Saved {filename}")
            except Exception as e:
                print(f"      ❌ Failed: {e}")

            # Return to subject list page
            # Return to subject list page safely
            try:
                page.go_back(wait_until="networkidle", timeout=60000)
                human_pause(1.0, 2.0)
                if session_expired(page):
                    print("⚠️ Session expired after going back — reloading main site.")
                    reload_york_main(page, start_url, subject_value, CAMPUS_NAME)
            except Exception as e:
                print(f"⚠️ go_back failed ({e}), reloading main site.")
                reload_york_main(page, start_url, subject_value, CAMPUS_NAME)


            human_pause()

        # Mark subject complete
        with open(PROGRESS_FILE, "a", encoding="utf-8") as f:
            f.write(subject_name + "\n")
        print(f"✅ Finished {subject_name} (saved to {PROGRESS_FILE})")

        human_pause()

    print("\n🎉 Done! All subjects processed.")
    input("Press ENTER to close...")
    browser.close()
