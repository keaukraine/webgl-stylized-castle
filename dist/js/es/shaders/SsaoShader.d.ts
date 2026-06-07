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
    radius: WebGLUniformLocation | undefined;
    depthRange: WebGLUniformLocation | undefined;
    bias: WebGLUniformLocation | undefined;
    intensity: WebGLUniformLocation | undefined;
    rm_Vertex: number | undefined;
    rm_TexCoord0: number | undefined;
    fillCode(): void;
    fillUniformsAttributes(): void;
}
