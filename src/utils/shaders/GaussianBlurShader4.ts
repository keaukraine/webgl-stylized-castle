import { GaussianBlurShader } from "./GaussianBlurShader";

/**
 * Gaussian blur shader.
 * Uses blur radius of 4 pixels.
 */
export class GaussianBlurShader4 extends GaussianBlurShader {
    protected getKernel(): string {
        return `const int SAMPLE_COUNT = 5;
const float OFFSETS[5] = float[5](
    -3.4048471718931532,
    -1.4588111840004858,
    0.48624268466894843,
    2.431625915613778,
    4.
);
const float WEIGHTS[5] = float[5](
    0.15642123799829394,
    0.26718801880015064,
    0.29738065394682034,
    0.21568339342709997,
    0.06332669582763516
);`
    }
}
