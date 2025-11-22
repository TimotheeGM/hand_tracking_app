import robot from 'robotjs';

export class MouseService {
    /** Move the OS cursor to the given screen coordinates (0‑100% range). */
    static moveCursor(normalizedX: number, normalizedY: number) {
        const screenSize = robot.getScreenSize();
        const x = Math.round((normalizedX / 100) * screenSize.width);
        const y = Math.round((normalizedY / 100) * screenSize.height);
        robot.moveMouseSmooth(x, y);
    }

    /** Perform a left‑click. */
    static click() {
        robot.mouseClick();
    }
}
