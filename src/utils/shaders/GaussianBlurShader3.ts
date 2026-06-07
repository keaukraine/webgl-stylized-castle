import { GaussianBlurShader } from "./GaussianBlurShader";

/**
 * Gaussian blur shader.
 * Uses blur radius of 3 pixels.
 */
export class GaussianBlurShader3 extends GaussianBlurShader {
    protected getKernel(): string {
        return `const int SAMPLE_COUNT = 4;
const float OFFSETS[4] = float[4](
    -2.431625915613778,
    -0.4862426846689484,
    1.4588111840004858,
    3.
);
const float WEIGHTS[4] = float[4](
    0.24696196374528634,
    0.34050702333458593,
    0.30593582919679174,
    0.10659518372333592
);`;
    }
}
