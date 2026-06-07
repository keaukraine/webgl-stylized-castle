import { BaseShader } from "webgl-framework";
/**
 * Gaussian blur shader.
 * Uses default blur radius of 5 pixels.
 */
export declare class GaussianBlurShader extends BaseShader {
    view_proj_matrix: WebGLUniformLocation | undefined;
    sTexture: WebGLUniformLocation | undefined;
    brightness: WebGLUniformLocation | undefined;
    direction: WebGLUniformLocation | undefined;
    rm_Vertex: number | undefined;
    rm_TexCoord0: number | undefined;
    protected getKernel(): string;
    /** @inheritdoc */
    fillCode(): void;
    /** @inheritdoc */
    fillUniformsAttributes(): void;
}
