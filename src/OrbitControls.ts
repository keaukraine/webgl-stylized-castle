import { Renderer } from "./Renderer";

import { mat4, vec3 } from "gl-matrix";

const BUTTON_ROTATE = 0;

enum OrbitState {
    NONE,
    MANUAL_ROTATING,
    AUTO_ROTATING
}

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

export class OrbitControls {
    private lastX = -1;
    private lastY = -1;

    private state = OrbitState.NONE;

    private viewMatrix = mat4.create();

    private speed: number;
    private zoomSpeed: number;
    private autoRotateSpeed: number;
    private minPitch: number;
    private maxPitch: number;
    private minRadius: number;
    private maxRadius: number;
    private origin: Float32Array;

    public radius: number;
    public position = vec3.fromValues(1, 0, 0);
    public center = vec3.fromValues(0, 0, 0);
    public yaw: number;
    public pitch: number;

    private enabled = false;
    private autoRotate = true;
    private autoRotateTimeout: number | undefined;

    constructor(protected renderer: Renderer, public readonly options: OrbitConfig) {
        this.yaw = options.yaw;
        this.pitch = options.pitch;
        this.radius = options.radius;
        this.speed = options.speed;
        this.zoomSpeed = options.zoomSpeed;
        this.autoRotateSpeed = options.autoRotateSpeed;
        this.minPitch = options.minPitch;
        this.maxPitch = options.maxPitch;
        this.minRadius = options.minRadius;
        this.maxRadius = options.maxRadius;
        this.origin = new Float32Array(options.origin);

        this.initialize();
    }

    public enable(): void {
        this.enabled = true;
    }

    public disable(): void {
        this.enabled = false;
        this.renderer.setCustomCamera(undefined);
    }

    protected initialize(): void {
        this.renderer.getCanvas()?.addEventListener("mousedown", (event: MouseEvent) => {
            if (event.button === BUTTON_ROTATE) {
                this.state = OrbitState.MANUAL_ROTATING;
                const { clientX, clientY } = event;
                this.lastX = clientX;
                this.lastY = clientY;
                this.autoRotate = false;
            }
        });

        this.renderer.getCanvas()?.addEventListener("mouseup", (event: MouseEvent) => {
            this.state = OrbitState.NONE;
            clearTimeout(this.autoRotateTimeout);
            this.autoRotateTimeout = window.setTimeout(() => { this.autoRotate = true }, 3000);
        });

        this.renderer.getCanvas()?.addEventListener("mousemove", (event: MouseEvent) => {
            if (this.state === OrbitState.MANUAL_ROTATING) {
                const { clientX, clientY } = event;
                const dx = this.lastX - event.clientX;
                const dy = this.lastY - event.clientY;
                this.updateRendererCamera(dx, dy);
                this.lastX = clientX;
                this.lastY = clientY;
            }
        });

        this.renderer.getCanvas()?.addEventListener("wheel", (event: WheelEvent) => {
            this.radius += event.deltaY * this.zoomSpeed;
            this.updateRendererCamera();
        });

        setInterval(() => {
            if (this.state === OrbitState.NONE && this.autoRotate) {
                this.yaw += this.autoRotateSpeed;
                this.updateRendererCamera();
            }
        }, 16); // approx. 60 fps
    }

    protected updateRendererCamera(dx = 0, dy = 0): void {
        this.yaw += dx * this.speed;
        this.pitch += dy * this.speed;

        if (this.pitch > this.maxPitch) {
            this.pitch = this.maxPitch;
        }
        if (this.pitch < this.minPitch) {
            this.pitch = this.minPitch;
        }
        if (this.radius > this.maxRadius) {
            this.radius = this.maxRadius;
        }
        if (this.radius < this.minRadius) {
            this.radius = this.minRadius;
        }

        this.position[0] = 1;
        this.position[1] = 0;
        this.position[2] = 0;
        vec3.rotateY(this.position, this.position, this.center, -this.pitch);
        vec3.rotateZ(this.position, this.position, this.center, this.yaw);

        const eyeX = this.radius * this.position[0] + this.origin[0];
        const eyeY = this.radius * this.position[1] + this.origin[1];
        const eyeZ = this.radius * this.position[2] + this.origin[2];

        mat4.lookAt(this.viewMatrix,
            [eyeX, eyeY, eyeZ], // eye
            this.origin, // center
            [0, 0, 1] // up vector
        );

        if (this.enabled) {
            this.renderer.setCustomCamera(this.viewMatrix);
        }
    }
}
