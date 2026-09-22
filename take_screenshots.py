from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        
        urls = [
            ("http://localhost:3000", "apps/web/public/screenshots/home.png"),
            ("http://localhost:3000/landing", "apps/web/public/screenshots/landing.png"),
            ("http://localhost:3000/explore", "apps/web/public/screenshots/explore.png"),
            ("http://localhost:3000/about", "apps/web/public/screenshots/about.png"),
            ("http://localhost:3000/profile", "apps/web/public/screenshots/profile.png")
        ]
        
        for url, path in urls:
            try:
                page.goto(url, wait_until="networkidle")
                time.sleep(1)  # Allow rendering to settle
                page.screenshot(path=path, full_page=True)
                print(f"Captured {path}")
            except Exception as e:
                print(f"Failed to capture {url}: {e}")
                
        browser.close()

if __name__ == "__main__":
    run()
