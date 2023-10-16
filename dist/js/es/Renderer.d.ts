import { BaseRenderer, DiffuseShader } from "webgl-framework";
import { mat4, vec3 } from "gl-matrix";
import { CameraMode } from "./CameraMode";
import { IShadowShader } from "./shaders/IShadowShader";
import { OrbitControls } from "./OrbitControls";
import { FreeMovement } from "./FreeMovement";
export declare class Renderer extends BaseRenderer {
    private lastTime;
    private loaded;
    private fmCastleInner;
    private fmCastleOuter;
    private fmGround;
    private fmFlag1;
    private fmFlag2;
    private fmFlag3;
    private fmKnight;
    private fmEagle;
    private textureKnight;
    private textureEagle;
    private shaderDiffuse;
    private shaderObjects;
    private shaderObjectsDepth;
    private shaderFlag;
    private shaderFlagDepth;
    private shaderKnight;
    private shaderKnightDepth;
    private shaderEagle;
    private shaderEagleDepth;
    private shaderWind;
    private customCamera;
    private Z_NEAR;
    private Z_FAR;
    private FLAGS_PERIOD;
    private WALK_ANIM_SPEED;
    private HEAD1_PERIOD;
    private ARM1_PERIOD;
    private ARM2_PERIOD;
    private STEP1_PERIOD;
    private SPLINE1_PERIOD;
    private SPLINE2_PERIOD;
    private SPLINE3_PERIOD;
    private WINGS_PERIOD;
    private BIRD_FLIGHT_PERIOD;
    private WIND_MOVE_PERIOD1;
    private WIND_MOVE_PERIOD2;
    private WIND_MOVE_PERIOD3;
    private FADE_PERIOD;
    private CAMERA_PERIOD;
    private timers;
    private randomWindCoeff1;
    private randomWindCoeff2;
    private randomWindCoeff3;
    private cameraMode;
    protected cameraPosition: vec3;
    protected cameraRotation: vec3;
    private BIRD_FLIGHT_RADIUS;
    config: {
        ambient: number;
        diffuse: number;
        diffuseCoeff: number;
        diffuseExponent: number;
        shadowBrightness: number;
        flagsAmplitude: number;
        flagsWaves: number;
        lightDistanceLow: number;
        lightHeightLow: number;
        lightDistance: number;
        lightHeight: number;
        lightNear: number;
        lightFar: number;
        lightFov: number;
        fogColor: number[];
        fogStartDistance: number;
        fogDistance: number;
        timeOfDay: number;
        shadowResolution: number;
    };
    private readyCallback;
    private textureOffscreenColor;
    private textureOffscreenDepth;
    private fboOffscreen;
    protected SHADOWMAP_SIZE: number;
    protected readonly SHADOWMAP_TEXEL_OFFSET_SCALE = 0.666;
    protected PCF_BIAS_CORRECTION: number;
    private mQuadTriangles;
    private mTriangleVerticesVignette;
    private mViewMatrixLight;
    private mProjMatrixLight;
    protected pointLight: vec3;
    private cameraPositionInterpolator;
    private readonly CAMERA_SPEED;
    private readonly CAMERA_MIN_DURATION;
    private currentRandomCamera;
    private currentLightDirection;
    private tempAmbient;
    private tempDiffuse;
    private tempFog;
    private framesCount;
    protected SCALE: number;
    protected readonly smallFlags2: number[][];
    protected readonly smallFlags3: number[][];
    protected orbitControls?: OrbitControls;
    protected freeMovement?: FreeMovement;
    constructor();
    protected setupTimers(): void;
    setCustomCamera(camera: mat4 | undefined, position?: vec3, rotation?: vec3): void;
    resetCustomCamera(): void;
    onBeforeInit(): void;
    onAfterInit(): void;
    onInitError(): void;
    initShaders(): void;
    loadData(): Promise<void>;
    resizeCanvas(): void;
    animate(): void;
    /** Calculates projection matrix */
    setCameraFOV(multiplier: number): void;
    /**
     * Calculates camera matrix.
     *
     * @param a Position in [0...1] range
     */
    private positionCamera;
    private positionCameraLight;
    /** Issues actual draw calls */
    drawScene(): void;
    getLightFov(): number;
    drawDepthMap(): void;
    protected drawVignette(shader: DiffuseShader): void;
    private drawCastleModels;
    private drawKnights;
    private drawWind;
    private drawWindBatch;
    private getTimeOfDayBaseColor;
    private getTimeOfDayAmbientCoeff;
    private getAmbientColor;
    private getDiffuseColor;
    private getFogColor;
    private drawEagles;
    private drawFlag;
    private drawTalkingNearSwordsKnights;
    private drawKnightsNearCannons;
    private drawKnightsAboveEntrance;
    private drawKnightRepairingCart;
    private drawWalkingKnight;
    private drawKnight;
    private getBirdPosition;
    private drawEagle;
    private get fogStartDistance();
    private get fogDistance();
    private setFogUniforms;
    protected setBaseShadowUniforms(shader: IShadowShader, tx: number, ty: number, tz: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number): void;
    setCameraMode(mode: CameraMode): void;
    get currentCameraMode(): CameraMode;
    checkGlError(operation: string): void;
    set ready(callback: () => void);
    getProjMatrix(): mat4;
    getCameraPosition(): vec3;
    getCanvas(): HTMLCanvasElement | undefined;
    protected createDepthTexture(gl: WebGL2RenderingContext, texWidth: number, texHeight: number): WebGLTexture | null;
    protected initOffscreen(): void;
    private initVignette;
    private logCamera;
    private randomizeCamera;
    updateShadowResolution(scale: number): void;
}