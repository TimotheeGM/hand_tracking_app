# Virtual Mouse Setup

## Overview
This app now includes a **virtual mouse** feature that translates hand movements into OS-level cursor control. Your hand movements will control the actual system cursor, allowing you to interact with any application on your computer!

## How It Works
1. **Browser App** (Vite): Detects your hand using MediaPipe and sends cursor coordinates via WebSocket
2. **Mouse Server** (Node.js): Receives coordinates and uses `robotjs` to control the OS cursor
3. **Gesture Detection**: Closing your fist triggers a mouse click

## Running the Virtual Mouse

### Option 1: Single Command (Recommended)
```bash
npm run dev:full
```
This starts both servers in one terminal with color-coded output.

### Option 2: Two Terminals (Manual)
If you prefer separate terminals:

**Terminal 1: Vite Dev Server**
```bash
npm run dev
```
This starts the web interface at http://localhost:5173

**Terminal 2: Mouse Control Server**
```bash
npm run mouse-server
```
This starts the WebSocket server on port 8081 that controls your cursor.

## Usage
1. Start both servers (see above)
2. Open http://localhost:5173 in your browser
3. Click "Start Tracking" and allow camera access
4. Move your hand - the OS cursor will follow!
5. Close your fist to click

> **Note**: The physical mouse continues to work normally alongside the virtual mouse.

## Troubleshooting

**"Cannot find module 'robotjs'"**  
Run: `npm install`

**Cursor not moving**  
- Ensure the mouse server is running (`npm run mouse-server`)
- Check the browser console for WebSocket connection errors
- Verify the server console shows "Mouse WebSocket client connected"

**Camera not working**  
- Check browser permissions
- Restart the Vite dev server

## Architecture
- `App.tsx`: WebSocket client that sends hand tracking data
- `mouseServer.js`: Node.js WebSocket server
- `mouseService.js`: robotjs wrapper for cursor control
