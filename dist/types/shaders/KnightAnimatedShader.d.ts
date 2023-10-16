import { DrawableShader } from "webgl-framework/dist/types/DrawableShader";
import { IFogShader } from "./FogChunks";
import { BaseShader, FullModel } from "webgl-framework";
import { RendererWithExposedMethods } from "webgl-framework/dist/types/RendererWithExposedMethods";
/**
 * Procedurally animated knight character.
 */
export declare class KnightAnimatedShader extends BaseShader implements DrawableShader, IFogShader {
    view_proj_matrix: WebGLUniformLocation | undefined;
    view_matrix: WebGLUniformLocation | undefined;
    model_matrix: WebGLUniformLocation | undefined;
    ambient: WebGLUniformLocation | undefined;
    diffuse: WebGLUniformLocation | undefined;
    lightDir: WebGLUniformLocation | undefined;
    diffuseCoef: WebGLUniformLocation | undefined;
    diffuseExponent: WebGLUniformLocation | undefined;
    sTexture: WebGLUniformLocation | undefined;
    headRotationZ: WebGLUniformLocation | undefined;
    armRotations: WebGLUniformLocation | undefined;
    rm_Vertex: number | undefined;
    rm_Normal: number | undefined;
    rm_TexCoord: number | undefined;
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
    static readonly UNIFORMS_CONSTANTS = "\n    uniform float headRotationZ;\n    uniform vec2 armRotations; // x - left arm, y - right arm\n    const float ARM_PIVOT = -2.25;\n    ";
    fillCode(): void;
    fillUniformsAttributes(): void;
    /** @inheritdoc */
    drawModel(renderer: RendererWithExposedMethods, model: FullModel, tx: number, ty: number, tz: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number): void;
}
