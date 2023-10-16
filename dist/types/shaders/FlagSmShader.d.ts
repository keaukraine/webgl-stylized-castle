import { DrawableShader } from "webgl-framework/dist/types/DrawableShader";
import { IShadowShader } from "./IShadowShader";
import { IFogShader } from "./FogChunks";
import { BaseShader, FullModel } from "webgl-framework";
import { RendererWithExposedMethods } from "webgl-framework/dist/types/RendererWithExposedMethods";
export interface IFlagShader {
    time: WebGLUniformLocation | undefined;
    amplitude: WebGLUniformLocation | undefined;
    waves: WebGLUniformLocation | undefined;
}
/**
 * Uses indexed vertex colors.
 * Applies shadow map and Lambertian lighting.
 */
export declare class FlagSmShader extends BaseShader implements DrawableShader, IShadowShader, IFogShader, IFlagShader {
    view_proj_matrix: WebGLUniformLocation | undefined;
    view_matrix: WebGLUniformLocation | undefined;
    model_matrix: WebGLUniformLocation | undefined;
    ambient: WebGLUniformLocation | undefined;
    diffuse: WebGLUniformLocation | undefined;
    lightDir: WebGLUniformLocation | undefined;
    diffuseCoef: WebGLUniformLocation | undefined;
    diffuseExponent: WebGLUniformLocation | undefined;
    color: WebGLUniformLocation | undefined;
    time: WebGLUniformLocation | undefined;
    amplitude: WebGLUniformLocation | undefined;
    waves: WebGLUniformLocation | undefined;
    rm_Vertex: number | undefined;
    rm_Normal: number | undefined;
    /** Depth sampler */
    sDepth: WebGLUniformLocation | undefined;
    projectionMatrix: WebGLUniformLocation | undefined;
    modelMatrix: WebGLUniformLocation | undefined;
    /** Ligth matrix */
    lightMatrix: WebGLUniformLocation | undefined;
    texelSize: WebGLUniformLocation | undefined;
    lightVector: WebGLUniformLocation | undefined;
    shadowBrightnessVS: WebGLUniformLocation | undefined;
    shadowBrightnessFS: WebGLUniformLocation | undefined;
    pcfBiasCorrection: WebGLUniformLocation | undefined;
    fogStartDistance: WebGLUniformLocation | undefined;
    fogDistance: WebGLUniformLocation | undefined;
    fogColor: WebGLUniformLocation | undefined;
    fillCode(): void;
    fillUniformsAttributes(): void;
    /** @inheritdoc */
    drawModel(renderer: RendererWithExposedMethods, model: FullModel, tx: number, ty: number, tz: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number): void;
}
