import { BilateralBlurShader5 } from "./BilateralBlurShader5";
/**
 * Fast cross-bilateral blur shader.
 * Same as {@link BilateralBlurShader5}, but uses a cheaper 3-tap kernel (radius of 1 pixel).
 */
export declare class BilateralBlurShader3 extends BilateralBlurShader5 {
    protected getKernel(): string;
}
