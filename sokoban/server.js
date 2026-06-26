// 简易 API 服务器 — 用于测试销售看板远程数据
// 运行: node server.js
// 端点: http://localhost:3456/api/sales

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3456;
const dataFile = path.join(__dirname, 'api-data.json');

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/api/sales' && req.method === 'GET') {
    try {
      const raw = fs.readFileSync(dataFile, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(raw);
      console.log(`[${new Date().toLocaleTimeString()}] GET /api/sales → 200`);
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: '读取数据失败' }));
    }
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`API 服务已启动: http://localhost:${PORT}/api/sales`);
  console.log(`修改 ${dataFile} 后刷新看板即可看到变化`);
});
