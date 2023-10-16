import { Renderer } from "./Renderer";
export interface OrbitConfig {
    yaw: number;
    pitch: number;
    radius: number;
    speed: number;
    zoomSpeed: number;
    autoRotateSpeed: number;
    minPitch: number;
    maxPitch: number;
    minRadius: number;
    maxRadius: number;
    origin: number[];
}
export declare class OrbitControls {
    protected renderer: Renderer;
    private lastX;
    private lastY;
    private state;
    private viewMatrix;
    private yaw;
    private pitch;
    private radius;
    private speed;
    private zoomSpeed;
    private autoRotateSpeed;
    private minPitch;
    private maxPitch;
    private minRadius;
    private maxRadius;
    private origin;
    private position;
    private center;
    private enabled;
    private autoRotate;
    private autoRotateTimeout;
    constructor(renderer: Renderer, options: OrbitConfig);
    enable(): void;
    disable(): void;
    protected initialize(): void;
    protected updateRendererCamera(dx?: number, dy?: number): void;
}
