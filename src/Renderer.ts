import { BaseRenderer, FullModel, UncompressedTextureLoader, DiffuseShader, TextureUtils, FrameBuffer, BaseShader } from "webgl-framework";
import { mat4, vec3 } from "gl-matrix";
import { CameraMode } from "./CameraMode";
import { IShadowShader } from "./shaders/IShadowShader";
import { IFogShader } from "./shaders/FogChunks";
import { VertexColorSmShader } from "./shaders/VertexColorSmShader";
import { VertexColorDepthShader } from "./shaders/VertexColorDepthShader";
import { DrawableShader } from "webgl-framework/dist/types/DrawableShader";
import { FlagSmShader } from "./shaders/FlagSmShader";
import { FlagDepthShader } from "./shaders/FlagDepthShader";
import { KnightAnimatedShader } from "./shaders/KnightAnimatedShader";
import { Spline3D } from "./utils/Spline3D";
import { KnightDepthShader } from "./shaders/KnightDepthShader";
import { EagleAnimatedShader } from "./shaders/EagleAnimatedShader";
import { EagleDepthShader } from "./shaders/EagleDepthShader";
import { CameraPositionInterpolator } from "./CameraPositionInterpolator";
import { AMBIENT, BASE_COLORS, CASTLE_INNER_COLORS, CASTLE_OUTER_COLORS, GROUND_COLORS } from "./Colors";
import { WindShader } from "./shaders/WindShader";
import { SPLINE_WALL_INNER_1, SPLINE_WALL_INNER_2, SPLINE_WALL_INNER_3, SPLINE_WALL_INNER_4, SPLINE_WALL_INNER_5, SPLINE_WALL_INNER_6 } from "./Splines";
import { CAMERAS, CAMERA_FOV_COEFFS } from "./Cameras";
import { TimersMap } from "./TimersMap";
import { Timers } from "./TimersEnum";
import { OrbitControls } from "./OrbitControls";
import { FreeMovement } from "./FreeMovement";

const FOV_LANDSCAPE = 35.0;
const FOV_PORTRAIT = 60.0;

const WIND_SEGMENTS = 50;
const WIND_WIDTH = 0.07;
const WIND_COLOR = 0.12;

export class Renderer extends BaseRenderer {
    private lastTime = 0;

    private loaded = false;

    private fmCastleInner = new FullModel();
    private fmCastleOuter = new FullModel();
    private fmGround = new FullModel();
    private fmFlag1 = new FullModel();
    private fmFlag2 = new FullModel();
    private fmFlag3 = new FullModel();
    private fmKnight = new FullModel();
    private fmEagle = new FullModel();

    private textureKnight: WebGLTexture | undefined;
    private textureEagle: WebGLTexture | undefined;

    private shaderDiffuse: DiffuseShader | undefined;

    private shaderObjects: VertexColorSmShader | undefined;
    private shaderObjectsDepth: VertexColorDepthShader | undefined;
    private shaderFlag: FlagSmShader | undefined;
    private shaderFlagDepth: FlagDepthShader | undefined;
    private shaderKnight: KnightAnimatedShader | undefined;
    private shaderKnightDepth: KnightDepthShader | undefined;
    private shaderEagle: EagleAnimatedShader | undefined;
    private shaderEagleDepth: EagleDepthShader | undefined;
    private shaderWind: WindShader | undefined;

    private customCamera: mat4 | undefined;

    private Z_NEAR = 10.0;
    private Z_FAR = 2000.0;

    private FLAGS_PERIOD = 800;
    private WALK_ANIM_SPEED = 2.0;
    private HEAD1_PERIOD = 5000 / this.WALK_ANIM_SPEED;
    private ARM1_PERIOD = 2100 / this.WALK_ANIM_SPEED;
    private ARM2_PERIOD = 2000;
    private STEP1_PERIOD = 2100 / this.WALK_ANIM_SPEED;
    private SPLINE1_PERIOD = 37000;
    private SPLINE2_PERIOD = 11000;
    private SPLINE3_PERIOD = 18000;
    private WINGS_PERIOD = 3000;
    private BIRD_FLIGHT_PERIOD = 22000;
    private WIND_MOVE_PERIOD1 = 2000 + 5000;
    private WIND_MOVE_PERIOD2 = 2500 + 5000;
    private WIND_MOVE_PERIOD3 = 3000 + 5000;
    private FADE_PERIOD = 2500;
    private CAMERA_PERIOD = 34000;

    private timers: TimersMap = new TimersMap();

    private randomWindCoeff1 = Math.random();
    private randomWindCoeff2 = Math.random();
    private randomWindCoeff3 = Math.random();

    private cameraMode = CameraMode.Orbiting;

    protected cameraPosition = vec3.create();
    protected cameraRotation = vec3.create();

    private BIRD_FLIGHT_RADIUS = 150;

