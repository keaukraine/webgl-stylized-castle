"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Renderer = void 0;
const webgl_framework_1 = require("webgl-framework");
const gl_matrix_1 = require("gl-matrix");
const CameraMode_1 = require("./CameraMode");
const VertexColorSmShader_1 = require("./shaders/VertexColorSmShader");
const VertexColorDepthShader_1 = require("./shaders/VertexColorDepthShader");
const FlagSmShader_1 = require("./shaders/FlagSmShader");
const FlagDepthShader_1 = require("./shaders/FlagDepthShader");
const KnightAnimatedShader_1 = require("./shaders/KnightAnimatedShader");
const KnightDepthShader_1 = require("./shaders/KnightDepthShader");
const EagleAnimatedShader_1 = require("./shaders/EagleAnimatedShader");
const EagleDepthShader_1 = require("./shaders/EagleDepthShader");
const CameraPositionInterpolator_1 = require("./CameraPositionInterpolator");
const Colors_1 = require("./Colors");
const WindShader_1 = require("./shaders/WindShader");
const Splines_1 = require("./Splines");
const Cameras_1 = require("./Cameras");
const TimersMap_1 = require("./TimersMap");
const TimersEnum_1 = require("./TimersEnum");
const OrbitControls_1 = require("./OrbitControls");
const FreeMovement_1 = require("./FreeMovement");
const FOV_LANDSCAPE = 35.0;
const FOV_PORTRAIT = 60.0;
const WIND_SEGMENTS = 50;
const WIND_WIDTH = 0.07;
const WIND_COLOR = 0.12;
class Renderer extends webgl_framework_1.BaseRenderer {
    constructor() {
        super();
        this.lastTime = 0;
        this.loaded = false;
        this.fmCastleInner = new webgl_framework_1.FullModel();
        this.fmCastleOuter = new webgl_framework_1.FullModel();
        this.fmGround = new webgl_framework_1.FullModel();
        this.fmFlag1 = new webgl_framework_1.FullModel();
        this.fmFlag2 = new webgl_framework_1.FullModel();
        this.fmFlag3 = new webgl_framework_1.FullModel();
        this.fmKnight = new webgl_framework_1.FullModel();
        this.fmEagle = new webgl_framework_1.FullModel();
        this.Z_NEAR = 10.0;
        this.Z_FAR = 2000.0;
        this.FLAGS_PERIOD = 800;
        this.WALK_ANIM_SPEED = 2.0;
        this.HEAD1_PERIOD = 5000 / this.WALK_ANIM_SPEED;
        this.ARM1_PERIOD = 2100 / this.WALK_ANIM_SPEED;
        this.ARM2_PERIOD = 2000;
        this.STEP1_PERIOD = 2100 / this.WALK_ANIM_SPEED;
        this.SPLINE1_PERIOD = 37000;
        this.SPLINE2_PERIOD = 11000;
        this.SPLINE3_PERIOD = 18000;
        this.WINGS_PERIOD = 3000;
        this.BIRD_FLIGHT_PERIOD = 22000;
        this.WIND_MOVE_PERIOD1 = 2000 + 5000;
        this.WIND_MOVE_PERIOD2 = 2500 + 5000;
        this.WIND_MOVE_PERIOD3 = 3000 + 5000;
        this.FADE_PERIOD = 2500;
        this.CAMERA_PERIOD = 34000;
        this.timers = new TimersMap_1.TimersMap();
        this.randomWindCoeff1 = Math.random();
        this.randomWindCoeff2 = Math.random();
        this.randomWindCoeff3 = Math.random();
        this.cameraMode = CameraMode_1.CameraMode.Orbiting;
        this.cameraPosition = gl_matrix_1.vec3.create();
        this.cameraRotation = gl_matrix_1.vec3.create();
        this.BIRD_FLIGHT_RADIUS = 150;
        this.config = {
            ambient: 0.45,
            diffuse: 1.0,
            diffuseCoeff: 1.5,
            diffuseExponent: 1.0,
            shadowBrightness: 0.5,
            flagsAmplitude: 0.15,
            flagsWaves: 5,
            lightDistanceLow: 3300,
            lightHeightLow: 1700,
            lightDistance: 2200,
            lightHeight: 3800,
            lightNear: 3000,
            lightFar: 5000,
            lightFov: 18,
            fogColor: [0.41, 0.75, 0.92, 1],
            fogStartDistance: 500,
            fogDistance: 400,
            timeOfDay: 0,
            shadowResolution: 2
        };
        this.SHADOWMAP_SIZE = 1024 * 2.0; // can be reduced to 1.3 with still OK quality
        this.SHADOWMAP_TEXEL_OFFSET_SCALE = 0.666;
        this.PCF_BIAS_CORRECTION = 1.5 / this.SHADOWMAP_SIZE; // ~1.5 texels
        this.mViewMatrixLight = gl_matrix_1.mat4.create();
        this.mProjMatrixLight = gl_matrix_1.mat4.create();
        this.pointLight = gl_matrix_1.vec3.create();
        this.cameraPositionInterpolator = new CameraPositionInterpolator_1.CameraPositionInterpolator();
        this.CAMERA_SPEED = 1;
        this.CAMERA_MIN_DURATION = 11000 / 1;
        this.currentRandomCamera = 0;
        this.currentLightDirection = 1;
        this.tempAmbient = [0, 0, 0, 1];
        this.tempDiffuse = [0, 0, 0, 1];
        this.tempFog = [0, 0, 0, 1];
        this.framesCount = 0;
        this.SCALE = 20;
        this.smallFlags2 = [
            [-6.0000, 2.9000, 0.0000],
            [3.0000, 4.5000, 5.1960],
            [-3.0000, 2.5000, 5.1960],
            [-3.0000, 2.9000, -8.6600]
        ];
        this.smallFlags3 = [
            [-2.0000, 2.9000, -13.856],
            [2.0000, 2.9000, -13.8560],
            [-0.9000, 3.8, -9.3260]
        ];
        this.cameraPositionInterpolator.speed = this.CAMERA_SPEED;
        this.cameraPositionInterpolator.minDuration = this.CAMERA_MIN_DURATION;
        this.randomizeCamera();
        this.setupTimers();
        document.addEventListener("keypress", event => {
            if (event.key === "1") {
                Cameras_1.CAMERAS[0].start = {
                    position: new Float32Array([this.cameraPosition[0], this.cameraPosition[1], this.cameraPosition[2]]),
                    rotation: new Float32Array([this.cameraRotation[0], this.cameraRotation[1], this.cameraRotation[2]]),
                };
                this.logCamera();
            }
            else if (event.key === "2") {
                Cameras_1.CAMERAS[0].end = {
                    position: new Float32Array([this.cameraPosition[0], this.cameraPosition[1], this.cameraPosition[2]]),
                    rotation: new Float32Array([this.cameraRotation[0], this.cameraRotation[1], this.cameraRotation[2]]),
                };
                this.logCamera();
            }
        });
    }
    setupTimers() {
        this.timers.add(TimersEnum_1.Timers.Flags, this.FLAGS_PERIOD);
        this.timers.add(TimersEnum_1.Timers.HeadAnimation1, this.HEAD1_PERIOD);
        this.timers.add(TimersEnum_1.Timers.ArmsAnimation1, this.ARM1_PERIOD);
        this.timers.add(TimersEnum_1.Timers.ArmsAnimation2, this.ARM2_PERIOD);
        this.timers.add(TimersEnum_1.Timers.Step1, this.STEP1_PERIOD);
        this.timers.add(TimersEnum_1.Timers.Spline1, this.SPLINE1_PERIOD);
        this.timers.add(TimersEnum_1.Timers.Spline2, this.SPLINE2_PERIOD);
        this.timers.add(TimersEnum_1.Timers.Spline3, this.SPLINE3_PERIOD);
        this.timers.add(TimersEnum_1.Timers.Wings, this.WINGS_PERIOD);
        this.timers.add(TimersEnum_1.Timers.BirdsFly, this.BIRD_FLIGHT_PERIOD);
        this.timers.add(TimersEnum_1.Timers.WindMove1, this.WIND_MOVE_PERIOD1);
        this.timers.add(TimersEnum_1.Timers.WindMove2, this.WIND_MOVE_PERIOD2);
        this.timers.add(TimersEnum_1.Timers.WindMove3, this.WIND_MOVE_PERIOD3);
        this.timers.add(TimersEnum_1.Timers.Fade, this.FADE_PERIOD, false);
        this.timers.add(TimersEnum_1.Timers.Camera, this.CAMERA_PERIOD);
    }
    setCustomCamera(camera, position, rotation) {
        this.customCamera = camera;
        if (position !== undefined) {
            this.cameraPosition = position;
        }
        if (rotation !== undefined) {
            this.cameraRotation = rotation;
        }
    }
    resetCustomCamera() {
        this.customCamera = undefined;
    }
    onBeforeInit() {
    }
    onAfterInit() {
        this.orbitControls = new OrbitControls_1.OrbitControls(this, {
            yaw: Math.random() * Math.PI * 2,
            pitch: 2.5,
            radius: 400,
            speed: 0.004,
            zoomSpeed: 0.3,
            autoRotateSpeed: 0.0008,
            minPitch: 1.7,
            maxPitch: 3.1,
            minRadius: 200,
            maxRadius: 700,
            origin: [0, 0, 50]
        });
        this.freeMovement = new FreeMovement_1.FreeMovement(this, {
            canvas: this.canvas,
            movementSpeed: 35,
            rotationSpeed: 0.006,
            boundingBox: {
                minX: -500,
                maxX: 500,
                minY: -500,
                maxY: 500,
                minZ: 10,
                maxZ: 500
            }
        });
        this.setCameraMode(CameraMode_1.CameraMode.Orbiting);
    }
    onInitError() {
        var _a, _b;
        (_a = document.getElementById("canvasGL")) === null || _a === void 0 ? void 0 : _a.classList.add("hidden");
        (_b = document.getElementById("alertError")) === null || _b === void 0 ? void 0 : _b.classList.remove("hidden");
    }
    initShaders() {
        this.shaderDiffuse = new webgl_framework_1.DiffuseShader(this.gl);
        this.shaderObjects = new VertexColorSmShader_1.VertexColorSmShader(this.gl);
        this.shaderObjectsDepth = new VertexColorDepthShader_1.VertexColorDepthShader(this.gl);
        this.shaderFlag = new FlagSmShader_1.FlagSmShader(this.gl);
        this.shaderFlagDepth = new FlagDepthShader_1.FlagDepthShader(this.gl);
        this.shaderKnight = new KnightAnimatedShader_1.KnightAnimatedShader(this.gl);
        this.shaderKnightDepth = new KnightDepthShader_1.KnightDepthShader(this.gl);
        this.shaderEagle = new EagleAnimatedShader_1.EagleAnimatedShader(this.gl);
        this.shaderEagleDepth = new EagleDepthShader_1.EagleDepthShader(this.gl);
        this.shaderWind = new WindShader_1.WindShader(this.gl);
    }
    async loadData() {
        var _a;
        await Promise.all([
            this.fmCastleInner.load(`data/models/castle-inner`, this.gl),
            this.fmCastleOuter.load(`data/models/castle-outer`, this.gl),
            this.fmGround.load(`data/models/ground`, this.gl),
            this.fmFlag1.load(`data/models/flag1`, this.gl),
            this.fmFlag2.load(`data/models/flag2`, this.gl),
            this.fmFlag3.load(`data/models/flag3`, this.gl),
            this.fmKnight.load(`data/models/knightRed`, this.gl),
            this.fmEagle.load(`data/models/eagle`, this.gl)
        ]);
        const bufferKnight = new Uint16Array(144);
        for (let i = 0; i < 144; i++) {
            bufferKnight[i] = i;
        }
        this.fmKnight.bufferIndices = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.fmKnight.bufferIndices);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, bufferKnight, this.gl.STATIC_DRAW);
        this.fmKnight.numIndices = bufferKnight.byteLength / 3 / 2;
        const bufferEagle = new Uint16Array(210);
        for (let i = 0; i < 210; i++) {
            bufferEagle[i] = i;
        }
        this.fmEagle.bufferIndices = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.fmEagle.bufferIndices);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, bufferEagle, this.gl.STATIC_DRAW);
        this.fmEagle.numIndices = bufferEagle.byteLength / 3 / 2;
        [
            this.textureKnight,
            this.textureEagle
        ] = await Promise.all([
            webgl_framework_1.UncompressedTextureLoader.load(`data/textures/knightRed.png`, this.gl, this.gl.LINEAR, this.gl.LINEAR, false),
            webgl_framework_1.UncompressedTextureLoader.load(`data/textures/eagle.png`, this.gl, this.gl.LINEAR, this.gl.LINEAR, false)
        ]);
        this.generateMipmaps(this.textureKnight, this.textureEagle);
        this.loaded = true;
        this.timers.set(TimersEnum_1.Timers.Fade, 0);
        console.log("Loaded all assets");
        this.initOffscreen();
        this.initVignette();
        (_a = this.readyCallback) === null || _a === void 0 ? void 0 : _a.call(this);
    }
    resizeCanvas() {
        if (this.canvas === undefined) {
            return;
        }
        super.resizeCanvas();
    }
    animate() {
        this.timers.iterate();
        const timeNow = new Date().getTime();
        if (this.lastTime != 0) {
            this.cameraPositionInterpolator.iterate(timeNow);
            if (this.cameraPositionInterpolator.timer === 1.0 && this.cameraMode === CameraMode_1.CameraMode.Random) {
                this.randomizeCamera();
            }
        }
        this.lastTime = timeNow;
    }
    /** Calculates projection matrix */
    setCameraFOV(multiplier) {
        var ratio;
        if (this.gl.canvas.height > 0) {
            ratio = this.gl.canvas.width / this.gl.canvas.height;
        }
        else {
            ratio = 1.0;
        }
        let fov = 0;
        if (this.gl.canvas.width >= this.gl.canvas.height) {
            fov = FOV_LANDSCAPE * multiplier;
        }
        else {
            fov = FOV_PORTRAIT * multiplier;
        }
        this.setFOV(this.mProjMatrix, fov, ratio, this.Z_NEAR, this.Z_FAR);
    }
    /**
     * Calculates camera matrix.
     *
     * @param a Position in [0...1] range
     */
    positionCamera(a) {
        if (this.customCamera !== undefined) {
            gl_matrix_1.mat4.copy(this.mVMatrix, this.customCamera);
            return;
        }
        if (this.cameraMode === CameraMode_1.CameraMode.Random) {
            gl_matrix_1.mat4.copy(this.mVMatrix, this.cameraPositionInterpolator.matrix);
            this.cameraPosition[0] = this.cameraPositionInterpolator.cameraPosition[0];
            this.cameraPosition[1] = this.cameraPositionInterpolator.cameraPosition[1];
            this.cameraPosition[2] = this.cameraPositionInterpolator.cameraPosition[2];
        }
    }
    positionCameraLight(a) {
        const lightDistance = (this.config.timeOfDay === 0 || this.config.timeOfDay === 1)
            ? this.config.lightDistance
            : this.config.lightDistanceLow;
        const lightHeight = (this.config.timeOfDay === 0 || this.config.timeOfDay === 1)
            ? this.config.lightHeight
            : this.config.lightHeightLow;
        const sina = Math.sin(a * Math.PI * 2);
        const cosa = Math.cos(a * Math.PI * 2);
        const x = sina * lightDistance;
        const y = cosa * lightDistance;
        const z = lightHeight;
        this.pointLight[0] = x;
        this.pointLight[1] = y;
        this.pointLight[2] = z;
        gl_matrix_1.mat4.lookAt(this.mVMatrix, [x, y, z], // eye
        [0, 0, 0], // center
        [0, 0, 1] // up vector
        );
        gl_matrix_1.mat4.copy(this.mViewMatrixLight, this.mVMatrix);
    }
    /** Issues actual draw calls */
    drawScene() {
        if (!this.loaded) {
            return;
        }
        const fogColor = this.getFogColor();
        this.gl.clearColor(fogColor[0], fogColor[1], fogColor[2], fogColor[3]);
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.cullFace(this.gl.BACK);
        this.gl.disable(this.gl.BLEND);
        // update shadows at half framerate but at full rate between camera changes
        const cameraTimer = this.cameraPositionInterpolator.timer;
        if (this.framesCount % 2 === 0 || cameraTimer < 0.02 || cameraTimer > 0.98) {
            this.gl.colorMask(false, false, false, false);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fboOffscreen.framebufferHandle);
            this.gl.viewport(0, 0, this.fboOffscreen.width, this.fboOffscreen.height);
            this.gl.depthMask(true);
            this.gl.enable(this.gl.DEPTH_TEST);
            this.gl.clear(this.gl.DEPTH_BUFFER_BIT);
            const lightFov = this.getLightFov();
            this.setFOV(this.mProjMatrix, lightFov, 1, this.config.lightNear, this.config.lightFar);
            this.setFOV(this.mProjMatrixLight, lightFov, 1, this.config.lightNear, this.config.lightFar);
            this.positionCameraLight(this.currentLightDirection);
            this.drawCastleModels(true);
        }
        this.gl.colorMask(true, true, true, true);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null); // This differs from OpenGL ES
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.setCameraFOV(1.0);
        this.positionCamera(this.timers.get(TimersEnum_1.Timers.Camera));
        this.drawCastleModels(false);
        this.drawWind();
        // this.drawDepthMap();
        this.framesCount++;
    }
    getLightFov() {
        if (this.cameraMode === CameraMode_1.CameraMode.Random) {
            return this.config.lightFov * Cameras_1.CAMERA_FOV_COEFFS[this.currentRandomCamera];
        }
        else {
            return this.config.lightFov;
        }
    }
    drawDepthMap() {
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.cullFace(this.gl.BACK);
        this.gl.disable(this.gl.BLEND);
        this.shaderDiffuse.use();
        this.setTexture2D(0, this.textureOffscreenDepth, this.shaderDiffuse.sTexture);
        this.drawVignette(this.shaderDiffuse);
    }
    drawVignette(shader) {
        this.unbindBuffers();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.mTriangleVerticesVignette);
        this.gl.enableVertexAttribArray(shader.rm_Vertex);
        this.gl.vertexAttribPointer(shader.rm_Vertex, 3, this.gl.FLOAT, false, 20, 0);
        this.gl.enableVertexAttribArray(shader.rm_TexCoord0);
        this.gl.vertexAttribPointer(shader.rm_TexCoord0, 2, this.gl.FLOAT, false, 20, 4 * 3);
        this.gl.uniformMatrix4fv(shader.view_proj_matrix, false, this.getOrthoMatrix());
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }
    drawCastleModels(drawToShadowMap) {
        if (this.shaderObjects === undefined
            || this.shaderObjectsDepth === undefined
            || this.shaderFlag === undefined
            || this.shaderFlagDepth === undefined) {
            return;
        }
        let shaderObjects;
        if (drawToShadowMap) {
            shaderObjects = this.shaderObjectsDepth;
            this.shaderObjectsDepth.use();
        }
        else {
            shaderObjects = this.shaderObjects;
            this.shaderObjects.use();
            const diffuseColor = this.getDiffuseColor();
            const ambientColor = this.getAmbientColor();
            this.gl.uniform4f(this.shaderObjects.lightDir, this.pointLight[0], this.pointLight[1], this.pointLight[2], 0);
            this.gl.uniform4fv(this.shaderObjects.ambient, ambientColor);
            this.gl.uniform4fv(this.shaderObjects.diffuse, diffuseColor);
            this.gl.uniform1f(this.shaderObjects.diffuseCoef, this.config.diffuseCoeff);
            this.gl.uniform1f(this.shaderObjects.diffuseExponent, this.config.diffuseExponent);
            this.setFogUniforms(this.shaderObjects);
            this.gl.uniform3f(this.shaderObjects.lightVector, this.pointLight[0], this.pointLight[1], this.pointLight[2]);
            this.setBaseShadowUniforms(this.shaderObjects, 0, 0, 0, 0, 0, 0, this.SCALE, this.SCALE, this.SCALE);
        }
        if (!drawToShadowMap) {
            this.gl.uniform3fv(this.shaderObjects.colors, Colors_1.CASTLE_INNER_COLORS);
        }
        shaderObjects.drawModel(this, this.fmCastleInner, 0, 0, 0, 0, 0, 0, this.SCALE, this.SCALE, this.SCALE);
        if (!drawToShadowMap) {
            this.gl.uniform3fv(this.shaderObjects.colors, Colors_1.CASTLE_OUTER_COLORS);
        }
        shaderObjects.drawModel(this, this.fmCastleOuter, 0, 0, 0, 0, 0, 0, this.SCALE, this.SCALE, this.SCALE);
        if (!drawToShadowMap) {
            this.gl.uniform3fv(this.shaderObjects.colors, Colors_1.GROUND_COLORS);
        }
        shaderObjects.drawModel(this, this.fmGround, 0, 0, 0, 0, 0, 0, this.SCALE, this.SCALE, this.SCALE);
        // flags
        this.drawFlag(drawToShadowMap, this.fmFlag1, -40, 0, 251, 0, 0, 0, 33, 33, 23, 0.4, 0.4, 1.0);
        this.drawFlag(drawToShadowMap, this.fmFlag1, -120, 0, 158, 0, 0, 0, 28, 28, 20, 0.4, 0.4, 1.0);
        for (const [x, y, z] of this.smallFlags2) {
            this.drawFlag(drawToShadowMap, this.fmFlag2, x * -20, z * -20, y * 20 + 14, 0, 0, 0, 18, 20, 10, 0.85, 0.85, 0.35);
        }
        for (const [x, y, z] of this.smallFlags3) {
            this.drawFlag(drawToShadowMap, this.fmFlag3, x * -20, z * -20, y * 20 + 14, 0, 0, 0, 18, 20, 10, 0.55, 0.2, 0.55);
        }
        this.drawEagles(drawToShadowMap);
        this.drawKnights(drawToShadowMap);
    }
    drawKnights(drawToShadowMap) {
        this.drawWalkingKnight(drawToShadowMap, Splines_1.SPLINE_WALL_INNER_1, this.timers.get(TimersEnum_1.Timers.Spline2), 0);
        this.drawWalkingKnight(drawToShadowMap, Splines_1.SPLINE_WALL_INNER_2, this.timers.get(TimersEnum_1.Timers.Spline3), 0);
        this.drawWalkingKnight(drawToShadowMap, Splines_1.SPLINE_WALL_INNER_3, this.timers.get(TimersEnum_1.Timers.Spline1), 0);
        this.drawWalkingKnight(drawToShadowMap, Splines_1.SPLINE_WALL_INNER_4, this.timers.get(TimersEnum_1.Timers.Spline3), 0);
        this.drawWalkingKnight(drawToShadowMap, Splines_1.SPLINE_WALL_INNER_5, this.timers.get(TimersEnum_1.Timers.Spline3), 0);
        this.drawWalkingKnight(drawToShadowMap, Splines_1.SPLINE_WALL_INNER_6, this.timers.get(TimersEnum_1.Timers.Spline1), 0);
        this.drawWalkingKnight(drawToShadowMap, Splines_1.SPLINE_WALL_INNER_6, this.timers.get(TimersEnum_1.Timers.Spline1) + 0.5, 0);
        this.drawTalkingNearSwordsKnights(drawToShadowMap);
        this.drawKnightRepairingCart(drawToShadowMap);
        this.drawKnightsNearCannons(drawToShadowMap);
        this.drawKnightsAboveEntrance(drawToShadowMap);
    }
    drawWind() {
        var _a;
        if (this.shaderWind === undefined) {
            return;
        }
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.ONE, this.gl.ONE);
        this.gl.disable(this.gl.CULL_FACE);
        (_a = this.shaderWind) === null || _a === void 0 ? void 0 : _a.use();
        this.gl.uniform2f(this.shaderWind.dimensions, (WIND_SEGMENTS - 1) * 2, WIND_WIDTH);
        this.gl.uniform3f(this.shaderWind.amplitudes, 0.6, 0.4, 1.2);
        this.gl.uniform3f(this.shaderWind.frequencies, 0.032, 0.05, 0.02);
        this.gl.uniform1f(this.shaderWind.fogStartDistance, this.fogStartDistance);
        this.gl.uniform1f(this.shaderWind.fogDistance, this.fogDistance);
        this.drawWindBatch(this.timers.get(TimersEnum_1.Timers.WindMove1), 0.36, this.randomWindCoeff1, 80);
        this.drawWindBatch(this.timers.get(TimersEnum_1.Timers.WindMove2), 0.37, this.randomWindCoeff2, 100);
        this.drawWindBatch(this.timers.get(TimersEnum_1.Timers.WindMove3), 0.38, this.randomWindCoeff3, 170);
        this.gl.disable(this.gl.BLEND);
        this.gl.enable(this.gl.CULL_FACE);
    }
    drawWindBatch(timerWindMove, timerPhase, randomWindCoeff, height) {
        if (this.shaderWind === undefined) {
            return;
        }
        for (let i = 0; i < 3; i++) {
            const timer = (timerWindMove + i * timerPhase) % 1.0;
            const a = Math.pow(Math.sin(timer * Math.PI), 2);
            const color = WIND_COLOR * a;
            const offsetX = -26 + i * 18 + 18 * randomWindCoeff;
            const offsetY = (timer * 4.4) * WIND_SEGMENTS * 4 / 10;
            this.gl.uniform4f(this.shaderWind.color, color, color, color, 1);
            this.gl.uniform3f(this.shaderWind.offset, offsetX, offsetY * 10, 0);
            this.shaderWind.draw(this, 0, -500, height, 0, 0, 0, 10, 1, 10, WIND_SEGMENTS);
        }
    }
    getTimeOfDayBaseColor() {
        return Colors_1.BASE_COLORS[this.config.timeOfDay];
    }
    getTimeOfDayAmbientCoeff() {
        return Colors_1.AMBIENT[this.config.timeOfDay];
    }
    getAmbientColor() {
        const baseColor = this.getTimeOfDayBaseColor();
        const ambient = this.getTimeOfDayAmbientCoeff();
        this.tempAmbient[0] = ambient * 0.5 + baseColor[0] * 0.5 * ambient;
        this.tempAmbient[1] = ambient * 0.5 + baseColor[1] * 0.5 * ambient;
        this.tempAmbient[2] = ambient * 0.5 + baseColor[2] * 0.5 * ambient;
        return this.tempAmbient;
    }
    getDiffuseColor() {
        const baseColor = this.getTimeOfDayBaseColor();
        const { diffuse } = this.config;
        this.tempDiffuse[0] = diffuse * 0.5 + baseColor[0] * 0.5;
        this.tempDiffuse[1] = diffuse * 0.5 + baseColor[1] * 0.5;
        this.tempDiffuse[2] = diffuse * 0.5 + baseColor[2] * 0.5;
        return this.tempDiffuse;
    }
    getFogColor() {
        const baseColor = this.getTimeOfDayBaseColor();
        const { fogColor } = this.config;
        this.tempFog[0] = fogColor[0] * 0.5 + baseColor[0] * 0.5;
        this.tempFog[1] = fogColor[1] * 0.5 + baseColor[1] * 0.5;
        this.tempFog[2] = fogColor[2] * 0.5 + baseColor[2] * 0.5;
        return this.tempFog;
    }
    drawEagles(drawToShadowMap) {
        const angle = this.timers.get(TimersEnum_1.Timers.BirdsFly) * Math.PI * 2;
        const bird1 = this.getBirdPosition(angle, 80, -50);
        const bird2 = this.getBirdPosition(-angle - Math.PI, 0, 0);
        const bird3 = this.getBirdPosition(-angle - Math.PI, 0, 200);
        const bird4 = this.getBirdPosition(angle, 80, 170);
        const bird5 = this.getBirdPosition(-angle - Math.PI, 100, 180);
        const bird6 = this.getBirdPosition(angle, -100, 200);
        this.drawEagle(drawToShadowMap, 0, bird1.x, bird1.y, 140, 0, 0, -angle);
        this.drawEagle(drawToShadowMap, 1, bird2.x, bird2.y, 190, 0, 0, angle);
        this.drawEagle(drawToShadowMap, 2, bird3.x, bird3.y, 150, 0, 0, angle);
        this.drawEagle(drawToShadowMap, 3, bird4.x, bird4.y, 160, 0, 0, -angle);
        this.drawEagle(drawToShadowMap, 4, bird5.x, bird5.y, 180, 0, 0, angle);
        this.drawEagle(drawToShadowMap, 5, bird6.x, bird6.y, 170, 0, 0, -angle);
    }
    drawFlag(drawToShadowMap, model, tx, ty, tz, rx, ry, rz, sx, sy, sz, r, g, b) {
        if (this.shaderFlag === undefined || this.shaderFlagDepth === undefined) {
            return;
        }
        const diffuseColor = this.getDiffuseColor();
        const ambientColor = this.getAmbientColor();
        let shaderObjects;
        if (drawToShadowMap) {
            shaderObjects = this.shaderFlagDepth;
            this.shaderFlagDepth.use();
            this.gl.uniform1f(this.shaderFlagDepth.time, Math.PI * 2 * (1 - this.timers.get(TimersEnum_1.Timers.Flags)));
            this.gl.uniform1f(this.shaderFlagDepth.amplitude, this.config.flagsAmplitude);
            this.gl.uniform1f(this.shaderFlagDepth.waves, this.config.flagsWaves);
        }
        else {
            shaderObjects = this.shaderFlag;
            this.shaderFlag.use();
            this.gl.uniform1f(this.shaderFlag.time, Math.PI * 2 * (1 - this.timers.get(TimersEnum_1.Timers.Flags)));
            this.gl.uniform1f(this.shaderFlag.amplitude, this.config.flagsAmplitude);
            this.gl.uniform1f(this.shaderFlag.waves, this.config.flagsWaves);
            this.gl.uniform4f(this.shaderFlag.lightDir, this.pointLight[0], this.pointLight[1], this.pointLight[2], 0);
            this.gl.uniform4fv(this.shaderFlag.ambient, ambientColor);
            this.gl.uniform4fv(this.shaderFlag.diffuse, diffuseColor);
            this.gl.uniform1f(this.shaderFlag.diffuseCoef, this.config.diffuseCoeff);
            this.gl.uniform1f(this.shaderFlag.diffuseExponent, this.config.diffuseExponent);
            this.setFogUniforms(this.shaderFlag);
            this.gl.uniform3f(this.shaderFlag.lightVector, this.pointLight[0], this.pointLight[1], this.pointLight[2]);
            this.gl.uniform4fv(this.shaderFlag.color, [r, g, b, 1.0]);
            this.setBaseShadowUniforms(this.shaderFlag, tx, ty, tz, rx, ry, rz, sx, sy, sz);
        }
        shaderObjects.drawModel(this, model, tx, ty, tz, rx, ry, rz, sx, sy, sz);
    }
    drawTalkingNearSwordsKnights(drawToShadowMap) {
        const headAngle1 = Math.sin(this.timers.get(TimersEnum_1.Timers.HeadAnimation1) * Math.PI * 2) * 0.1 - 0.5;
        const leftArmAngle1 = Math.sin(this.timers.get(TimersEnum_1.Timers.ArmsAnimation2) * Math.PI * 2) * 0.1;
        const rightArmAngle1 = -Math.sin(this.timers.get(TimersEnum_1.Timers.ArmsAnimation2) * Math.PI * 2) * 0.1 + 1.5;
        const headAngle2 = Math.sin(this.timers.get(TimersEnum_1.Timers.HeadAnimation1) * Math.PI * 2 + 1) * 0.1 + 0.4;
        const leftArmAngle2 = Math.sin(this.timers.get(TimersEnum_1.Timers.ArmsAnimation2) * Math.PI * 2) * 0.1;
        const rightArmAngle2 = -Math.sin(this.timers.get(TimersEnum_1.Timers.ArmsAnimation2) * Math.PI * 2) * 0.1 + 1.45;
        this.drawKnight(drawToShadowMap, headAngle1, leftArmAngle1, rightArmAngle1, -35, 124, 0, 0, 0, 0.15);
        this.drawKnight(drawToShadowMap, headAngle2, leftArmAngle2, rightArmAngle2, -45, 137, 0, 0, 0, 1.7);
    }
    drawKnightsNearCannons(drawToShadowMap) {
        const headAngle1 = Math.sin(this.timers.get(TimersEnum_1.Timers.ArmsAnimation2) * Math.PI * 2) * 0.07 + 0.9;
        const leftArmAngle1 = Math.sin(this.timers.get(TimersEnum_1.Timers.ArmsAnimation2) * Math.PI * 2) * 0.05 + 0.4;
        const rightArmAngle1 = 1.8;
        const headAngle2 = Math.sin(this.timers.get(TimersEnum_1.Timers.ArmsAnimation2) * Math.PI * 2) * 0.05 - 1.9;
        const leftArmAngle2 = Math.sin(this.timers.get(TimersEnum_1.Timers.ArmsAnimation2) * Math.PI * 2) * 0.08 + 1.9;
        const rightArmAngle2 = Math.sin(this.timers.get(TimersEnum_1.Timers.ArmsAnimation2) * Math.PI * 2 + 1) * 0.08 + 1.9;
        this.drawKnight(drawToShadowMap, headAngle1, leftArmAngle1, rightArmAngle1, 40, 123, 0, 0, 0, -3.3);
        this.drawKnight(drawToShadowMap, headAngle2, leftArmAngle2, rightArmAngle2, 49, 142, 0, 0, 0, -3);
    }
    drawKnightsAboveEntrance(drawToShadowMap) {
        const headAngle1 = Math.sin(this.timers.get(TimersEnum_1.Timers.HeadAnimation1) * Math.PI * 2) * 0.04 + 0.1;
        const leftArmAngle1 = Math.sin(this.timers.get(TimersEnum_1.Timers.ArmsAnimation2) * Math.PI * 2) * 0.09;
        const rightArmAngle1 = Math.sin(this.timers.get(TimersEnum_1.Timers.ArmsAnimation2) * Math.PI * 2 + 1) * 0.09;
        const headAngle2 = Math.sin(this.timers.get(TimersEnum_1.Timers.HeadAnimation1) * Math.PI * 2) * 0.04 - 0.1;
        const leftArmAngle2 = Math.sin(this.timers.get(TimersEnum_1.Timers.ArmsAnimation2) * Math.PI * 2) * 0.09;
        const rightArmAngle2 = Math.sin(this.timers.get(TimersEnum_1.Timers.ArmsAnimation2) * Math.PI * 2 + 1) * 0.09;
        const headAngle3 = Math.sin(this.timers.get(TimersEnum_1.Timers.HeadAnimation1) * Math.PI * 2) * 0.04 - 0.1;
        const leftArmAngle3 = Math.sin(this.timers.get(TimersEnum_1.Timers.ArmsAnimation2) * Math.PI * 2 + 1) * 0.1 + 0.5;
        const rightArmAngle3 = 2.0;
        this.drawKnight(drawToShadowMap, headAngle1, leftArmAngle1, rightArmAngle1, -30, -102, 20, 0, 0, 1.6);
        this.drawKnight(drawToShadowMap, headAngle2, leftArmAngle2, rightArmAngle2, 30, -102, 20, 0, 0, 0.6);
        this.drawKnight(drawToShadowMap, headAngle3, leftArmAngle3, rightArmAngle3, 83, -65, 20, 0, 0.13, 2.6);
        this.drawKnight(drawToShadowMap, headAngle3, rightArmAngle3, leftArmAngle3, 136, 0, 20, 0, 0.13, 3.6);
    }
    drawKnightRepairingCart(drawToShadowMap) {
        const headAngle1 = Math.sin(this.timers.get(TimersEnum_1.Timers.HeadAnimation1) * Math.PI * 2 + 1.0) * 0.04 + 0.2;
        const leftArmAngle1 = Math.sin(this.timers.get(TimersEnum_1.Timers.ArmsAnimation2) * Math.PI * 2 + 2.0) * 0.3 + 2;
        const rightArmAngle1 = -Math.sin(this.timers.get(TimersEnum_1.Timers.ArmsAnimation2) * Math.PI * 2) * 0.3 + 2;
        this.drawKnight(drawToShadowMap, headAngle1, leftArmAngle1, rightArmAngle1, -41, 234, 0, 0.26, 0, 1.1);
    }
    drawWalkingKnight(drawToShadowMap, spline, timerSpline, phase) {
        if (timerSpline > 1) {
            timerSpline = timerSpline - 1;
        }
        const headAngle = Math.sin(this.timers.get(TimersEnum_1.Timers.HeadAnimation1) * Math.PI * 2 + phase) * 0.2;
        const leftArmAngle = Math.sin(this.timers.get(TimersEnum_1.Timers.ArmsAnimation1) * Math.PI * 2 + phase) * 0.5;
        const rightArmAngle = -Math.sin(this.timers.get(TimersEnum_1.Timers.ArmsAnimation1) * Math.PI * 2 + phase) * 0.5;
        const step = Math.abs(Math.sin(this.timers.get(TimersEnum_1.Timers.Step1) * Math.PI * 2 + phase)) * 1.2;
        const p = spline.getCurrentPoint(timerSpline);
        let r = spline.getRotation(timerSpline).z;
        r *= 0.0174533;
        this.drawKnight(drawToShadowMap, headAngle, leftArmAngle, rightArmAngle, p.y, p.x, p.z + step, 0, 0, r);
    }
    drawKnight(drawToShadowMap, headAngle, leftArmAngle, rightArmAngle, tx, ty, tz, rx, ry, rz) {
        if (this.shaderKnight === undefined || this.shaderKnightDepth === undefined) {
            return;
        }
        const diffuseColor = this.getDiffuseColor();
        const ambientColor = this.getAmbientColor();
        const scaleKnight = 2.0 * 0.8;
        let shaderObjects;
        if (drawToShadowMap) {
            shaderObjects = this.shaderKnightDepth;
            this.shaderKnightDepth.use();
            this.gl.uniform1f(this.shaderKnightDepth.headRotationZ, headAngle);
            this.gl.uniform2f(this.shaderKnightDepth.armRotations, leftArmAngle, rightArmAngle);
        }
        else {
            shaderObjects = this.shaderKnight;
            this.shaderKnight.use();
            this.gl.uniform4f(this.shaderKnight.lightDir, this.pointLight[0], this.pointLight[1], this.pointLight[2], 0);
            this.gl.uniform4fv(this.shaderKnight.ambient, ambientColor);
            this.gl.uniform4fv(this.shaderKnight.diffuse, diffuseColor);
            this.gl.uniform1f(this.shaderKnight.diffuseCoef, this.config.diffuseCoeff);
            this.gl.uniform1f(this.shaderKnight.diffuseExponent, this.config.diffuseExponent);
            this.setFogUniforms(this.shaderKnight);
            this.gl.uniform3f(this.shaderKnight.lightVector, this.pointLight[0], this.pointLight[1], this.pointLight[2]);
            this.setTexture2D(1, this.textureKnight, this.shaderKnight.sTexture);
            this.gl.uniform1f(this.shaderKnight.headRotationZ, headAngle);
            this.gl.uniform2f(this.shaderKnight.armRotations, leftArmAngle, rightArmAngle);
            this.setBaseShadowUniforms(this.shaderKnight, tx, ty, tz, rx, ry, rz, scaleKnight, scaleKnight, scaleKnight);
        }
        shaderObjects.drawModel(this, this.fmKnight, tx, ty, tz, rx, ry, rz, scaleKnight, scaleKnight, scaleKnight);
    }
    getBirdPosition(angle, centerX, centerY) {
        const x = Math.sin(angle) * this.BIRD_FLIGHT_RADIUS + centerX;
        const y = Math.cos(angle) * this.BIRD_FLIGHT_RADIUS + centerY;
        return { x, y };
    }
    drawEagle(drawToShadowMap, phase, tx, ty, tz, rx, ry, rz) {
        if (this.shaderEagle === undefined || this.shaderEagleDepth === undefined) {
            return;
        }
        const diffuseColor = this.getDiffuseColor();
        const ambientColor = this.getAmbientColor();
        const scaleEagle = 0.13;
        let shaderObjects;
        const wingsRotation = Math.sin(this.timers.get(TimersEnum_1.Timers.Wings) * Math.PI * 2 + phase) * 0.4;
        if (drawToShadowMap) {
            shaderObjects = this.shaderEagleDepth;
            this.shaderEagleDepth.use();
            this.gl.uniform1f(this.shaderEagleDepth.wingsRotation, wingsRotation);
        }
        else {
            shaderObjects = this.shaderEagle;
            this.shaderEagle.use();
            this.gl.uniform4f(this.shaderEagle.lightDir, this.pointLight[0], this.pointLight[1], this.pointLight[2], 0);
            this.gl.uniform4fv(this.shaderEagle.ambient, ambientColor);
            this.gl.uniform4fv(this.shaderEagle.diffuse, diffuseColor);
            this.gl.uniform1f(this.shaderEagle.diffuseCoef, this.config.diffuseCoeff);
            this.gl.uniform1f(this.shaderEagle.diffuseExponent, this.config.diffuseExponent);
            this.setFogUniforms(this.shaderEagle);
            this.gl.uniform3f(this.shaderEagle.lightVector, this.pointLight[0], this.pointLight[1], this.pointLight[2]);
            this.gl.uniform1f(this.shaderEagle.wingsRotation, wingsRotation);
            this.setTexture2D(1, this.textureEagle, this.shaderEagle.sTexture);
            this.setBaseShadowUniforms(this.shaderEagle, tx, ty, tz, rx, ry, rz, scaleEagle, scaleEagle, scaleEagle);
        }
        shaderObjects.drawModel(this, this.fmEagle, tx, ty, tz, rx, ry, rz, scaleEagle, scaleEagle, scaleEagle);
    }
    get fogStartDistance() {
        return this.config.fogStartDistance * this.timers.get(TimersEnum_1.Timers.Fade);
    }
    get fogDistance() {
        return this.config.fogDistance * this.timers.get(TimersEnum_1.Timers.Fade);
    }
    setFogUniforms(shader) {
        const fogColor = this.getFogColor();
        this.gl.uniform4fv(shader.fogColor, fogColor);
        this.gl.uniform1f(shader.fogStartDistance, this.fogStartDistance);
        this.gl.uniform1f(shader.fogDistance, this.fogDistance);
    }
    setBaseShadowUniforms(shader, tx, ty, tz, rx, ry, rz, sx, sy, sz) {
        this.setTexture2D(0, this.textureOffscreenDepth, shader.sDepth);
        this.gl.uniform1f(shader.texelSize, 1.0 / this.SHADOWMAP_SIZE * this.SHADOWMAP_TEXEL_OFFSET_SCALE);
        this.gl.uniformMatrix4fv(shader.projectionMatrix, false, this.mProjMatrixLight);
        this.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);
        this.gl.uniformMatrix4fv(shader.modelMatrix, false, this.mMMatrix);
        this.gl.uniformMatrix4fv(shader.lightMatrix, false, this.mViewMatrixLight, 0);
        this.gl.uniform1f(shader.shadowBrightnessFS, this.config.shadowBrightness);
        this.gl.uniform1f(shader.pcfBiasCorrection, this.PCF_BIAS_CORRECTION);
    }
    setCameraMode(mode) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        if (mode === CameraMode_1.CameraMode.Orbiting) {
            (_a = this.orbitControls) === null || _a === void 0 ? void 0 : _a.enable();
            (_b = this.freeMovement) === null || _b === void 0 ? void 0 : _b.disable();
        }
        else if (mode === CameraMode_1.CameraMode.FPS) {
            (_c = this.freeMovement) === null || _c === void 0 ? void 0 : _c.updatePosition([0, -400, 150]);
            (_d = this.freeMovement) === null || _d === void 0 ? void 0 : _d.updateRotation([0.39, 0, 0]);
            (_e = this.orbitControls) === null || _e === void 0 ? void 0 : _e.disable();
            (_f = this.freeMovement) === null || _f === void 0 ? void 0 : _f.enable();
        }
        else {
            (_g = this.orbitControls) === null || _g === void 0 ? void 0 : _g.disable();
            (_h = this.freeMovement) === null || _h === void 0 ? void 0 : _h.disable();
        }
        this.cameraMode = mode;
    }
    get currentCameraMode() {
        return this.cameraMode;
    }
    checkGlError(operation) {
        // Do nothing in production build.
    }
    set ready(callback) {
        this.readyCallback = callback;
    }
    getProjMatrix() {
        return this.mProjMatrix;
    }
    getCameraPosition() {
        return this.cameraPosition;
    }
    getCanvas() {
        return this.canvas;
    }
    createDepthTexture(gl, texWidth, texHeight) {
        const textureID = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, textureID);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
        const version = gl.getParameter(gl.VERSION) || "";
        const glFormat = gl.DEPTH_COMPONENT;
        const glInternalFormat = version.includes("WebGL 2")
            ? gl.DEPTH_COMPONENT16
            : gl.DEPTH_COMPONENT;
        const type = gl.UNSIGNED_SHORT;
        // In WebGL, we cannot pass array to depth texture.
        gl.texImage2D(gl.TEXTURE_2D, 0, glInternalFormat, texWidth, texHeight, 0, glFormat, type, null);
        return textureID;
    }
    initOffscreen() {
        if (this.textureOffscreenDepth !== undefined) {
            this.gl.deleteTexture(this.textureOffscreenDepth);
        }
        if (this.textureOffscreenColor !== undefined) {
            this.gl.deleteTexture(this.textureOffscreenColor);
        }
        this.textureOffscreenColor = webgl_framework_1.TextureUtils.createNpotTexture(this.gl, this.SHADOWMAP_SIZE, this.SHADOWMAP_SIZE, false);
        this.checkGlError("color");
        this.textureOffscreenDepth = this.createDepthTexture(this.gl, this.SHADOWMAP_SIZE, this.SHADOWMAP_SIZE);
        this.checkGlError("depth");
        this.fboOffscreen = new webgl_framework_1.FrameBuffer(this.gl);
        this.fboOffscreen.textureHandle = this.textureOffscreenColor;
        this.fboOffscreen.depthTextureHandle = this.textureOffscreenDepth;
        this.fboOffscreen.width = this.SHADOWMAP_SIZE;
        this.fboOffscreen.height = this.SHADOWMAP_SIZE;
        this.fboOffscreen.createGLData(this.SHADOWMAP_SIZE, this.SHADOWMAP_SIZE);
        this.checkGlError("offscreen FBO");
        console.log("Initialized offscreen FBO.");
    }
    initVignette() {
        gl_matrix_1.mat4.ortho(this.matOrtho, -1, 1, -1, 1, 2.0, 250);
        this.mQuadTriangles = new Float32Array([
            // X, Y, Z, U, V
            -1.0, -1.0, -5.0, 0.0, 0.0,
            1.0, -1.0, -5.0, 1.0, 0.0,
            -1.0, 1.0, -5.0, 0.0, 1.0,
            1.0, 1.0, -5.0, 1.0, 1.0, // 3. right-top
        ]);
        this.mTriangleVerticesVignette = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.mTriangleVerticesVignette);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.mQuadTriangles, this.gl.STATIC_DRAW);
    }
    logCamera() {
        const camera = Cameras_1.CAMERAS[0];
        console.log(`
        {
            start: {
                position: new Float32Array([${camera.start.position.toString()}]),
                rotation: new Float32Array([${camera.start.rotation.toString()}])
            },
            end: {
                position: new Float32Array([${camera.end.position.toString()}]),
                rotation: new Float32Array([${camera.end.rotation.toString()}])
            },
            speedMultiplier: 1.0
        },
        `);
    }
    randomizeCamera() {
        this.currentRandomCamera = (this.currentRandomCamera + 1 + Math.trunc(Math.random() * (Cameras_1.CAMERAS.length - 2))) % Cameras_1.CAMERAS.length;
        this.cameraPositionInterpolator.speed = this.CAMERA_SPEED * Cameras_1.CAMERAS[this.currentRandomCamera].speedMultiplier;
        this.cameraPositionInterpolator.position = Cameras_1.CAMERAS[this.currentRandomCamera];
        this.cameraPositionInterpolator.reset();
        this.currentLightDirection = Math.random() * Math.PI * 2;
        this.randomWindCoeff1 = Math.random();
        this.randomWindCoeff2 = Math.random();
        this.randomWindCoeff3 = Math.random();
    }
    updateShadowResolution(scale) {
        this.SHADOWMAP_SIZE = 1024 * scale;
        this.PCF_BIAS_CORRECTION = 1.5 / this.SHADOWMAP_SIZE;
        this.initOffscreen();
    }
}
exports.Renderer = Renderer;
//# sourceMappingURL=Renderer.js.map