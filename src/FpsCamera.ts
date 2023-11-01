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
    }
}

/**
 * A Flying Camera allows free motion around the scene using FPS style controls (WASD + mouselook)
 * This type of camera is good for displaying large scenes
 */
export class FpsCamera {
    private _dirty = true;
    private _angles = vec3.create();

    get angles() {
        return this._angles;
    }

    set angles(value) {
        this._angles = value;
        this._dirty = true;
    }

    private _position = vec3.create();

    get position() {
        return this._position;
    }

    set position(value) {
        this._position = value;
        this._dirty = true;
    }

    get dirty() {
        return this._dirty;
    }

    set dirty(value) {
        this._dirty = value;
    }

    public speed = 100;
    public rotationSpeed = 0.025;

    private _cameraMat = mat4.create();
    private _viewMat = mat4.create();
    private projectionMat = mat4.create();

    private pressedKeys = new Array<boolean>();

    private canvas: HTMLElement;

    private vec3Temp1 = vec3.create();
    private vec3Temp2 = vec3.create();

    get viewMat() {
        if (this._dirty) {
            var mv = this._viewMat;
            mat4.identity(mv);
            mat4.rotateX(mv, mv, this.angles[0] - Math.PI / 2.0);
            mat4.rotateZ(mv, mv, this.angles[1]);
            mat4.rotateY(mv, mv, this.angles[2]);
            mat4.translate(mv, mv, [-this.position[0], -this.position[1], - this.position[2]]);
            this._dirty = false;
        }

        return this._viewMat;
    }

    constructor(protected options: FpsCameraOptions) {
        this.canvas = options.canvas;

        this.speed = options.movementSpeed ?? 100;
        this.rotationSpeed = options.rotationSpeed ?? 0.025;

        // Set up the appropriate event hooks
        let moving = false;
        let lastX: number, lastY: number;

        window.addEventListener("keydown", event => this.pressedKeys[event.keyCode] = true);
        window.addEventListener("keyup", event => this.pressedKeys[event.keyCode] = false);

        this.canvas.addEventListener('contextmenu', event => event.preventDefault());

        this.canvas.addEventListener('mousedown', event => {
            if (event.which === 3) {
                moving = true;
            }
            lastX = event.pageX;
            lastY = event.pageY;
        });

        this.canvas.addEventListener('mousemove', event => {
            if (moving) {
                let xDelta = event.pageX - lastX;
                let yDelta = event.pageY - lastY;
                lastX = event.pageX;
                lastY = event.pageY;

                this.angles[1] += xDelta * this.rotationSpeed;
                if (this.angles[1] < 0) {
                    this.angles[1] += Math.PI * 2;
                }
                if (this.angles[1] >= Math.PI * 2) {
                    this.angles[1] -= Math.PI * 2;
                }

                this.angles[0] += yDelta * this.rotationSpeed;
                if (this.angles[0] < -Math.PI * 0.5) {
                    this.angles[0] = -Math.PI * 0.5;
                }
                if (this.angles[0] > Math.PI * 0.5) {
                    this.angles[0] = Math.PI * 0.5;
                }

                this._dirty = true;
            }
        });

        this.canvas.addEventListener('mouseup', event => moving = false);
    }

    update(frameTime: number) {
        this.vec3Temp1[0] = 0;
        this.vec3Temp1[1] = 0;
        this.vec3Temp1[2] = 0;

        let speed = (this.speed / 1000) * frameTime;

        if (this.pressedKeys[16]) { // Shift, speed up
            speed *= 5;
        }

        // This is our first person movement code. It's not really pretty, but it works
        if (this.pressedKeys['W'.charCodeAt(0)]) {
            this.vec3Temp1[1] += speed;
        }
        if (this.pressedKeys['S'.charCodeAt(0)]) {
            this.vec3Temp1[1] -= speed;
        }
        if (this.pressedKeys['A'.charCodeAt(0)]) {
            this.vec3Temp1[0] -= speed;
        }
        if (this.pressedKeys['D'.charCodeAt(0)]) {
            this.vec3Temp1[0] += speed;
        }
        if (this.pressedKeys[32]) { // Space, moves up
            this.vec3Temp1[2] += speed;
        }
        if (this.pressedKeys['C'.charCodeAt(0)]) { // C, moves down
            this.vec3Temp1[2] -= speed;
        }

        if (this.vec3Temp1[0] !== 0 || this.vec3Temp1[1] !== 0 || this.vec3Temp1[2] !== 0) {
            let cam = this._cameraMat;
            mat4.identity(cam);
            mat4.rotateX(cam, cam, this.angles[0]);
            mat4.rotateZ(cam, cam, this.angles[1]);
            mat4.invert(cam, cam);

            vec3.transformMat4(this.vec3Temp1, this.vec3Temp1, cam);

            // Move the camera in the direction we are facing
            vec3.add(this.position, this.position, this.vec3Temp1);

            // Restrict movement to the bounding box
            if (this.options.boundingBox) {
                const { boundingBox } = this.options;

                if (this.position[0] < boundingBox.minX) {
                    this.position[0] = boundingBox.minX;
                }
                if (this.position[0] > boundingBox.maxX) {
                    this.position[0] = boundingBox.maxX;
                }
                if (this.position[1] < boundingBox.minY) {
                    this.position[1] = boundingBox.minY;
                }
                if (this.position[1] > boundingBox.maxY) {
                    this.position[1] = boundingBox.maxY;
                }
                if (this.position[2] < boundingBox.minZ) {
                    this.position[2] = boundingBox.minZ;
                }
                if (this.position[2] > boundingBox.maxZ) {
                    this.position[2] = boundingBox.maxZ;
                }
            }

            this._dirty = true;
        }
    }
}
