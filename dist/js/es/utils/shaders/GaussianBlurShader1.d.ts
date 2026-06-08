import { GaussianBlurShader } from "./GaussianBlurShader";
/**
 * Gaussian blur shader.
 * Uses blur radius of 2 pixels.
 */
export declare class GaussianBlurShader1 extends GaussianBlurShader {
    protected getKernel(): string;
}
