"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimersMap = void 0;
/**
 * A map of various timers.
 */
class TimersMap {
    constructor() {
        this.map = new Map();
        this.lastTime = 0;
    }
    add(key, period, rotating = true) {
        this.map.set(key, [0, period, rotating]);
    }
    ;
    get(index) {
        const timer = this.map.get(index);
        if (timer !== undefined) {
            return timer[0];
        }
        else {
            throw new Error("Timer not found");
        }
    }
    set(index, value) {
        const timer = this.map.get(index);
        if (timer !== undefined) {
            timer[0] = value;
        }
    }
    iterate() {
        const timeNow = new Date().getTime();
        for (const timer of this.map.values()) {
            timer[0] += (timeNow - this.lastTime) / timer[1];
            if (timer[2]) {
                timer[0] %= 1.0;
            }
            else {
                if (timer[0] > 1.0) {
                    timer[0] = 1.0;
                }
            }
        }
        this.lastTime = timeNow;
    }
}
exports.TimersMap = TimersMap;
//# sourceMappingURL=TimersMap.js.map