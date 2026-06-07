import { GaussianBlurShader } from "./GaussianBlurShader";
/**
 * Gaussian blur shader.
 * Uses blur radius of 4 pixels.
 */
export declare class GaussianBlurShader4 extends GaussianBlurShader {
    protected getKernel(): string;
}
