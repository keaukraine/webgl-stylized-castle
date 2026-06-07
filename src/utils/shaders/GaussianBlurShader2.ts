import { GaussianBlurShader } from "./GaussianBlurShader";

/**
 * Gaussian blur shader.
 * Uses blur radius of 3 pixels.
 */
export class GaussianBlurShader2 extends GaussianBlurShader {
    protected getKernel(): string {
        return `const int SAMPLE_COUNT = 3;
const float OFFSETS[3] = float[3](
    -1.4588111840004858,
    0.48624268466894843,
    2.
);
const float WEIGHTS[3] = float[3](
    0.38883081312055,
    0.43276926113573877,
    0.17839992574371122
);`;
    }
}
