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

server.listen(8098, async () => {
  console.log('Test static server listening at http://localhost:8098');
  const tempProfile = path.join(__dirname, 'temp_chrome');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9223',
    `--user-data-dir=${tempProfile}`,
    '--no-first-run',
    'http://localhost:8098/index.html'
  ]);

  await new Promise(r => setTimeout(r, 4500));

  try {
    const listRes = await fetch('http://127.0.0.1:9223/json/list');
    const targets = await listRes.json();
    console.log('Browser targets detected:', targets.length);
    const target = targets.find(t => t.url.includes('8098'));
    
    if (!target) {
      console.error('Target page not found!');
      cleanup(chrome, server);
      return;
    }

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    ws.addEventListener('open', () => {
      // Enable Console domain to capture browser logs
      ws.send(JSON.stringify({ id: 1, method: 'Console.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));
      
      // Evaluate live badge text and tooltip
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 10,
          method: 'Runtime.evaluate',
          params: { expression: 'document.getElementById("headerLiveCount") ? document.getElementById("headerLiveCount").textContent : "none"' }
        }));
        ws.send(JSON.stringify({
          id: 11,
          method: 'Runtime.evaluate',
          params: { expression: 'document.getElementById("headerLivePill") ? document.getElementById("headerLivePill").getAttribute("title") : "none"' }
        }));
      }, 2500);
    });

    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data.toString());
      if (msg.method === 'Runtime.consoleAPICalled') {
        const args = msg.params.args.map(a => a.value || a.description).join(' ');
        console.log('[Browser Console]', msg.params.type, args);
      }
      if (msg.id === 10) {
        console.log('Actual #headerLiveCount text in DOM:', msg.result?.result?.value);
      }
      if (msg.id === 11) {
        console.log('Actual #headerLivePill title in DOM:', msg.result?.result?.value);
        cleanup(chrome, server);
      }
    });

  } catch (err) {
    console.error('Error during browser test:', err);
    cleanup(chrome, server);
  }
});

function cleanup(chrome, server) {
  try { chrome.kill(); } catch (e) {}
  try { server.close(); } catch (e) {}
  setTimeout(() => process.exit(0), 1000);
}
