// live-stream.js — WebSocket broadcast for live call transcripts
// The salon dashboard connects here to see calls in real-time
const WebSocket = require('ws');

class LiveStream {
  constructor() {
    this.dashboardClients = new Set();
    this.wss = null;
  }

  /**
   * Attach to the HTTP server — creates a WebSocket server for the given path
   * NOTE: Call this BEFORE server.on('upgrade') is set up
   */
  attach(server, path = '/live-transcripts') {
    this.wss = new WebSocket.Server({ noServer: true });

    this.path = path;
  }

  /**
   * Handle an upgrade request — call this from the server's upgrade handler
   */
  handleUpgrade(request, socket, head) {
    if (request.url === this.path) {
      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.wss.emit('connection', ws, request);
      });
      return true;
    }
    return false;
  }

  /**
   * Initialize the connection handler (call after server starts)
   */
  init() {
    if (!this.wss) return;

    this.wss.on('connection', (ws, req) => {
      console.log('📡 Dashboard live-stream connected');
      this.dashboardClients.add(ws);

      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to salon live stream',
      }));

      ws.on('close', () => {
        console.log('📡 Dashboard live-stream disconnected');
        this.dashboardClients.delete(ws);
      });

      ws.on('error', (err) => {
        console.log('⚠️ Live-stream WS error:', err.message);
        this.dashboardClients.delete(ws);
      });
    });

    console.log(`📡 Live-stream endpoint ready at ${this.path}`);
  }

  broadcast(event) {
    const payload = JSON.stringify(event);
    for (const client of this.dashboardClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  callStarted(callerNumber, streamSid) {
    this.broadcast({
      type: 'call_started',
      callerNumber,
      streamSid,
      timestamp: new Date().toISOString(),
    });
  }

  transcriptTurn(streamSid, speaker, text) {
    this.broadcast({
      type: 'transcript',
      streamSid,
      speaker,
      text,
      timestamp: new Date().toISOString(),
    });
  }

  bookingDetected(streamSid, booking) {
    this.broadcast({
      type: 'booking_detected',
      streamSid,
      booking,
      timestamp: new Date().toISOString(),
    });
  }

  callEnded(streamSid) {
    this.broadcast({
      type: 'call_ended',
      streamSid,
      timestamp: new Date().toISOString(),
    });
  }
}

// Singleton
const liveStream = new LiveStream();
module.exports = liveStream;
