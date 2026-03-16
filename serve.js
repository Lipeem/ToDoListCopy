const http = require('http');
const fs = require('fs');
const path = require('path');
const server = http.createServer((req, res) => {
  const file = req.url === '/' ? '/TaskFlow.html' : req.url;
  const filePath = path.join(__dirname, file);
  const ext = path.extname(filePath);
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not Found'); return; }
    res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain' });
    res.end(data);
  });
});
server.listen(3456, () => console.log('Server running on http://localhost:3456'));