    public config = {
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

    private readyCallback: (() => void) | undefined;

    // private lightDir = vec3.create();

    // shadowmaps stuff
    private textureOffscreenColor: WebGLTexture | undefined
    private textureOffscreenDepth: WebGLTexture | undefined;
    private fboOffscreen: FrameBuffer | undefined;

    protected SHADOWMAP_SIZE = 1024 * 2.0; // can be reduced to 1.3 with still OK quality
    protected readonly SHADOWMAP_TEXEL_OFFSET_SCALE = 0.666;
    protected PCF_BIAS_CORRECTION = 1.5 / this.SHADOWMAP_SIZE; // ~1.5 texels

    private mQuadTriangles: Float32Array | undefined;
    private mTriangleVerticesVignette: WebGLBuffer | undefined;

    private mViewMatrixLight = mat4.create();
    private mProjMatrixLight = mat4.create();
    protected pointLight = vec3.create();

    private cameraPositionInterpolator = new CameraPositionInterpolator();
    private readonly CAMERA_SPEED = 1;
    private readonly CAMERA_MIN_DURATION = 11000 / 1;
    private currentRandomCamera = 0;
    private currentLightDirection = 1;

    private tempAmbient = [0, 0, 0, 1];
    private tempDiffuse = [0, 0, 0, 1];
    private tempFog = [0, 0, 0, 1];

    private framesCount = 0;

    protected SCALE = 20;

    protected readonly smallFlags2 = [
        [-6.0000, 2.9000, 0.0000],
        [3.0000, 4.5000, 5.1960],
        [-3.0000, 2.5000, 5.1960],
        [-3.0000, 2.9000, -8.6600]
    ];

    protected readonly smallFlags3 = [
        [-2.0000, 2.9000, -13.856],
        [2.0000, 2.9000, -13.8560],
        [-0.9000, 3.8, -9.3260]
    ];

    protected orbitControls?: OrbitControls;
    protected freeMovement?: FreeMovement;

    constructor() {
        super();
        // vec3.normalize(this.lightDir, [-1, -1, 1]);

        this.cameraPositionInterpolator.speed = this.CAMERA_SPEED;
        this.cameraPositionInterpolator.minDuration = this.CAMERA_MIN_DURATION;
        this.randomizeCamera();
        this.setupTimers();

        document.addEventListener("keypress", event => {
            if (event.key === "1") {
                CAMERAS[0].start = {
                    position: new Float32Array([this.cameraPosition[0], this.cameraPosition[1], this.cameraPosition[2]]),
                    rotation: new Float32Array([this.cameraRotation[0], this.cameraRotation[1], this.cameraRotation[2]]),
                }
                this.logCamera();
            } else if (event.key === "2") {
                CAMERAS[0].end = {
                    position: new Float32Array([this.cameraPosition[0], this.cameraPosition[1], this.cameraPosition[2]]),
                    rotation: new Float32Array([this.cameraRotation[0], this.cameraRotation[1], this.cameraRotation[2]]),
                }
                this.logCamera();
            }
        });
    }

    protected setupTimers(): void {
        this.timers.add(Timers.Flags, this.FLAGS_PERIOD);
        this.timers.add(Timers.HeadAnimation1, this.HEAD1_PERIOD);
        this.timers.add(Timers.ArmsAnimation1, this.ARM1_PERIOD);
        this.timers.add(Timers.ArmsAnimation2, this.ARM2_PERIOD);
        this.timers.add(Timers.Step1, this.STEP1_PERIOD);
        this.timers.add(Timers.Spline1, this.SPLINE1_PERIOD);
        this.timers.add(Timers.Spline2, this.SPLINE2_PERIOD);
        this.timers.add(Timers.Spline3, this.SPLINE3_PERIOD);
        this.timers.add(Timers.Wings, this.WINGS_PERIOD);
        this.timers.add(Timers.BirdsFly, this.BIRD_FLIGHT_PERIOD);
        this.timers.add(Timers.WindMove1, this.WIND_MOVE_PERIOD1);
        this.timers.add(Timers.WindMove2, this.WIND_MOVE_PERIOD2);
        this.timers.add(Timers.WindMove3, this.WIND_MOVE_PERIOD3);
        this.timers.add(Timers.Fade, this.FADE_PERIOD, false);
        this.timers.add(Timers.Camera, this.CAMERA_PERIOD);
    }

    setCustomCamera(camera: mat4 | undefined, position?: vec3, rotation?: vec3) {
        this.customCamera = camera;

        if (position !== undefined) {
            this.cameraPosition = position;
            // console.log(this.cameraPosition);
        }
        if (rotation !== undefined) {
            this.cameraRotation = rotation;
        }
    }

    resetCustomCamera() {
        this.customCamera = undefined;
    }

    onBeforeInit(): void {
    }

    onAfterInit(): void {
        this.orbitControls = new OrbitControls(
            this,
            {
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

        this.freeMovement = new FreeMovement(
            this,
            {
                canvas: this.canvas!,
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
            }
        );

        this.setCameraMode(CameraMode.Orbiting);
    }

    onInitError(): void {
        document.getElementById("canvasGL")?.classList.add("hidden");
        document.getElementById("alertError")?.classList.remove("hidden");
    }

    initShaders(): void {
        this.shaderObjects = new VertexColorSmShader(this.gl);
        this.shaderObjectsDepth = new VertexColorDepthShader(this.gl);
        this.shaderFlag = new FlagSmShader(this.gl);
        this.shaderFlagDepth = new FlagDepthShader(this.gl);
        this.shaderKnight = new KnightAnimatedShader(this.gl);
        this.shaderKnightDepth = new KnightDepthShader(this.gl);
        this.shaderEagle = new EagleAnimatedShader(this.gl);
        this.shaderEagleDepth = new EagleDepthShader(this.gl);
        this.shaderWind = new WindShader(this.gl);
    }

    async loadData(): Promise<void> {
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
        (this.fmKnight as any).bufferIndices = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, (this.fmKnight as any).bufferIndices);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, bufferKnight, this.gl.STATIC_DRAW);
        (this.fmKnight as any).numIndices = bufferKnight.byteLength / 3 / 2;

        const bufferEagle = new Uint16Array(210);
        for (let i = 0; i < 210; i++) {
            bufferEagle[i] = i;
        }
        (this.fmEagle as any).bufferIndices = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, (this.fmEagle as any).bufferIndices);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, bufferEagle, this.gl.STATIC_DRAW);
        (this.fmEagle as any).numIndices = bufferEagle.byteLength / 3 / 2;

