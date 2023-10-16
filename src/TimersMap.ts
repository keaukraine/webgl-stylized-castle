/**
 * A map of various timers.
 */
export class TimersMap {
    private map: Map<number, [timer: number, period: number, rotating: boolean]> = new Map();
    private lastTime = 0;

    public add(key: number, period: number, rotating = true): void {
        this.map.set(key, [0, period, rotating]);
    };

    public get(index: number): number {
        const timer = this.map.get(index);
        if (timer !== undefined) {
            return timer[0];
        } else {
            throw new Error("Timer not found");
        }
    }

    public set(index: number, value: number): void {
        const timer = this.map.get(index);
        if (timer !== undefined) {
            timer[0] = value;
        }
    }

    public iterate(): void {
        const timeNow = new Date().getTime();

        for (const timer of this.map.values()) {
            timer[0] += (timeNow - this.lastTime) / timer[1];
            if (timer[2]) {
                timer[0] %= 1.0;
            } else {
                if (timer[0] > 1.0) {
                    timer[0] = 1.0;
                }
            }
        }

        this.lastTime = timeNow;
    }
}
