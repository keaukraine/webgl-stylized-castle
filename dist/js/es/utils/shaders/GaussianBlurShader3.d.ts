import { GaussianBlurShader } from "./GaussianBlurShader";
/**
 * Gaussian blur shader.
 * Uses blur radius of 3 pixels.
 */
export declare class GaussianBlurShader3 extends GaussianBlurShader {
    protected getKernel(): string;
}