        [
            this.textureKnight,
            this.textureEagle
        ] = await Promise.all([
            UncompressedTextureLoader.load(`data/textures/knightRed.png`, this.gl, this.gl.LINEAR, this.gl.LINEAR, false),
            UncompressedTextureLoader.load(`data/textures/eagle.png`, this.gl, this.gl.LINEAR, this.gl.LINEAR, false)
        ]);
        this.generateMipmaps(this.textureKnight, this.textureEagle);

        this.loaded = true;
        // this.timerFade = 0;
        this.timers.set(Timers.Fade, 0);
        console.log("Loaded all assets");

        this.initOffscreen();
        this.initVignette();

        this.readyCallback?.();
    }

    resizeCanvas(): void {
        if (this.canvas === undefined) {
            return;
        }
        super.resizeCanvas();
    }

    animate(): void {
        this.timers.iterate();

        const timeNow = new Date().getTime();

        if (this.lastTime != 0) {
            this.cameraPositionInterpolator.iterate(timeNow);
            if (this.cameraPositionInterpolator.timer === 1.0 && this.cameraMode === CameraMode.Random) {
                this.randomizeCamera();
            }
        }

        this.lastTime = timeNow;
    }

    /** Calculates projection matrix */
    setCameraFOV(multiplier: number): void {
        var ratio;

        if (this.gl.canvas.height > 0) {
            ratio = this.gl.canvas.width / this.gl.canvas.height;
        } else {
            ratio = 1.0;
        }

        let fov = 0;
        if (this.gl.canvas.width >= this.gl.canvas.height) {
            fov = FOV_LANDSCAPE * multiplier;
        } else {
            fov = FOV_PORTRAIT * multiplier;
        }

        this.setFOV(this.mProjMatrix, fov, ratio, this.Z_NEAR, this.Z_FAR);
    }

    /**
     * Calculates camera matrix.
     *
     * @param a Position in [0...1] range
     */
    private positionCamera(a: number) {
        if (this.customCamera !== undefined) {
            mat4.copy(this.mVMatrix, this.customCamera);
            return;
        }

        if (this.cameraMode === CameraMode.Random) {
            mat4.copy(this.mVMatrix, this.cameraPositionInterpolator.matrix);
            this.cameraPosition[0] = this.cameraPositionInterpolator.cameraPosition[0];
            this.cameraPosition[1] = this.cameraPositionInterpolator.cameraPosition[1];
            this.cameraPosition[2] = this.cameraPositionInterpolator.cameraPosition[2];
        }
    }

    private positionCameraLight(a: number) {
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
        // z += Math.sin(a * Math.PI * 24) * 100;

        this.pointLight[0] = x;
        this.pointLight[1] = y;
        this.pointLight[2] = z;
        // this.lightDir[0] = this.pointLight[0];
        // this.lightDir[1] = this.pointLight[1];
        // this.lightDir[2] = this.pointLight[2];

        mat4.lookAt(this.mVMatrix,
            [x, y, z], // eye
            [0, 0, 0], // center
            [0, 0, 1] // up vector
        );
        mat4.copy(this.mViewMatrixLight, this.mVMatrix);
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
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fboOffscreen!.framebufferHandle);
            this.gl.viewport(0, 0, this.fboOffscreen!.width!, this.fboOffscreen!.height!);
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
        this.positionCamera(this.timers.get(Timers.Camera));

        this.drawCastleModels(false);
        this.drawWind();

        // this.drawDepthMap();

        this.framesCount++;
    }

    getLightFov(): number {
        if (this.cameraMode === CameraMode.Random) {
            return this.config.lightFov * CAMERA_FOV_COEFFS[this.currentRandomCamera];
        } else {
            return this.config.lightFov;
        }
    }

    drawDepthMap() {
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.cullFace(this.gl.BACK);
        this.gl.disable(this.gl.BLEND);

        this.shaderDiffuse!.use();

        this.setTexture2D(0, this.textureOffscreenDepth!, this.shaderDiffuse!.sTexture!);
        this.drawVignette(this.shaderDiffuse!);
    }

    protected drawVignette(shader: DiffuseShader) {
        this.unbindBuffers();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.mTriangleVerticesVignette!);

        this.gl.enableVertexAttribArray(shader.rm_Vertex!);
        this.gl.vertexAttribPointer(shader.rm_Vertex!, 3, this.gl.FLOAT, false, 20, 0);
        this.gl.enableVertexAttribArray(shader.rm_TexCoord0!);
        this.gl.vertexAttribPointer(shader.rm_TexCoord0!, 2, this.gl.FLOAT, false, 20, 4 * 3);

        this.gl.uniformMatrix4fv(shader.view_proj_matrix!, false, this.getOrthoMatrix());
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }

    private drawCastleModels(drawToShadowMap: boolean): void {
        if (this.shaderObjects === undefined
            || this.shaderObjectsDepth === undefined
            || this.shaderFlag === undefined
            || this.shaderFlagDepth === undefined
        ) {
            return;
        }

        let shaderObjects: DrawableShader;

        if (drawToShadowMap) {
            shaderObjects = this.shaderObjectsDepth;
            this.shaderObjectsDepth.use();
        } else {
            shaderObjects = this.shaderObjects;
            this.shaderObjects.use();

            const diffuseColor = this.getDiffuseColor();
            const ambientColor = this.getAmbientColor();

            this.gl.uniform4f(this.shaderObjects.lightDir!, this.pointLight[0], this.pointLight[1], this.pointLight[2], 0);
            this.gl.uniform4fv(this.shaderObjects.ambient!, ambientColor);
            this.gl.uniform4fv(this.shaderObjects.diffuse!, diffuseColor);
            this.gl.uniform1f(this.shaderObjects.diffuseCoef!, this.config.diffuseCoeff);
            this.gl.uniform1f(this.shaderObjects.diffuseExponent!, this.config.diffuseExponent);
            this.setFogUniforms(this.shaderObjects);
            this.gl.uniform3f(this.shaderObjects.lightVector!, this.pointLight[0], this.pointLight[1], this.pointLight[2]);
            this.setBaseShadowUniforms(
                this.shaderObjects,
                0, 0, 0,
                0, 0, 0,
                this.SCALE, this.SCALE, this.SCALE
            );
        }

        if (!drawToShadowMap) {
            this.gl.uniform3fv(this.shaderObjects.colors!, CASTLE_INNER_COLORS);
        }
        shaderObjects.drawModel(
            this,
            this.fmCastleInner,
            0, 0, 0, 0, 0, 0, this.SCALE, this.SCALE, this.SCALE
        );
        if (!drawToShadowMap) {
            this.gl.uniform3fv(this.shaderObjects.colors!, CASTLE_OUTER_COLORS);
        }
        shaderObjects.drawModel(
            this,
            this.fmCastleOuter,
            0, 0, 0, 0, 0, 0, this.SCALE, this.SCALE, this.SCALE
        );
        if (!drawToShadowMap) {
            this.gl.uniform3fv(this.shaderObjects.colors!, GROUND_COLORS);
        }
        shaderObjects.drawModel(
            this,
            this.fmGround,
            0, 0, 0, 0, 0, 0, this.SCALE, this.SCALE, this.SCALE
        );

        // flags
        this.drawFlag(drawToShadowMap, this.fmFlag1,
            -40, 0, 251,
            0, 0, 0,
            33, 33, 23,
            0.4, 0.4, 1.0
        );
        this.drawFlag(drawToShadowMap, this.fmFlag1,
            -120, 0, 158,
            0, 0, 0,
            28, 28, 20,
            0.4, 0.4, 1.0
        );
        for (const [x, y, z] of this.smallFlags2) {
            this.drawFlag(drawToShadowMap, this.fmFlag2,
                x * -20, z * -20, y * 20 + 14,
                0, 0, 0,
                18, 20, 10,
                0.85, 0.85, 0.35
            );
        }
        for (const [x, y, z] of this.smallFlags3) {
            this.drawFlag(drawToShadowMap, this.fmFlag3,
                x * -20, z * -20, y * 20 + 14,
                0, 0, 0,
                18, 20, 10,
                0.55, 0.2, 0.55
            );
        }

        this.drawEagles(drawToShadowMap);
        this.drawKnights(drawToShadowMap);
    }

    private drawKnights(drawToShadowMap: boolean): void {
        this.drawWalkingKnight(drawToShadowMap, SPLINE_WALL_INNER_1, this.timers.get(Timers.Spline2), 0);
        this.drawWalkingKnight(drawToShadowMap, SPLINE_WALL_INNER_2, this.timers.get(Timers.Spline3), 0);
        this.drawWalkingKnight(drawToShadowMap, SPLINE_WALL_INNER_3, this.timers.get(Timers.Spline1), 0);
        this.drawWalkingKnight(drawToShadowMap, SPLINE_WALL_INNER_4, this.timers.get(Timers.Spline3), 0);
        this.drawWalkingKnight(drawToShadowMap, SPLINE_WALL_INNER_5, this.timers.get(Timers.Spline3), 0);
        this.drawWalkingKnight(drawToShadowMap, SPLINE_WALL_INNER_6, this.timers.get(Timers.Spline1), 0);
        this.drawWalkingKnight(drawToShadowMap, SPLINE_WALL_INNER_6, this.timers.get(Timers.Spline1) + 0.5, 0);

        this.drawTalkingNearSwordsKnights(drawToShadowMap);
        this.drawKnightRepairingCart(drawToShadowMap);
        this.drawKnightsNearCannons(drawToShadowMap);
        this.drawKnightsAboveEntrance(drawToShadowMap);
    }

    private drawWind(): void {
        if (this.shaderWind === undefined) {
            return;
        }

        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.ONE, this.gl.ONE);
        this.gl.disable(this.gl.CULL_FACE);

        this.shaderWind?.use();
        this.gl.uniform2f(this.shaderWind.dimensions!, (WIND_SEGMENTS - 1) * 2, WIND_WIDTH);
        this.gl.uniform3f(this.shaderWind.amplitudes!, 0.6, 0.4, 1.2);
        this.gl.uniform3f(this.shaderWind.frequencies!, 0.032, 0.05, 0.02);
        this.gl.uniform1f(this.shaderWind.fogStartDistance!, this.fogStartDistance);
        this.gl.uniform1f(this.shaderWind.fogDistance!, this.fogDistance);

        this.drawWindBatch(this.timers.get(Timers.WindMove1), 0.36, this.randomWindCoeff1, 80);
        this.drawWindBatch(this.timers.get(Timers.WindMove2), 0.37, this.randomWindCoeff2, 100);
        this.drawWindBatch(this.timers.get(Timers.WindMove3), 0.38, this.randomWindCoeff3, 170);

        this.gl.disable(this.gl.BLEND);
        this.gl.enable(this.gl.CULL_FACE);
    }

    private drawWindBatch(timerWindMove: number, timerPhase: number, randomWindCoeff: number, height: number): void {
        if (this.shaderWind === undefined) {
            return;
        }

        for (let i = 0; i < 3; i++) {
            const timer = (timerWindMove + i * timerPhase) % 1.0;
            const a = Math.pow(Math.sin(timer * Math.PI), 2);
            const color = WIND_COLOR * a;
            const offsetX = -26 + i * 18 + 18 * randomWindCoeff;
            const offsetY = (timer * 4.4) * WIND_SEGMENTS * 4 / 10;

            this.gl.uniform4f(this.shaderWind.color!, color, color, color, 1);
            this.gl.uniform3f(this.shaderWind.offset!, offsetX, offsetY * 10, 0);
            this.shaderWind.draw(
                this,
                0, -500, height, 0, 0, 0, 10, 1, 10,
                WIND_SEGMENTS
            );
        }
    }

    private getTimeOfDayBaseColor() {
        return BASE_COLORS[this.config.timeOfDay];
    }

    private getTimeOfDayAmbientCoeff() {
        return AMBIENT[this.config.timeOfDay];
    }

    private getAmbientColor() {
        const baseColor = this.getTimeOfDayBaseColor();
        const ambient = this.getTimeOfDayAmbientCoeff();

        this.tempAmbient[0] = ambient * 0.5 + baseColor[0] * 0.5 * ambient;
        this.tempAmbient[1] = ambient * 0.5 + baseColor[1] * 0.5 * ambient;
        this.tempAmbient[2] = ambient * 0.5 + baseColor[2] * 0.5 * ambient;

        return this.tempAmbient;
    }

    private getDiffuseColor() {
        const baseColor = this.getTimeOfDayBaseColor();
        const { diffuse } = this.config;

        this.tempDiffuse[0] = diffuse * 0.5 + baseColor[0] * 0.5;
        this.tempDiffuse[1] = diffuse * 0.5 + baseColor[1] * 0.5;
        this.tempDiffuse[2] = diffuse * 0.5 + baseColor[2] * 0.5;

        return this.tempDiffuse;
    }

    private getFogColor() {
        const baseColor = this.getTimeOfDayBaseColor();
        const { fogColor } = this.config;

        this.tempFog[0] = fogColor[0] * 0.5 + baseColor[0] * 0.5;
        this.tempFog[1] = fogColor[1] * 0.5 + baseColor[1] * 0.5;
        this.tempFog[2] = fogColor[2] * 0.5 + baseColor[2] * 0.5;

        return this.tempFog;
    }

    private drawEagles(drawToShadowMap: boolean): void {
        const angle = this.timers.get(Timers.BirdsFly) * Math.PI * 2;
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

    private drawFlag(
        drawToShadowMap: boolean,
        model: FullModel,
        tx: number, ty: number, tz: number,
        rx: number, ry: number, rz: number,
        sx: number, sy: number, sz: number,
        r: number, g: number, b: number
    ): void {
        if (this.shaderFlag === undefined || this.shaderFlagDepth === undefined) {
            return;
        }

        const diffuseColor = this.getDiffuseColor();
        const ambientColor = this.getAmbientColor();

        let shaderObjects: BaseShader & DrawableShader;

        if (drawToShadowMap) {
            shaderObjects = this.shaderFlagDepth;
            this.shaderFlagDepth.use();

            this.gl.uniform1f(this.shaderFlagDepth.time!, Math.PI * 2 * (1 - this.timers.get(Timers.Flags)));
            this.gl.uniform1f(this.shaderFlagDepth.amplitude!, this.config.flagsAmplitude);
            this.gl.uniform1f(this.shaderFlagDepth.waves!, this.config.flagsWaves);
        } else {
            shaderObjects = this.shaderFlag;
            this.shaderFlag.use();

            this.gl.uniform1f(this.shaderFlag.time!, Math.PI * 2 * (1 - this.timers.get(Timers.Flags)));
            this.gl.uniform1f(this.shaderFlag.amplitude!, this.config.flagsAmplitude);
            this.gl.uniform1f(this.shaderFlag.waves!, this.config.flagsWaves);

            this.gl.uniform4f(this.shaderFlag.lightDir!, this.pointLight[0], this.pointLight[1], this.pointLight[2], 0);
            this.gl.uniform4fv(this.shaderFlag.ambient!, ambientColor);
            this.gl.uniform4fv(this.shaderFlag.diffuse!, diffuseColor);
            this.gl.uniform1f(this.shaderFlag.diffuseCoef!, this.config.diffuseCoeff);
            this.gl.uniform1f(this.shaderFlag.diffuseExponent!, this.config.diffuseExponent);
            this.setFogUniforms(this.shaderFlag);
            this.gl.uniform3f(this.shaderFlag.lightVector!, this.pointLight[0], this.pointLight[1], this.pointLight[2]);
            this.gl.uniform4fv(this.shaderFlag.color!, [r, g, b, 1.0]);

            this.setBaseShadowUniforms(
                this.shaderFlag,
                tx, ty, tz,
                rx, ry, rz,
                sx, sy, sz
            );
        }
        shaderObjects.drawModel(
            this,
            model,
            tx, ty, tz,
            rx, ry, rz,
            sx, sy, sz
        );
    }

    private drawTalkingNearSwordsKnights(drawToShadowMap: boolean): void {
        const headAngle1 = Math.sin(this.timers.get(Timers.HeadAnimation1) * Math.PI * 2) * 0.1 - 0.5;
        const leftArmAngle1 = Math.sin(this.timers.get(Timers.ArmsAnimation2) * Math.PI * 2) * 0.1;
        const rightArmAngle1 = -Math.sin(this.timers.get(Timers.ArmsAnimation2) * Math.PI * 2) * 0.1 + 1.5;
        const headAngle2 = Math.sin(this.timers.get(Timers.HeadAnimation1) * Math.PI * 2 + 1) * 0.1 + 0.4;
        const leftArmAngle2 = Math.sin(this.timers.get(Timers.ArmsAnimation2) * Math.PI * 2) * 0.1;
        const rightArmAngle2 = -Math.sin(this.timers.get(Timers.ArmsAnimation2) * Math.PI * 2) * 0.1 + 1.45;

        this.drawKnight(drawToShadowMap,
            headAngle1, leftArmAngle1, rightArmAngle1,
            -35, 124, 0,
            0,0, 0.15
        );
        this.drawKnight(drawToShadowMap,
            headAngle2, leftArmAngle2, rightArmAngle2,
            -45, 137, 0,
            0,0,1.7
        );
    }

    private drawKnightsNearCannons(drawToShadowMap: boolean): void {
        const headAngle1 = Math.sin(this.timers.get(Timers.ArmsAnimation2) * Math.PI * 2) * 0.07 + 0.9;
        const leftArmAngle1 = Math.sin(this.timers.get(Timers.ArmsAnimation2) * Math.PI * 2) * 0.05 + 0.4;
        const rightArmAngle1 = 1.8;
        const headAngle2 = Math.sin(this.timers.get(Timers.ArmsAnimation2) * Math.PI * 2) * 0.05 - 1.9;
        const leftArmAngle2 = Math.sin(this.timers.get(Timers.ArmsAnimation2) * Math.PI * 2) * 0.08 + 1.9;
        const rightArmAngle2 = Math.sin(this.timers.get(Timers.ArmsAnimation2) * Math.PI * 2 + 1) * 0.08 + 1.9;

        this.drawKnight(drawToShadowMap,
            headAngle1, leftArmAngle1, rightArmAngle1,
            40, 123, 0,
            0, 0, -3.3
        );
        this.drawKnight(drawToShadowMap,
            headAngle2, leftArmAngle2, rightArmAngle2,
            49, 142, 0,
            0, 0, -3
        );
    }

    private drawKnightsAboveEntrance(drawToShadowMap: boolean): void {
        const headAngle1 = Math.sin(this.timers.get(Timers.HeadAnimation1) * Math.PI * 2) * 0.04 + 0.1;
        const leftArmAngle1 = Math.sin(this.timers.get(Timers.ArmsAnimation2) * Math.PI * 2) * 0.09;
        const rightArmAngle1 = Math.sin(this.timers.get(Timers.ArmsAnimation2) * Math.PI * 2 + 1) * 0.09;
        const headAngle2 = Math.sin(this.timers.get(Timers.HeadAnimation1) * Math.PI * 2) * 0.04 - 0.1;
        const leftArmAngle2 = Math.sin(this.timers.get(Timers.ArmsAnimation2) * Math.PI * 2) * 0.09;
        const rightArmAngle2 = Math.sin(this.timers.get(Timers.ArmsAnimation2) * Math.PI * 2 + 1) * 0.09;
        const headAngle3 = Math.sin(this.timers.get(Timers.HeadAnimation1) * Math.PI * 2) * 0.04 - 0.1;
        const leftArmAngle3 = Math.sin(this.timers.get(Timers.ArmsAnimation2) * Math.PI * 2 + 1) * 0.1 + 0.5;
        const rightArmAngle3 = 2.0;

        this.drawKnight(drawToShadowMap,
            headAngle1, leftArmAngle1, rightArmAngle1,
            -30, -102, 20,
            0, 0, 1.6
        );
        this.drawKnight(drawToShadowMap,
            headAngle2, leftArmAngle2, rightArmAngle2,
            30, -102, 20,
            0, 0, 0.6
        );
        this.drawKnight(drawToShadowMap,
            headAngle3, leftArmAngle3, rightArmAngle3,
            83, -65, 20,
            0, 0.13, 2.6
        );
        this.drawKnight(drawToShadowMap,
            headAngle3, rightArmAngle3, leftArmAngle3,
            136, 0, 20,
            0, 0.13, 3.6
        );
    }

    private drawKnightRepairingCart(drawToShadowMap: boolean): void {
        const headAngle1 = Math.sin(this.timers.get(Timers.HeadAnimation1) * Math.PI * 2 + 1.0) * 0.04 + 0.2;
        const leftArmAngle1 = Math.sin(this.timers.get(Timers.ArmsAnimation2) * Math.PI * 2 + 2.0) * 0.3 + 2;
        const rightArmAngle1 = -Math.sin(this.timers.get(Timers.ArmsAnimation2) * Math.PI * 2) * 0.3 + 2;

        this.drawKnight(drawToShadowMap,
            headAngle1, leftArmAngle1, rightArmAngle1,
            -41, 234, 0,
            0.26, 0, 1.1
        );
    }

    private drawWalkingKnight(drawToShadowMap: boolean, spline: Spline3D, timerSpline: number, phase: number): void {
        if (timerSpline > 1) {
            timerSpline = timerSpline - 1;
        }

        const headAngle = Math.sin(this.timers.get(Timers.HeadAnimation1) * Math.PI * 2 + phase) * 0.2;
        const leftArmAngle = Math.sin(this.timers.get(Timers.ArmsAnimation1) * Math.PI * 2 + phase) * 0.5;
        const rightArmAngle = -Math.sin(this.timers.get(Timers.ArmsAnimation1) * Math.PI * 2 + phase) * 0.5;
        const step = Math.abs(Math.sin(this.timers.get(Timers.Step1) * Math.PI * 2 + phase)) * 1.2;
        const p = spline.getCurrentPoint(timerSpline);
        let r = spline.getRotation(timerSpline).z;
        r *= 0.0174533;

        this.drawKnight(
            drawToShadowMap,
            headAngle, leftArmAngle, rightArmAngle,
            p.y, p.x, p.z + step,
            0,0,r
        );
    }

    private drawKnight(
        drawToShadowMap: boolean,
        headAngle: number, leftArmAngle: number, rightArmAngle: number,
        tx: number, ty: number, tz: number,
        rx: number, ry: number, rz: number
    ): void {
        if (this.shaderKnight === undefined || this.shaderKnightDepth === undefined) {
            return;
        }

        const diffuseColor = this.getDiffuseColor();
        const ambientColor = this.getAmbientColor();

        const scaleKnight = 2.0 * 0.8;

        let shaderObjects: BaseShader & DrawableShader;

        if (drawToShadowMap) {
            shaderObjects = this.shaderKnightDepth;
            this.shaderKnightDepth.use();

            this.gl.uniform1f(this.shaderKnightDepth.headRotationZ!, headAngle);
            this.gl.uniform2f(this.shaderKnightDepth.armRotations!, leftArmAngle, rightArmAngle);
        } else {
            shaderObjects = this.shaderKnight;
            this.shaderKnight.use();

            this.gl.uniform4f(this.shaderKnight.lightDir!, this.pointLight[0], this.pointLight[1], this.pointLight[2], 0);
            this.gl.uniform4fv(this.shaderKnight.ambient!, ambientColor);
            this.gl.uniform4fv(this.shaderKnight.diffuse!, diffuseColor);
            this.gl.uniform1f(this.shaderKnight.diffuseCoef!, this.config.diffuseCoeff);
            this.gl.uniform1f(this.shaderKnight.diffuseExponent!, this.config.diffuseExponent);
            this.setFogUniforms(this.shaderKnight);
            this.gl.uniform3f(this.shaderKnight.lightVector!, this.pointLight[0], this.pointLight[1], this.pointLight[2]);
            this.setTexture2D(1, this.textureKnight!, this.shaderKnight.sTexture!);

            this.gl.uniform1f(this.shaderKnight.headRotationZ!, headAngle);
            this.gl.uniform2f(this.shaderKnight.armRotations!, leftArmAngle, rightArmAngle);

            this.setBaseShadowUniforms(
                this.shaderKnight,
                tx, ty, tz,
                rx, ry, rz,
                scaleKnight, scaleKnight, scaleKnight
            );
        }
        shaderObjects.drawModel(
            this,
            this.fmKnight,
            tx, ty, tz,
            rx, ry, rz,
            scaleKnight, scaleKnight, scaleKnight
        );
    }

    private getBirdPosition(angle: number, centerX: number, centerY: number): { x: number, y: number } {
        const x = Math.sin(angle) * this.BIRD_FLIGHT_RADIUS + centerX;
        const y = Math.cos(angle) * this.BIRD_FLIGHT_RADIUS + centerY;

        return { x, y };
    }

    private drawEagle(
        drawToShadowMap: boolean,
        phase: number,
        tx: number, ty: number, tz: number,
        rx: number, ry: number, rz: number
    ): void {
        if (this.shaderEagle === undefined || this.shaderEagleDepth === undefined) {
            return;
        }

        const diffuseColor = this.getDiffuseColor();
        const ambientColor = this.getAmbientColor();

        const scaleEagle = 0.13;

        let shaderObjects: BaseShader & DrawableShader;

        const wingsRotation = Math.sin(this.timers.get(Timers.Wings) * Math.PI * 2 + phase) * 0.4;

        if (drawToShadowMap) {
            shaderObjects = this.shaderEagleDepth;
            this.shaderEagleDepth.use();

            this.gl.uniform1f(this.shaderEagleDepth.wingsRotation!, wingsRotation);
        } else {
            shaderObjects = this.shaderEagle;
            this.shaderEagle.use();

            this.gl.uniform4f(this.shaderEagle.lightDir!, this.pointLight[0], this.pointLight[1], this.pointLight[2], 0);
            this.gl.uniform4fv(this.shaderEagle.ambient!, ambientColor);
            this.gl.uniform4fv(this.shaderEagle.diffuse!, diffuseColor);
            this.gl.uniform1f(this.shaderEagle.diffuseCoef!, this.config.diffuseCoeff);
            this.gl.uniform1f(this.shaderEagle.diffuseExponent!, this.config.diffuseExponent);
            this.setFogUniforms(this.shaderEagle);
            this.gl.uniform3f(this.shaderEagle.lightVector!, this.pointLight[0], this.pointLight[1], this.pointLight[2]);
            this.gl.uniform1f(this.shaderEagle.wingsRotation!, wingsRotation);
            this.setTexture2D(1, this.textureEagle!, this.shaderEagle.sTexture!);

            this.setBaseShadowUniforms(
                this.shaderEagle,
                tx, ty, tz,
                rx, ry, rz,
                scaleEagle, scaleEagle, scaleEagle
            );
        }
        shaderObjects.drawModel(
            this,
            this.fmEagle,
            tx, ty, tz,
            rx, ry, rz,
            scaleEagle, scaleEagle, scaleEagle
        );
    }

    private get fogStartDistance() {
        return this.config.fogStartDistance * this.timers.get(Timers.Fade);
    }

    private get fogDistance() {
        return this.config.fogDistance * this.timers.get(Timers.Fade);
    }

    private setFogUniforms(shader: IFogShader) {
        const fogColor = this.getFogColor();
        this.gl.uniform4fv(shader.fogColor!, fogColor);
        this.gl.uniform1f(shader.fogStartDistance!, this.fogStartDistance);
        this.gl.uniform1f(shader.fogDistance!, this.fogDistance);
    }

    protected setBaseShadowUniforms(shader: IShadowShader,
        tx: number, ty: number, tz: number,
        rx: number, ry: number, rz: number,
        sx: number, sy: number, sz: number
    ): void {
        this.setTexture2D(0, this.textureOffscreenDepth!, shader.sDepth!);
        this.gl.uniform1f(shader.texelSize!, 1.0 / this.SHADOWMAP_SIZE * this.SHADOWMAP_TEXEL_OFFSET_SCALE);
        this.gl.uniformMatrix4fv(shader.projectionMatrix!, false, this.mProjMatrixLight);
        this.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);
        this.gl.uniformMatrix4fv(shader.modelMatrix!, false, this.mMMatrix);
        this.gl.uniformMatrix4fv(shader.lightMatrix!, false, this.mViewMatrixLight, 0);
        // this.gl.uniform1f(shader.shadowBrightnessVS!, this.config.shadowBrightness);
        this.gl.uniform1f(shader.shadowBrightnessFS!, this.config.shadowBrightness);
        this.gl.uniform1f(shader.pcfBiasCorrection!, this.PCF_BIAS_CORRECTION);
    }

    public setCameraMode(mode: CameraMode): void {
        if (mode === CameraMode.Orbiting) {
            this.orbitControls?.enable();
            this.freeMovement?.disable();
        } else if (mode === CameraMode.FPS) {
            this.freeMovement?.updatePosition([0, -400, 150]);
            this.freeMovement?.updateRotation([0.39, 0, 0]);
            this.orbitControls?.disable();
            this.freeMovement?.enable();
        } else {
            this.orbitControls?.disable();
            this.freeMovement?.disable();
        }

        this.cameraMode = mode;
    }

    public get currentCameraMode() {
        return this.cameraMode;
    }

    public checkGlError(operation: string): void {
        // Do nothing in production build.
    }

    public set ready(callback: () => void) {
        this.readyCallback = callback;
    }

    public getProjMatrix() {
        return this.mProjMatrix;
    }

    public getCameraPosition() {
        return this.cameraPosition;
    }

    public getCanvas() {
        return this.canvas;
    }

    protected createDepthTexture(gl: WebGL2RenderingContext, texWidth: number, texHeight: number) {
        const textureID = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, textureID);

        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);

        const version: string = gl.getParameter(gl.VERSION) || "";

        const glFormat = gl.DEPTH_COMPONENT;
        const glInternalFormat = version.includes("WebGL 2")
            ? gl.DEPTH_COMPONENT16
            : gl.DEPTH_COMPONENT;
        const type = gl.UNSIGNED_SHORT;

        // In WebGL, we cannot pass array to depth texture.
        gl.texImage2D(gl.TEXTURE_2D, 0, glInternalFormat, texWidth, texHeight, 0, glFormat, type, null);

        return textureID;
    }

    protected initOffscreen() {
        if (this.textureOffscreenDepth !== undefined) {
            this.gl.deleteTexture(this.textureOffscreenDepth);
        }
        if (this.textureOffscreenColor !== undefined) {
            this.gl.deleteTexture(this.textureOffscreenColor);
        }

        this.textureOffscreenColor = TextureUtils.createNpotTexture(this.gl, this.SHADOWMAP_SIZE, this.SHADOWMAP_SIZE, false)!;
        this.checkGlError("color");
        this.textureOffscreenDepth = this.createDepthTexture(this.gl as WebGL2RenderingContext, this.SHADOWMAP_SIZE, this.SHADOWMAP_SIZE)!;
        this.checkGlError("depth");
        this.fboOffscreen = new FrameBuffer(this.gl);
        this.fboOffscreen.textureHandle = this.textureOffscreenColor;
        this.fboOffscreen.depthTextureHandle = this.textureOffscreenDepth;
        this.fboOffscreen.width = this.SHADOWMAP_SIZE;
        this.fboOffscreen.height = this.SHADOWMAP_SIZE;
        this.fboOffscreen.createGLData(this.SHADOWMAP_SIZE, this.SHADOWMAP_SIZE);
        this.checkGlError("offscreen FBO");

        console.log("Initialized offscreen FBO.");
    }

    private initVignette() {
        mat4.ortho(this.matOrtho, -1, 1, -1, 1, 2.0, 250);

        this.mQuadTriangles = new Float32Array([
            // X, Y, Z, U, V
            -1.0, -1.0, -5.0, 0.0, 0.0, // 0. left-bottom
            1.0, -1.0, -5.0, 1.0, 0.0, // 1. right-bottom
            -1.0, 1.0, -5.0, 0.0, 1.0, // 2. left-top
            1.0, 1.0, -5.0, 1.0, 1.0, // 3. right-top
        ]);
        this.mTriangleVerticesVignette = this.gl.createBuffer()!;
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.mTriangleVerticesVignette);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.mQuadTriangles, this.gl.STATIC_DRAW);
    }

    private logCamera() {
        const camera = CAMERAS[0];
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

    private randomizeCamera(): void {
        this.currentRandomCamera = (this.currentRandomCamera + 1 + Math.trunc(Math.random() * (CAMERAS.length - 2))) % CAMERAS.length;
        // this.currentRandomCamera = 0; // FIXME

        this.cameraPositionInterpolator.speed = this.CAMERA_SPEED * CAMERAS[this.currentRandomCamera].speedMultiplier;
        this.cameraPositionInterpolator.position = CAMERAS[this.currentRandomCamera];
        this.cameraPositionInterpolator.reset();

        this.currentLightDirection = Math.random() * Math.PI * 2;

        this.randomWindCoeff1 = Math.random();
        this.randomWindCoeff2 = Math.random();
        this.randomWindCoeff3 = Math.random();
    }

    public updateShadowResolution(scale: number): void {
        this.SHADOWMAP_SIZE = 1024 * scale;
        this.PCF_BIAS_CORRECTION = 1.5 / this.SHADOWMAP_SIZE;
        this.initOffscreen();
    }
}
