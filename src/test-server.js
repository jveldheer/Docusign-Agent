#!/usr/bin/env node
/**
 * Simple HTTP server to test DocuSign Click embed
 * Run with: npm run test-server
 */

import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 3000;
const HOST = 'localhost';

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.pdf': 'application/pdf'
};

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Default to test-agreement.html
  let filePath = req.url === '/' ? '/test-agreement.html' : req.url;
  filePath = path.join(process.cwd(), filePath);

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('File not found');
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log('='.repeat(60));
  console.log('DocuSign Click Test Server');
  console.log('='.repeat(60));
  console.log();
  console.log(`Server running at: http://${HOST}:${PORT}`);
  console.log();
  console.log('Open this URL in your browser to test the agreement.');
  console.log('Press Ctrl+C to stop the server.');
  console.log();
});
