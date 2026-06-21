import { BoxBlurShader5 } from "./BoxBlurShader5";

/**
 * Edge-aware box blur shader.
 * Same as {@link BoxBlurShader5}, but uses a cheaper 3-tap kernel (radius of 1 pixel).
 */
export class BoxBlurShader3 extends BoxBlurShader5 {
    protected getKernel(): string {
        return `const int SAMPLE_COUNT = 3;
const float OFFSETS[3] = float[3](-1.0, 0.0, 1.0);
const float BOX_WEIGHT = 1.0 / 3.0;`;
    }
}
