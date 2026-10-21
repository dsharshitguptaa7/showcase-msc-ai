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

const PORT = 8099;
const viewports = [320, 360, 375, 390, 430, 768, 1024, 1280, 1440, 1920];
const pages = ['/index.html', '/project.html?id=T01'];

server.listen(PORT, async () => {
  console.log(`Diagnostic server listening on http://localhost:${PORT}`);
  const tempProfile = path.join(__dirname, 'temp_resp_chrome');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9224',
    `--user-data-dir=${tempProfile}`,
    '--no-first-run',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const listRes = await fetch('http://127.0.0.1:9224/json/list');
    const targets = await listRes.json();
    const target = targets[0];
    if (!target) {
      console.error('No target found');
      cleanup(chrome, server);
      return;
    }

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve) => ws.addEventListener('open', resolve));

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

    await sendCommand('Page.enable');
    await sendCommand('DOM.enable');

    console.log('\n--- TESTING VIEWPORT OVERFLOWS ---');
    for (const page of pages) {
      console.log(`\nTesting Page: ${page}`);
      for (const width of viewports) {
        await sendCommand('Emulation.setDeviceMetricsOverride', {
          width,
          height: 800,
          deviceScaleFactor: 1,
          mobile: width < 1024
        });
        await sendCommand('Page.navigate', { url: `http://localhost:${PORT}${page}` });
        await new Promise(r => setTimeout(r, 1200));

        const evalRes = await sendCommand('Runtime.evaluate', {
          expression: `(() => {
            const docWidth = document.documentElement.offsetWidth;
            const scrollWidth = document.documentElement.scrollWidth;
            const bodyScrollWidth = document.body.scrollWidth;
            const innerWidth = window.innerWidth;
            const overflow = Math.max(scrollWidth, bodyScrollWidth) > innerWidth;

            // Find elements wider than window
            let overflowingElements = [];
            document.querySelectorAll('*').forEach(el => {
              const rect = el.getBoundingClientRect();
              if (rect.right > innerWidth + 1) {
                overflowingElements.push({
                  tag: el.tagName,
                  className: (el.className && typeof el.className === 'string') ? el.className.trim() : '',
                  id: el.id,
                  right: Math.round(rect.right),
                  width: Math.round(rect.width)
                });
              }
            });

            // Check header metrics
            const header = document.querySelector('.site-header');
            const headerHeight = header ? header.offsetHeight : 0;
            const brandName = document.querySelector('.brand-name');
            const brandSub = document.querySelector('.brand-sub');
            const livePill = document.querySelector('.live-pill');

            return {
              innerWidth,
              scrollWidth,
              bodyScrollWidth,
              overflow,
              overflowCount: overflowingElements.length,
              sampleOverflows: overflowingElements.slice(0, 5),
              headerHeight
            };
          })()`,
          returnByValue: true
        });

        const res = evalRes.result.value;
        const status = res.overflow ? '⚠️ OVERFLOW' : '✅ OK';
        console.log(`[${width}px] ${status} - scrollWidth: ${res.scrollWidth}, headerHeight: ${res.headerHeight}px`);
        if (res.overflow) {
          console.log(`   Overflowing elements:`, JSON.stringify(res.sampleOverflows));
        }
      }
    }

    cleanup(chrome, server);
  } catch (err) {
    console.error('Error running test:', err);
    cleanup(chrome, server);
  }
});

function cleanup(chrome, server) {
  try { chrome.kill(); } catch (e) {}
  try { server.close(); } catch (e) {}
  setTimeout(() => process.exit(0), 500);
}
