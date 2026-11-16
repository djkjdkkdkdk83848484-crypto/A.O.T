const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Сервер для Атаки на Шиганшину работает! Ждем игроков.\n');
});

const wss = new WebSocket.Server({ server });

const room = { players: new Map(), nextId: 1 };

wss.on('connection', (ws) => {
  if (room.players.size >= 2) {
    ws.send(JSON.stringify({ type: 'full' }));
    ws.close();
    return;
  }

  const id = room.nextId++;
  const player = {
    id,
    ws,
    state: { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, hp: 100, name: 'Игрок ' + id }
  };
  room.players.set(id, player);

  const others = [...room.players.values()]
    .filter(p => p.id !== id)
    .map(p => ({ id: p.id, name: p.state.name, state: p.state }));

  ws.send(JSON.stringify({ type: 'welcome', id, others }));
  broadcast({ type: 'join', id, name: player.state.name }, id);

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }

    if (msg.type === 'state') {
      player.state.x = msg.x; player.state.y = msg.y; player.state.z = msg.z;
      player.state.yaw = msg.yaw; player.state.pitch = msg.pitch; player.state.hp = msg.hp;
      broadcast({ type: 'state', id, ...player.state }, id);
    }
  });

  ws.on('close', () => {
    room.players.delete(id);
    broadcast({ type: 'leave', id });
  });
});

function broadcast(obj, exceptId) {
  const data = JSON.stringify(obj);
  for (const p of room.players.values()) {
    if (p.id === exceptId) continue;
    if (p.ws.readyState === WebSocket.OPEN) p.ws.send(data);
  }
}

server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
