const { WebSocketServer } = require('ws');
const { MouseService } = require('./mouseService');

const PORT = 8081;

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws) => {
    console.log('Mouse WebSocket client connected');
    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());
            const { cursor, gesture } = msg;
            if (cursor && typeof cursor.x === 'number' && typeof cursor.y === 'number') {
                MouseService.moveCursor(cursor.x, cursor.y);
            }
            if (gesture === 'CLOSED') {
                MouseService.click();
            }
        } catch (e) {
            console.error('Failed to process mouse WS message', e);
        }
    });
    ws.on('close', () => console.log('Mouse WebSocket client disconnected'));
});

module.exports = wss;
