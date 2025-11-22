const robot = require('robotjs');

class MouseService {
    static moveCursor(normalizedX, normalizedY) {
        const screenSize = robot.getScreenSize();
        const x = Math.round((normalizedX / 100) * screenSize.width);
        const y = Math.round((normalizedY / 100) * screenSize.height);
        robot.moveMouse(x, y);
    }

    static click() {
        robot.mouseClick();
    }
}

module.exports = { MouseService };
