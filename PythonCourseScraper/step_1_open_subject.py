from playwright.sync_api import sync_playwright

URL = "https://w2prod.sis.yorku.ca/Apps/WebObjects/cdm.woa/"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)  # headless=False = open visible browser
    page = browser.new_page()
    print(f"Opening {URL}")
    page.goto(URL, timeout=60000)

    # Wait for the dropdown to appear
    page.wait_for_selector("select", timeout=30000)

    # Try to locate the Subject dropdown by label
    try:
        subject_select = page.get_by_label("Subject")
        subject_select.scroll_into_view_if_needed()
        subject_select.click()
        print("✅ Clicked the Subject dropdown.")
    except Exception as e:
        print("⚠️ Could not find Subject dropdown:", e)

    # Keep browser open a bit so you can see it
    page.wait_for_timeout(5000)
    browser.close()
