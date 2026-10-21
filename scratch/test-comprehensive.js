const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png'
};

const server = http.createServer((req, res) => {
  let reqUrl = req.url.split('?')[0];
  if (reqUrl === '/') reqUrl = '/index.html';
  const filePath = path.join(__dirname, '..', reqUrl);
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end();
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
  fs.createReadStream(filePath).pipe(res);
});

const PORT = 8095;
const viewports = [320, 360, 375, 390, 430, 768, 1024, 1280, 1440, 1920];
const pages = [
  { name: 'Showcase Index', url: '/index.html' },
  { name: 'Project Detail (T001)', url: '/project.html?id=T001' }
];

server.listen(PORT, async () => {
  console.log(`Responsive Test Server running at http://localhost:${PORT}`);
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const tempProfile = path.join(__dirname, 'temp_comprehensive_profile');

  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9228',
    `--user-data-dir=${tempProfile}`,
    '--no-first-run',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 2500));

  try {
    const listRes = await fetch('http://127.0.0.1:9228/json/list');
    const targets = await listRes.json();
    const target = targets[0];
    if (!target) {
      console.error('No target page found');
      cleanup(chrome, server);
      return;
    }

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise(res => ws.addEventListener('open', res));

    let msgId = 1;
    function sendCommand(method, params = {}) {
      return new Promise((resolve) => {
        const id = msgId++;
        const handler = (event) => {
          const msg = JSON.parse(event.data.toString());
          if (msg.id === id) {
            ws.removeEventListener('message', handler);
            resolve(msg.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    function waitForEvent(eventName, timeoutMs = 8000) {
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          ws.removeEventListener('message', handler);
          resolve(null);
        }, timeoutMs);

        const handler = (event) => {
          const msg = JSON.parse(event.data.toString());
          if (msg.method === eventName) {
            clearTimeout(timer);
            ws.removeEventListener('message', handler);
            resolve(msg.params);
          }
        };
        ws.addEventListener('message', handler);
      });
    }

    await sendCommand('Page.enable');
    await sendCommand('DOM.enable');

    let totalTests = 0;
    let failedTests = 0;

    for (const pageInfo of pages) {
      console.log(`\n======================================================`);
      console.log(`TESTING PAGE: ${pageInfo.name} (${pageInfo.url})`);
      console.log(`======================================================`);

      for (const width of viewports) {
        totalTests++;

        // Emulate viewport
        await sendCommand('Emulation.setDeviceMetricsOverride', {
          width,
          height: 900,
          deviceScaleFactor: 1,
          mobile: width < 1024,
          screenWidth: width,
          screenHeight: 900
        });

        const loadPromise = waitForEvent('Page.loadEventFired');
        await sendCommand('Page.navigate', { url: `http://localhost:${PORT}${pageInfo.url}` });
        await loadPromise;
        // Wait for projects.json fetch & render
        await new Promise(r => setTimeout(r, 1000));

        const res = await sendCommand('Runtime.evaluate', {
          expression: `(() => {
            const winW = window.innerWidth;
            const docScrollW = document.documentElement.scrollWidth;
            const bodyScrollW = document.body.scrollWidth;

            // Check for horizontal overflow
            const overflows = [];
            document.querySelectorAll('*').forEach(el => {
              if (el.classList.contains('nav-drawer') && !el.classList.contains('is-open')) return;
              if (el.closest('.nav-drawer') && !document.querySelector('.nav-drawer.is-open')) return;
              if (el.classList.contains('nav-backdrop') && !el.classList.contains('is-open')) return;

              // Elements inside a designated horizontal scroll container are allowed to scroll
              if (el.closest('.dataset-chips-container') && el !== document.querySelector('.dataset-chips-container')) return;
              if (el.closest('.detail-table-card') && el !== document.querySelector('.detail-table-card')) return;

              const r = el.getBoundingClientRect();
              if (r.right > winW + 1) {
                overflows.push({
                  tag: el.tagName,
                  className: (el.className && typeof el.className === 'string') ? el.className.trim() : '',
                  id: el.id,
                  right: Math.round(r.right),
                  width: Math.round(r.width)
                });
              }
            });

            const header = document.querySelector('.site-header');
            const headerHeight = header ? header.offsetHeight : null;
            const brandLink = document.querySelector('.brand-link');
            const brandLinkW = brandLink ? Math.round(brandLink.getBoundingClientRect().width) : null;
            const brandShort = document.querySelector('.brand-name-short');
            const brandNameShortVisible = !!(brandShort && window.getComputedStyle(brandShort).display !== 'none');
            const livePill = document.querySelector('.live-pill');
            const livePillW = livePill ? Math.round(livePill.getBoundingClientRect().width) : null;
            const livePillH = livePill ? Math.round(livePill.getBoundingClientRect().height) : null;
            const menuToggle = document.querySelector('.menu-toggle');
            const menuToggleH = menuToggle ? Math.round(menuToggle.getBoundingClientRect().height) : null;
            const menuToggleW = menuToggle ? Math.round(menuToggle.getBoundingClientRect().width) : null;
            const cards = document.querySelectorAll('.project-card');
            const grid = document.querySelector('.projects-grid');
            let gridCols = null;
            if (grid) {
              gridCols = window.getComputedStyle(grid).gridTemplateColumns.split(' ').length;
            }

            // Test drawer interaction
            let drawerTested = false;
            const drawer = document.querySelector('#navDrawer');
            if (menuToggle && drawer) {
              menuToggle.click();
              const drawerIsOpen = drawer.classList.contains('is-open');
              const drawerExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
              document.querySelector('#drawerClose')?.click();
              const drawerClosed = !drawer.classList.contains('is-open');
              drawerTested = drawerIsOpen && drawerExpanded && drawerClosed;
            }

            return {
              winW,
              docScrollW,
              bodyScrollW,
              hasPageOverflow: docScrollW > winW || bodyScrollW > winW,
              overflowCount: overflows.length,
              overflows: overflows.slice(0, 3),
              headerHeight,
              brandLinkW,
              brandNameShortVisible,
              livePillW,
              livePillH,
              menuToggleW,
              menuToggleH,
              cardCount: cards.length,
              gridCols,
              drawerTested
            };
          })()`,
          returnByValue: true
        });

        const data = res.result?.value;
        if (!data) {
          console.error(`[${width}px] Failed to evaluate`);
          failedTests++;
          continue;
        }

        const isOk = !data.hasPageOverflow && data.overflowCount === 0 && data.drawerTested;
        const icon = isOk ? '✅' : '❌';
        if (!isOk) failedTests++;

        console.log(`${icon} [${width}px] Overflow: ${data.hasPageOverflow ? 'YES (' + data.docScrollW + 'px)' : 'NO'} | Header: ${data.headerHeight}px | ShortBrand: ${data.brandNameShortVisible} | Pill: ${data.livePillW}x${data.livePillH}px | Menu: ${data.menuToggleW}x${data.menuToggleH}px | DrawerOk: ${data.drawerTested} ${data.gridCols ? '| GridCols: ' + data.gridCols : ''}`);
        if (data.overflowCount > 0) {
          console.log(`   🚨 Overflow elements (${data.overflowCount}):`, JSON.stringify(data.overflows));
        }
      }
    }

    console.log(`\n======================================================`);
    console.log(`SUMMARY: ${totalTests - failedTests} passed, ${failedTests} failed out of ${totalTests} tests.`);
    console.log(`======================================================`);

    ws.close();
    cleanup(chrome, server);
  } catch (err) {
    console.error('Test error:', err);
    cleanup(chrome, server);
  }
});

function cleanup(chrome, server) {
  try { chrome.kill(); } catch (e) {}
  try { server.close(); } catch (e) {}
  setTimeout(() => process.exit(0), 500);
}
