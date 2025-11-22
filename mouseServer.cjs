const { WebSocketServer } = require('ws');
const { MouseService } = require('./mouseService.cjs');
const http = require('http');

const PORT = 8081;
const HTTP_PORT = 8082;

console.log('Starting Mouse Control WebSocket Server on port', PORT);

// Create HTTP server for shutdown endpoint
const httpServer = http.createServer((req, res) => {
    if (req.url === '/shutdown' && req.method === 'POST') {
        res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
        res.end('Shutting down...');
        console.log('Shutdown requested via HTTP');
        setTimeout(() => {
            process.exit(0);
        }, 500);
    } else if (req.method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end();
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

httpServer.listen(HTTP_PORT, () => {
    console.log(`HTTP control server listening on port ${HTTP_PORT}`);
});

const wss = new WebSocketServer({ port: PORT });

let prevGesture = 'UNKNOWN';

wss.on('connection', (ws) => {
    console.log('✓ Mouse WebSocket client connected');

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());
            const { cursor, gesture } = msg;

            // Move cursor if coordinates are valid
            if (cursor && typeof cursor.x === 'number' && typeof cursor.y === 'number') {
                MouseService.moveCursor(cursor.x, cursor.y);
            }

            // Click on gesture transition from OPEN to CLOSED (debounce)
            if (gesture === 'CLOSED' && prevGesture !== 'CLOSED') {
                console.log('Click triggered');
                MouseService.click();
            }

            prevGesture = gesture;
        } catch (e) {
            console.error('Failed to process mouse WS message:', e);
        }
    });

    ws.on('close', () => console.log('✗ Mouse WebSocket client disconnected'));
    ws.on('error', (err) => console.error('WebSocket error:', err));
});

console.log('Mouse server ready. Waiting for connections...');

