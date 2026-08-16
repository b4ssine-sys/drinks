const express = require('express');
const path = require('path');
const http = require('http');
const { WebSocketServer } = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(msg);
  }
}

// --- API routes (to be implemented) ---

// GET  /api/people
// POST /api/people
// DELETE /api/people/:id
// GET  /api/drinks/today
// POST /api/drinks

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
