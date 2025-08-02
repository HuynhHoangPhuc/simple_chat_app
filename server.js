import express from 'express';
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { Server } from 'socket.io';

const port = process.env.PORT || 3000;
const app = express();
const server = createServer(app);
const db = new DatabaseSync('chat.db');
const io = new Server(server);

await db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      username TEXT NOT NULL
  );
`);

app.use(express.static("public"));

app.get('/', (req, res) => {
  res.sendFile("/index.html");
});

const insertMessageQuery = db.prepare('INSERT INTO messages (username, content) VALUES (?, ?)');
const getAllMessagesQuery = db.prepare('SELECT id, content, username FROM messages');

io.on('connection', (socket) => {
  socket.on('chat message', (username, msg) => {
    const { lastInsertRowid } = insertMessageQuery.run(username, msg);
    io.emit('chat message', username, msg, lastInsertRowid);
  });

  socket.on('get all messages', () => {
    const allMessages = getAllMessagesQuery.all();
    allMessages.forEach((row) => {
      io.emit('chat message', row.username, row.content, row.id);
    });
  });
});

server.listen(port, () => {
  console.log(`server running at http://localhost:${port}`);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: gracefully shutting down')
  if (server) {
    server.close(() => {
      console.log('HTTP server closed')
    })
  }
})