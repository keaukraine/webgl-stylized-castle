import { GaussianBlurShader } from "./GaussianBlurShader";

/**
 * Gaussian blur shader.
 * Uses blur radius of 2 pixels.
 */
export class GaussianBlurShader1 extends GaussianBlurShader {
    protected getKernel(): string {
        return `const int SAMPLE_COUNT = 2;
const float OFFSETS[2] = float[2](
    -0.4862426846689484,
    1.0
);
const float WEIGHTS[2] = float[2](
    0.6728376262607099,
    0.32716237373929014
);`;
    }
}
