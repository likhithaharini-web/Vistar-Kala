require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');

const app = require('./app');
const { sequelize } = require('./models');
const { verifyToken } = require('./utils/jwt');
const { attachIO } = require('./services/notificationService');
const { autoCloseExpiredAuctions } = require('./controllers/auctionController');

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN || '*' },
});

// Clients authenticate their socket with the same JWT used for the REST API
// (socket.handshake.auth.token) and are joined to a room keyed by their user
// id, so notifications can be pushed to them in real time.
io.on('connection', (socket) => {
  const token = socket.handshake.auth && socket.handshake.auth.token;
  if (token) {
    try {
      const payload = verifyToken(token);
      socket.join(`user:${payload.userId}`);
    } catch (err) {
      // invalid token - socket stays connected but joins no room
    }
  }

  socket.on('disconnect', () => {});
});

attachIO(io);

async function start() {
  await sequelize.authenticate();
  // Prototype-friendly schema sync. For a production deployment this would
  // be replaced with proper migrations (e.g. sequelize-cli migrations).
  await sequelize.sync();
  // eslint-disable-next-line no-console
  console.log(`Database connected (${sequelize.getDialect()}) and synced.`);

  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Vistar Kala backend listening on port ${PORT}`);
  });

  // Background job: auto-close auctions whose endTime has passed, and
  // activate auctions whose startTime has arrived. Runs every 30s.
  setInterval(() => {
    autoCloseExpiredAuctions().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Auto-close auctions job failed:', err);
    });
  }, 30 * 1000);
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = server;
