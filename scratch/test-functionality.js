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

const PORT = 8094;

server.listen(PORT, async () => {
  console.log(`Functional test server running at http://localhost:${PORT}`);
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const tempProfile = path.join(__dirname, 'temp_functional_profile');

  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9229',
    `--user-data-dir=${tempProfile}`,
    '--window-size=375,800',
    '--no-first-run',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const listRes = await fetch('http://127.0.0.1:9229/json/list');
    const targets = await listRes.json();
    const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
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

    function waitForEvent(eventName, timeoutMs = 6000) {
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
    const loadPromise = waitForEvent('Page.loadEventFired');
    await sendCommand('Page.navigate', { url: `http://localhost:${PORT}/index.html` });
    await loadPromise;
    await new Promise(r => setTimeout(r, 1500));

    // 1. Initial State
    await new Promise(r => setTimeout(r, 2000));
    let res = await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        return {
          totalCards: document.querySelectorAll('.project-card').length,
          resultsText: document.querySelector('#resultsCount')?.textContent,
          chipsCount: document.querySelectorAll('.chip-btn').length,
          firstTeam: document.querySelector('.card-team-name')?.textContent
        };
      })()`,
      returnByValue: true
    });
    console.log('1. Initial Load:', res.result?.value);

    // 2. Search Functionality
    res = await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        const input = document.querySelector('#searchInput');
        input.value = 'Group';
        input.dispatchEvent(new Event('input'));
        return {
          cardsFound: document.querySelectorAll('.project-card').length,
          resultsText: document.querySelector('#resultsCount')?.textContent,
          foundTeam: document.querySelector('.card-team-name')?.textContent
        };
      })()`,
      returnByValue: true
    });
    console.log('2. Search Filter (Group):', res.result?.value);

    // 3. Clear Search
    res = await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        document.querySelector('#clearFiltersBtn').click();
        return {
          cardsAfterClear: document.querySelectorAll('.project-card').length,
          searchInputVal: document.querySelector('#searchInput').value
        };
      })()`,
      returnByValue: true
    });
    console.log('3. Clear All Filters:', res.result?.value);

    // 4. Verification Toggle Cycle
    res = await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('#verifyFilterBtn');
        btn.click();
        const state1 = btn.textContent.trim();
        const cards1 = document.querySelectorAll('.project-card').length;
        btn.click();
        const state2 = btn.textContent.trim();
        const cards2 = document.querySelectorAll('.project-card').length;
        btn.click();
        const state3 = btn.textContent.trim();
        const cards3 = document.querySelectorAll('.project-card').length;
        return { state1, cards1, state2, cards2, state3, cards3 };
      })()`,
      returnByValue: true
    });
    console.log('4. Verification Filter Cycle:', res.result?.value);

    // 5. Dataset Chip Click
    res = await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        const chips = document.querySelectorAll('.chip-btn');
        if (chips.length > 1) {
          chips[1].click();
          return {
            selectedDataset: chips[1].getAttribute('data-dataset'),
            cardsCount: document.querySelectorAll('.project-card').length,
            resultsText: document.querySelector('#resultsCount')?.textContent
          };
        }
        return 'No chips found';
      })()`,
      returnByValue: true
    });
    console.log('5. Dataset Chip Filter:', res.result?.value);

    // 6. Navigation to Project Detail
    const detailLoadPromise = waitForEvent('Page.loadEventFired');
    await sendCommand('Page.navigate', { url: `http://localhost:${PORT}/project.html?id=T001` });
    await detailLoadPromise;
    await new Promise(r => setTimeout(r, 2000));

    res = await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        return {
          title: document.querySelector('.detail-team-title')?.textContent,
          badge: document.querySelector('.badge-verified-pill, .badge-pending-pill')?.textContent.trim(),
          membersCount: document.querySelectorAll('.members-table tbody tr').length,
          actionButtonsCount: document.querySelectorAll('.btn-detail-resource').length,
          backBtnHref: document.querySelector('.btn-back-primary')?.getAttribute('href')
        };
      })()`,
      returnByValue: true
    });
    console.log('6. Project Detail View:', res.result?.value);

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
