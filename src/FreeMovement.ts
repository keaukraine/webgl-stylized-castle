import { Renderer } from "./Renderer";
import { mat4, vec3 } from "gl-matrix";
import { FpsCamera, FpsCameraOptions } from "./FpsCamera";

enum MovementMode {
    Free,
    Predefined
};

export class FreeMovement {
    private mode: MovementMode;
    private matCamera = mat4.create();
    private matInvCamera = new Float32Array(16);
    private vec3Eye = new Float32Array(3);
    private vec3Rotation = new Float32Array(3);

    private fpsCamera: FpsCamera | undefined;

    private enabled = false;

    constructor(private renderer: Renderer, private options: FpsCameraOptions) {
        this.mode = MovementMode.Predefined;
        this.setupControls();
    }

    public enable(): void {
        this.enabled = true;
    }

    public disable(): void {
        this.enabled = false;
        this.renderer.setCustomCamera(undefined);
    }

    private setupControls() {
        this.matCamera = mat4.clone(this.renderer.getViewMatrix());
        // this.renderer.setCustomCamera(this.matCamera);
        this.mode = MovementMode.Free;

        mat4.invert(this.matInvCamera, this.matCamera);
        mat4.getTranslation(this.vec3Eye, this.matInvCamera);
        vec3.normalize(this.vec3Rotation, this.vec3Eye);
        vec3.scale(this.vec3Rotation, this.vec3Rotation, -1);

        this.fpsCamera = this.fpsCamera ?? new FpsCamera(this.options);
        this.fpsCamera.position = this.vec3Eye;

        const callback = (_time: number) => {
            if (this.mode !== MovementMode.Free) {
                return;
            }

            this.fpsCamera!.update(16);
            this.matCamera = this.fpsCamera!.viewMat;
            if (this.enabled) {
                this.renderer.setCustomCamera(this.matCamera, this.fpsCamera!.position, this.fpsCamera!.angles);
            }

            requestAnimationFrame(callback);
        }
        callback(16);
    };
}
