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
    console.log('404:', req.url, '->', filePath);
    res.writeHead(404);
    res.end();
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(8092, async () => {
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9231',
    '--no-first-run',
    'http://localhost:8092/index.html'
  ]);

  setTimeout(async () => {
    const listRes = await fetch('http://127.0.0.1:9231/json/list');
    const targets = await listRes.json();
    const target = targets.find(t => t.url.includes('8092'));
    if (!target) {
      console.log('No target');
      chrome.kill();
      server.close();
      return;
    }

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({ id: 1, method: 'Console.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));
    });

    ws.addEventListener('message', (event) => {
      const data = event.data;
      const msg = JSON.parse(data.toString());
      if (msg.method === 'Runtime.consoleAPICalled') {
        console.log('[Console]', msg.params.type, msg.params.args.map(a => a.value || a.description));
      }
      if (msg.id === 10) {
        console.log('Eval result:', msg.result?.result?.value);
      }
    });

    setTimeout(() => {
      ws.send(JSON.stringify({
        id: 10,
        method: 'Runtime.evaluate',
        params: {
          expression: '({ cards: document.querySelectorAll(".project-card").length, error: document.querySelector("#errorBanner")?.style?.display, errText: document.querySelector("#errorMessage")?.textContent, liveCount: document.querySelector("#headerLiveCount")?.textContent })',
          returnByValue: true
        }
      }));
    }, 2500);

    setTimeout(() => {
      chrome.kill();
      server.close();
      process.exit(0);
    }, 5500);
  }, 2000);
});
