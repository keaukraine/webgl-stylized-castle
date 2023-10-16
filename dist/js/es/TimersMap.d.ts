/**
 * A map of various timers.
 */
export declare class TimersMap {
    private map;
    private lastTime;
    add(key: number, period: number, rotating?: boolean): void;
    get(index: number): number;
    set(index: number, value: number): void;
    iterate(): void;
}
