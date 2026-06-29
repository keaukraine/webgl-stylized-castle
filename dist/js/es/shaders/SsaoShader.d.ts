import { BaseShader } from "webgl-framework";
/**
 * Screen-space ambient occlusion estimated from a depth-only buffer (no normals available).
 *
 * Reconstructs view-space position from the depth buffer + inverse projection matrix, derives an
 * approximate surface normal from screen-space position derivatives, and performs a horizon/hemisphere
 * test in true 3D space. Working in 3D (rather than comparing raw or linearized depth values directly)
 * avoids depth-precision banding artifacts on sloped surfaces, since the comparison is naturally
 * scale- and precision-invariant.
 */
export declare class SsaoShader extends BaseShader {
    view_proj_matrix: WebGLUniformLocation | undefined;
    sDepth: WebGLUniformLocation | undefined;
    invProjMatrix: WebGLUniformLocation | undefined;
    texelSize: WebGLUniformLocation | undefined;
    radiusTexelSize: WebGLUniformLocation | undefined;
    depthRange: WebGLUniformLocation | undefined;
    bias: WebGLUniformLocation | undefined;
    intensity: WebGLUniformLocation | undefined;
    sampleOffsets: WebGLUniformLocation | undefined;
    rm_Vertex: number | undefined;
    rm_TexCoord0: number | undefined;
    private static readonly SAMPLES;
    private static readonly GOLDEN_ANGLE;
    private static sampleOffsetsBuffer;
    get precomputedSampleOffsets(): Float32Array;
    /**
     * Precomputes the spiral sampling offsets (direction * distance) used by the SSAO loop.
     * These depend only on the sample index, so they're identical for every fragment - the Mali
     * offline compiler flags the in-shader cos/sin/sqrt version as "uniform computation" (ALU work
     * that's wastefully repeated per-fragment instead of being supplied as a uniform).
     */
    private static computeSampleOffsets;
    fillCode(): void;
    fillUniformsAttributes(): void;
}
