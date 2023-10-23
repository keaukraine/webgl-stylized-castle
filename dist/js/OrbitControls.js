"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrbitControls = void 0;
const gl_matrix_1 = require("gl-matrix");
const BUTTON_ROTATE = 0;
var OrbitState;
(function (OrbitState) {
    OrbitState[OrbitState["NONE"] = 0] = "NONE";
    OrbitState[OrbitState["MANUAL_ROTATING"] = 1] = "MANUAL_ROTATING";
    OrbitState[OrbitState["AUTO_ROTATING"] = 2] = "AUTO_ROTATING";
})(OrbitState || (OrbitState = {}));
class OrbitControls {
    constructor(renderer, options) {
        this.renderer = renderer;
        this.options = options;
        this.lastX = -1;
        this.lastY = -1;
        this.state = OrbitState.NONE;
        this.viewMatrix = gl_matrix_1.mat4.create();
        this.position = gl_matrix_1.vec3.fromValues(1, 0, 0);
        this.center = gl_matrix_1.vec3.fromValues(0, 0, 0);
        this.enabled = false;
        this.autoRotate = true;
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
    enable() {
        this.enabled = true;
    }
    disable() {
        this.enabled = false;
        this.renderer.setCustomCamera(undefined);
    }
    initialize() {
        var _a, _b, _c, _d;
        (_a = this.renderer.getCanvas()) === null || _a === void 0 ? void 0 : _a.addEventListener("mousedown", (event) => {
            if (event.button === BUTTON_ROTATE) {
                this.state = OrbitState.MANUAL_ROTATING;
                const { clientX, clientY } = event;
                this.lastX = clientX;
                this.lastY = clientY;
                this.autoRotate = false;
            }
        });
        (_b = this.renderer.getCanvas()) === null || _b === void 0 ? void 0 : _b.addEventListener("mouseup", (event) => {
            this.state = OrbitState.NONE;
            clearTimeout(this.autoRotateTimeout);
            this.autoRotateTimeout = window.setTimeout(() => { this.autoRotate = true; }, 3000);
        });
        (_c = this.renderer.getCanvas()) === null || _c === void 0 ? void 0 : _c.addEventListener("mousemove", (event) => {
            if (this.state === OrbitState.MANUAL_ROTATING) {
                const { clientX, clientY } = event;
                const dx = this.lastX - event.clientX;
                const dy = this.lastY - event.clientY;
                this.updateRendererCamera(dx, dy);
                this.lastX = clientX;
                this.lastY = clientY;
            }
        });
        (_d = this.renderer.getCanvas()) === null || _d === void 0 ? void 0 : _d.addEventListener("wheel", (event) => {
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
    updateRendererCamera(dx = 0, dy = 0) {
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
        gl_matrix_1.vec3.rotateY(this.position, this.position, this.center, -this.pitch);
        gl_matrix_1.vec3.rotateZ(this.position, this.position, this.center, this.yaw);
        const eyeX = this.radius * this.position[0] + this.origin[0];
        const eyeY = this.radius * this.position[1] + this.origin[1];
        const eyeZ = this.radius * this.position[2] + this.origin[2];
        gl_matrix_1.mat4.lookAt(this.viewMatrix, [eyeX, eyeY, eyeZ], // eye
        this.origin, // center
        [0, 0, 1] // up vector
        );
        if (this.enabled) {
            this.renderer.setCustomCamera(this.viewMatrix);
        }
    }
}
exports.OrbitControls = OrbitControls;
//# sourceMappingURL=OrbitControls.js.map