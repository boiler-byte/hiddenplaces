"""UI smoke test using real Chromium and in-memory module URLs.

Some isolated environments forbid navigating to localhost, so this loads the exact
HTML, CSS and ES-module source into about:blank rather than visiting a web server.
Live geolocation/Overpass calls are mocked; real API availability is not tested.
"""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json, re

ROOT = Path(__file__).resolve().parents[1]
IMPORT = re.compile(r'(\bfrom\s*[\'\"])(\.[^\'\"]+)([\'\"])')
results = []


def check(condition, desc):
    results.append({'test': desc, 'passed': bool(condition)})
    if not condition:
        raise AssertionError(desc)


def prepare_page(page):
    """Load unmodified individual ES modules as blob URLs, preserving imports."""
    html = (ROOT / 'index.html').read_text(encoding='utf8')
    css = '\n'.join((ROOT / path).read_text(encoding='utf8') for path in
                    ('css/main.css', 'css/components.css', 'css/responsive.css', 'css/waves.css'))
    html = re.sub(r'\s*<link rel="stylesheet"[^>]+>', '', html)
    html = re.sub(r'\s*<script type="module"[^>]+></script>', '', html)
    html = html.replace('</head>', '<style>' + css + '</style></head>')
    page.goto('about:blank')
    page.set_content(html, wait_until='domcontentloaded')
    urls = {}

    def module_url(module):
        module = module.resolve()
        if module in urls:
            return urls[module]
        code = module.read_text(encoding='utf8')

        def replace(m):
            dependency = (module.parent / m.group(2)).resolve()
            return m.group(1) + module_url(dependency) + m.group(3)

        code = IMPORT.sub(replace, code)
        url = page.evaluate('(code) => URL.createObjectURL(new Blob([code], {type: "text/javascript"}))', code)
        urls[module] = url
        return url

    app_url = module_url(ROOT / 'js/app.js')
    page.add_script_tag(type='module', content=f'import "{app_url}";')
    page.wait_for_function('document.querySelectorAll("#placesList .place-item").length > 0')


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    for width in [320, 375, 390, 430, 760, 768, 1440]:
        context = browser.new_context(viewport={'width': width, 'height': 840}, device_scale_factor=1)
        page = context.new_page()
        page.set_default_timeout(7000)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        prepare_page(page)
        check(not errors, f'No JavaScript errors at {width}px: {errors}')
        check(page.locator('#placesList .place-item').count() > 0, f'Demo places render at {width}px')
        check(page.locator('script[type="module"]').count() == 1, f'ES modules run at {width}px')
        if width <= 760:
            rect = page.locator('#viewport').bounding_box()
            check(rect and abs(rect['x']) < 2 and abs(rect['width'] - width) < 2,
                  f'Edge-to-edge mobile viewer at {width}px: {rect}')
            check(page.locator('#placesToggle').is_visible(), f'Orte toggle visible at {width}px')
        else:
            check(not page.locator('#placesToggle').is_visible(), f'Desktop has persistent sidebar at {width}px')
        if width == 375:
            page.screenshot(path='/mnt/data/hidden-places-v5-mobile-preview.png', full_page=True)
            page.locator('#modeMenuBtn').click()
            check(page.locator('#modeMenu').is_visible(), 'Mode dropdown opens')
            check(page.locator('#installBtn').is_visible(), 'Install button inside Mode dropdown')
            page.locator('#wavesTab').click()
            check('waves-mode' in page.locator('#viewport').get_attribute('class'), 'Waves mode enabled')
            check(page.locator('#wavesCanvas').is_visible(), 'Waves canvas visible')
            check(page.locator('#waveBeacons .wave-beacon').count() >= 1, 'Visible demo beacons exist')
            check('DEMO' in page.locator('#wavesLiveBadge').inner_text(), 'Demo source count labeled')
            check('ILLUSTRATIV' in page.locator('.wave-console-foot').inner_text(), 'Projected bearing clearly disclosed')
            page.screenshot(path='/mnt/data/hidden-places-v5-waves-mobile-preview.png', full_page=True)
            page.locator('#waveDemoToggle').click()
            check(page.locator('#waveDemoToggle').get_attribute('aria-pressed') == 'false', 'Demo waves can be disabled')
            check(page.locator('#waveBeacons .wave-beacon').count() <= 1, 'Demo beacons removed')
            page.locator('#waveDemoToggle').click()
            check(page.locator('#waveDemoToggle').get_attribute('aria-pressed') == 'true', 'Demo waves can be restored')
            page.evaluate("""() => {
              Object.defineProperty(window, 'isSecureContext', {value:true, configurable:true});
              Object.defineProperty(navigator, 'bluetooth', {configurable:true,
                value:{requestDevice: async () => ({id:'ble-test-1',name:'Test Beacon'}),getDevices:async()=>[]}});
              window.dispatchEvent(new Event('online'));
            }""")
            page.locator('#waveBluetoothBtn').click()
            page.wait_for_function('document.querySelector("#wavesBleCount").textContent.includes("1 freigegeben")')
            check(page.locator('#waveFocusName').inner_text() != '', 'Selected Bluetooth device reflected in sources')
            page.locator('#wavesListButton').click()
            check(page.locator('#waveFocusName').inner_text() != '', 'Cycle through signal sources works')
            page.locator('#modeMenuBtn').click()
            check(page.locator('#wavesTab').get_attribute('aria-pressed') == 'true', 'Mode menu shows waves active')
            page.screenshot(path='/mnt/data/hidden-places-v5-modus-preview.png', full_page=True)
            page.locator('#radarTab').click()
            check('radar-mode' in page.locator('#viewport').get_attribute('class'), 'Radar mode switches')
            page.locator('#modeMenuBtn').click()
            page.locator('#lensTab').click()
            check('radar-mode' not in page.locator('#viewport').get_attribute('class'), 'Lens mode switches')
            page.locator('#modeMenuBtn').click()
            page.locator('#headingSlider').fill('157')
            check(page.locator('#headingValue').inner_text() == '157°', 'Manual heading slider works')
            page.locator('#positionMenuBtn').click()
            check(page.locator('#positionMenu').is_visible(), 'Position dropdown opens')
            check(not page.locator('#modeMenu').is_visible(), 'Only one dropdown opens at once')
            page.screenshot(path='/mnt/data/hidden-places-v5-position-preview.png', full_page=True)
            page.locator('#positionMenuBtn').click()
            page.locator('#placesToggle').click()
            check('open' in page.locator('#placesSidebar').get_attribute('class'), 'Offcanvas opens')
            page.screenshot(path='/mnt/data/hidden-places-v5-offcanvas-preview.png', full_page=True)
            page.locator('#filters [data-filter="history"]').click()
            check(page.locator('#filters [data-filter="history"]').get_attribute('aria-pressed') == 'true', 'History filter')
            check(page.locator('#placesList .place-item').count() > 0, 'History places shown')
            page.locator('#filters [data-filter="all"]').click()
            page.locator('#placesList .bookmark').first.click()
            check('saved' in page.locator('#placesList .bookmark').first.get_attribute('class'), 'Bookmark saved')
            page.locator('#filters [data-filter="saved"]').click()
            check(page.locator('#placesList .place-item').count() >= 1, 'Saved filter')
            page.locator('#sidebarClose').click()
            check(page.locator('#placesSidebar').get_attribute('aria-hidden') == 'true', 'Offcanvas closes')
            page.locator('#placesToggle').click()
            page.locator('#filters [data-filter="all"]').click()
            page.locator('#placesList [data-open]').first.click()
            check(page.locator('#detailCard').is_visible(), 'Place detail opens')
            page.locator('#detailClose').click()
            check(not page.locator('#detailCard').is_visible(), 'Place detail closes')
            page.locator('#positionMenuBtn').click()
            page.locator('#coordinateBtn').click()
            check(page.locator('#coordinateDialog').is_visible(), 'Coordinate dialog opens')
            page.locator('#cancelCoordinate').click()
            check(not page.locator('#coordinateDialog').is_visible(), 'Coordinate dialog cancel')

            # Mock OpenStreetMap without network; still exercises actual parsing and store updates.
            page.evaluate('''() => { window.fetch = async (url, options) => ({
              ok: true, json: async () => ({elements: [{type:'node',id:9001,lat:52.53,lon:13.415,
                tags:{name:'Testturm',man_made:'tower',description:'Testbeschreibung'}}]})
            }); }''')
            page.locator('#positionMenuBtn').click()
            page.locator('#coordinateBtn').click()
            page.locator('#latitudeInput').fill('52.52001')
            page.locator('#longitudeInput').fill('13.40501')
            page.locator('#coordinateForm button[type="submit"]').click()
            page.wait_for_function('document.querySelector("#placesList .place-title")?.textContent === "Testturm"')
            check(page.locator('#locationName').inner_text() == 'Eigene Koordinaten', 'Live coordinates selected')
            check(page.locator('#placesList .place-title').all_text_contents() == ['Testturm'], 'Live OSM data parsed and rendered')
            page.locator('#placesToggle').click()
            page.locator('#demoBtn').click()
            check(page.locator('#placesList .place-item').count() > 1, 'Berlin demo restoration')
            page.locator('#sidebarClose').click()
            # Emulate a device sensor, then return to manual control.
            page.evaluate('''() => {
              window.DeviceOrientationEvent = function() {};
              window.DeviceOrientationEvent.requestPermission = async () => 'granted';
              Object.defineProperty(window, 'isSecureContext', {value: true, configurable: true});
            }''')
            page.locator('#sensorBtn').click()
            page.wait_for_function('document.querySelector("#sensorLabel").textContent.includes("startet")', timeout=6000)
            page.evaluate('''() => {
              window.dispatchEvent(Object.assign(new Event('deviceorientation'), {alpha: 60, absolute: false}));
              window.dispatchEvent(Object.assign(new Event('deviceorientation'), {alpha: 45, absolute: false}));
            }''')
            page.wait_for_function('document.querySelector("#sensorBtn").getAttribute("aria-pressed") === "true"',timeout=6000)
            check(page.locator('#headingSource').inner_text() == 'RELATIVE AUSRICHTUNG', 'Relative sensors labeled correctly')
            page.locator('#sensorBtn').click()
            check(page.locator('#sensorBtn').get_attribute('aria-pressed') == 'false', 'Sensor can be switched off')
            # Test camera start/cleanup with an in-memory MediaStream.
            page.evaluate('''() => {
              Object.defineProperty(navigator, 'mediaDevices', {configurable: true,
                value: {getUserMedia: async () => new MediaStream()}});
              HTMLMediaElement.prototype.play = async function() {};
            }''')
            page.locator('#cameraBtn').click()
            page.wait_for_function('document.querySelector("#cameraBtn").getAttribute("aria-pressed") === "true"',timeout=6000)
            check('camera-active' in page.locator('#viewport').get_attribute('class'), 'Camera background enables')
            page.locator('#cameraBtn').click()
            page.wait_for_function('document.querySelector("#cameraBtn").getAttribute("aria-pressed") === "false"',timeout=6000)
            check('camera-active' not in page.locator('#viewport').get_attribute('class'), 'Camera stream stops cleanly')
        if width == 1440:
            page.screenshot(path='/mnt/data/hidden-places-v5-desktop-preview.png', full_page=True)
            page.locator('#modeMenuBtn').click()
            page.locator('#wavesTab').click()
            page.screenshot(path='/mnt/data/hidden-places-v5-waves-desktop-preview.png', full_page=True)
            check(page.locator('#wavesCanvas').is_visible(), 'Waves render on desktop')
        context.close()
    browser.close()

# Validate the app shell's exact asset list (without relying on restricted local HTTP navigation).
sw = (ROOT / 'sw.js').read_text(encoding='utf8')
check("hidden-places-shell-v5" in sw, 'Service worker uses distinct v5 cache')
assets = re.search(r'const ASSETS = \[([\s\S]*?)\];', sw).group(1)
paths = re.findall(r"'([^']+)'", assets)
for path in paths:
    check(path == './' or (ROOT / path).exists(), f'Precached PWA asset exists: {path}')
check(len(paths) >= 25, 'Offline shell includes all module files')
print(json.dumps(results, ensure_ascii=False, indent=2))
print('Total', len(results), 'passed', sum(item['passed'] for item in results))
