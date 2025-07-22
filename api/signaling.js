javascript
const WebSocket = require('ws');

module.exports = (req, res) => {
  if (!req.headers['upgrade'] || req.headers['upgrade'].toLowerCase() !== 'websocket') {
    return res.status(400).json({ error: 'Expected WebSocket request' });
  }

  const wss = new WebSocket.Server({ noServer: true });
  const clients = new Map(); // clientId -> WebSocket

  wss.on('connection', (ws, request) => {
    const clientId = new URLSearchParams(request.url.split('?')[1]).get('clientId') || 'anonymous_' + Math.random().toString(36).substr(2, 9);
    clients.set(clientId, ws);
    console.log(`Client connected: ${clientId}, Total clients: ${clients.size}`);

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'register') {
          ws.clientId = clientId;
          ws.send(JSON.stringify({ type: 'registered', clientId }));
        } else if (data.type === 'offer' || data.type === 'answer' || data.type === 'candidate') {
          const targetClient = clients.get(data.targetId);
          if (targetClient) {
            targetClient.send(JSON.stringify({ ...data, senderId: clientId }));
          } else {
            ws.send(JSON.stringify({ type: 'error', message: `Target client ${data.targetId} not found` }));
          }
        }
      } catch (e) {
        console.error(`Error processing message from ${clientId}: ${e.message}`);
      }
    });

    ws.on('close', () => {
      clients.delete(clientId);
      console.log(`Client disconnected: ${clientId}, Total clients: ${clients.size}`);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for ${clientId}: ${error.message}`);
    });
  });

  req.server.handleUpgrade(req, req.socket, Buffer.alloc(0), (ws) => {
    wss.emit('connection', ws, req);
  });
};
