import { BilateralBlurShader5 } from "./BilateralBlurShader5";

/**
 * Fast cross-bilateral blur shader.
 * Same as {@link BilateralBlurShader5}, but uses a cheaper 3-tap kernel (radius of 1 pixel).
 */
export class BilateralBlurShader3 extends BilateralBlurShader5 {
    protected getKernel(): string {
        return `const int SAMPLE_COUNT = 3;
const float OFFSETS[3] = float[3](-1.0, 0.0, 1.0);
const float WEIGHTS[3] = float[3](
    0.25,
    0.5,
    0.25
);`;
    }
}
