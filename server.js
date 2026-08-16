const express = require('express');
const path = require('path');
const http = require('http');
const { WebSocketServer } = require('ws');
const db = require('./lib/db');
const { createEntry } = require('./lib/logic');

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

app.get('/api/people', async (req, res) => {
  try {
    const people = await db.getAllPeople();
    res.json(people);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/people', async (req, res) => {
  try {
    const { id, name, avatar, default_bev } = req.body;
    if (!id || !name) return res.status(400).json({ error: 'id and name required' });
    const person = await db.addPerson(id, name, avatar, default_bev);
    broadcast({ type: 'person_added', person });
    res.status(201).json(person);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/people/:id', async (req, res) => {
  try {
    await db.removePerson(req.params.id);
    broadcast({ type: 'person_removed', id: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/drinks/today', async (req, res) => {
  try {
    const drinks = await db.getTodayDrinks();
    res.json(drinks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/drinks', async (req, res) => {
  try {
    const { person, beverage, logged_by } = req.body;
    if (!person || !beverage) return res.status(400).json({ error: 'person and beverage required' });
    const entry = createEntry(person, beverage, logged_by || 'anonymous');
    const drink = await db.addDrink(entry.id, entry.timestamp, entry.person, entry.beverage, entry.logged_by);
    broadcast({ type: 'drink_logged', drink });
    res.status(201).json(drink);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function start() {
  await db.initialize();
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});
