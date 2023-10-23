import { Renderer } from "./Renderer";
import { vec3 } from "gl-matrix";
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
    readonly options: OrbitConfig;
    private lastX;
    private lastY;
    private state;
    private viewMatrix;
    private speed;
    private zoomSpeed;
    private autoRotateSpeed;
    private minPitch;
    private maxPitch;
    private minRadius;
    private maxRadius;
    private origin;
    radius: number;
    position: vec3;
    center: vec3;
    yaw: number;
    pitch: number;
    private enabled;
    private autoRotate;
    private autoRotateTimeout;
    constructor(renderer: Renderer, options: OrbitConfig);
    enable(): void;
    disable(): void;
    protected initialize(): void;
    protected updateRendererCamera(dx?: number, dy?: number): void;
}
