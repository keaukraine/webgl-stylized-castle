import { GaussianBlurShader } from "./GaussianBlurShader";
/**
 * Fast cross-bilateral blur shader.
 * Blurs sTexture like a regular separable Gaussian blur, but additionally weighs each tap
 * by how close its depth (sampled from sDepth) is to the center pixel's depth. This keeps
 * the blur from mixing samples across depth discontinuities (e.g. AO bleeding/haloing
 * across silhouette edges).
 * Uses a 5-tap kernel (radius of 2 pixels).
 */
export declare class BilateralBlurShader5 extends GaussianBlurShader {
    sDepth: WebGLUniformLocation | undefined;
    depthSharpness: WebGLUniformLocation | undefined;
    protected getKernel(): string;
    /** @inheritdoc */
    fillCode(): void;
    /** @inheritdoc */
    fillUniformsAttributes(): void;
}
