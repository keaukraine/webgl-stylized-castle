import { GaussianBlurShader } from "./GaussianBlurShader";
/**
 * Edge-aware box blur shader.
 * Averages sTexture with uniform (box) spatial weights, but completely drops taps whose
 * linearized depth (sampled from sDepth) differs from the center pixel's by more than a
 * threshold derived from depthSharpness, instead of weighing them down smoothly.
 * Cheaper per-tap than {@link BilateralBlurShader5} (a compare instead of a squared falloff),
 * at the cost of a harder, more visible cutoff at depth edges.
 * Uses a 5-tap kernel (radius of 2 pixels).
 */
export declare class BoxBlurShader5 extends GaussianBlurShader {
    sDepth: WebGLUniformLocation | undefined;
    depthSharpness: WebGLUniformLocation | undefined;
    cameraNearFar: WebGLUniformLocation | undefined;
    protected getKernel(): string;
    /** @inheritdoc */
    fillCode(): void;
    /** @inheritdoc */
    fillUniformsAttributes(): void;
}
