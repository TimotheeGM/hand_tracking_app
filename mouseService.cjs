const robot = require('robotjs');

class MouseService {
    static moveCursor(normalizedX, normalizedY) {
        const screenSize = robot.getScreenSize();
        const x = Math.round((normalizedX / 100) * screenSize.width);
        const y = Math.round((normalizedY / 100) * screenSize.height);
        robot.moveMouse(x, y);
    }

    static click() {
        console.log('Executing robotjs click...');
        robot.mouseToggle('down');
        setTimeout(() => {
            robot.mouseToggle('up');
            console.log('Click released');
        }, 50); // 50ms press duration
    }
    static rightClick() {
        console.log('Executing robotjs RIGHT click...');
        robot.mouseToggle('down', 'right');
        setTimeout(() => {
            robot.mouseToggle('up', 'right');
            console.log('Right Click released');
        }, 50);
    }
}

module.exports = { MouseService };
