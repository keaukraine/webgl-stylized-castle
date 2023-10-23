import { mat4, vec3 } from "gl-matrix";
/**
 * `FpsCamera` configuration options.
 */
export interface FpsCameraOptions {
    /** Canvas element to bind events to. */
    canvas: HTMLElement;
    /** Movement speed. */
    movementSpeed?: number;
    /** Rotation speed. */
    rotationSpeed?: number;
    /** Bounding box to restrict movement. */
    boundingBox?: {
        minX: number;
        minY: number;
        minZ: number;
        maxX: number;
        maxY: number;
        maxZ: number;
    };
}
/**
 * A Flying Camera allows free motion around the scene using FPS style controls (WASD + mouselook)
 * This type of camera is good for displaying large scenes
 */
export declare class FpsCamera {
    protected options: FpsCameraOptions;
    private _dirty;
    private _angles;
    get angles(): vec3;
    set angles(value: vec3);
    private _position;
    get position(): vec3;
    set position(value: vec3);
    get dirty(): boolean;
    set dirty(value: boolean);
    speed: number;
    rotationSpeed: number;
    private _cameraMat;
    private _viewMat;
    private projectionMat;
    private pressedKeys;
    private canvas;
    private vec3Temp1;
    private vec3Temp2;
    get viewMat(): mat4;
    constructor(options: FpsCameraOptions);
    update(frameTime: number): void;
}
