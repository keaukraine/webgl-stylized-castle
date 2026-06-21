import { BoxBlurShader5 } from "./BoxBlurShader5";
/**
 * Edge-aware box blur shader.
 * Same as {@link BoxBlurShader5}, but uses a cheaper 3-tap kernel (radius of 1 pixel).
 */
export declare class BoxBlurShader3 extends BoxBlurShader5 {
    protected getKernel(): string;
}
