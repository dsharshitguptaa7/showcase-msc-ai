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

const PORT = 8097;
server.listen(PORT, async () => {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const testWidths = [320, 360, 375, 390, 430, 768, 1024, 1280, 1440, 1920];

  for (const width of testWidths) {
    const tempProfile = path.join(__dirname, `temp_profile_${width}`);
    const chrome = spawn(chromePath, [
      '--headless=new',
      '--remote-debugging-port=9226',
      `--user-data-dir=${tempProfile}`,
      `--window-size=${width},900`,
      '--no-first-run',
      `http://localhost:${PORT}/index.html`
    ]);

    await new Promise(r => setTimeout(r, 2200));

    try {
      const listRes = await fetch('http://127.0.0.1:9226/json/list');
      const targets = await listRes.json();
      const target = targets.find(t => t.url.includes(`${PORT}`));
      if (!target) {
        chrome.kill();
        continue;
      }

      const ws = new WebSocket(target.webSocketDebuggerUrl);
      await new Promise(res => ws.addEventListener('open', res));

      const evalMetrics = () => new Promise(resolve => {
        const id = 100;
        ws.addEventListener('message', function handler(e) {
          const msg = JSON.parse(e.data.toString());
          if (msg.id === id) {
            ws.removeEventListener('message', handler);
            resolve(msg.result?.result?.value);
          }
        });
        ws.send(JSON.stringify({
          id,
          method: 'Runtime.evaluate',
          params: {
            expression: `(() => {
              const header = document.querySelector('.site-header');
              const brandLink = document.querySelector('.brand-link');
              const brandName = document.querySelector('.brand-name');
              const brandSub = document.querySelector('.brand-sub');
              const livePill = document.querySelector('.live-pill');
              const menuToggle = document.querySelector('.menu-toggle');
              const hero = document.querySelector('.hero-section');
              const heroTitle = document.querySelector('.hero-title');
              const searchInput = document.querySelector('.search-input');
              const chips = document.querySelector('.dataset-chips-container');
              const cards = document.querySelectorAll('.project-card');

              // Find any elements exceeding window.innerWidth
              const overflows = [];
              document.querySelectorAll('*').forEach(el => {
                const r = el.getBoundingClientRect();
                if (r.right > window.innerWidth + 1.5) {
                  overflows.push({
                    tag: el.tagName,
                    cls: el.className,
                    right: Math.round(r.right),
                    win: window.innerWidth
                  });
                }
              });

              return {
                windowInnerWidth: window.innerWidth,
                bodyScrollWidth: document.body.scrollWidth,
                headerHeight: header ? header.offsetHeight : null,
                brandLinkWidth: brandLink ? Math.round(brandLink.getBoundingClientRect().width) : null,
                headerActionsWidth: livePill ? Math.round(livePill.parentElement.getBoundingClientRect().width) : null,
                heroTitleFontSize: heroTitle ? window.getComputedStyle(heroTitle).fontSize : null,
                cardCount: cards.length,
                firstCardWidth: cards[0] ? Math.round(cards[0].getBoundingClientRect().width) : null,
                overflowCount: overflows.length,
                overflows: overflows.slice(0, 3)
              };
            })()`,
            returnByValue: true
          }
        }));
      });

      const metrics = await evalMetrics();
      console.log(`[Width: ${width}px]`, metrics);

      ws.close();
      chrome.kill();
    } catch (err) {
      console.error(`Error at width ${width}:`, err.message);
      try { chrome.kill(); } catch (e) {}
    }
  }

  server.close();
  process.exit(0);
});
