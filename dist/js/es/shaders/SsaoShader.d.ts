import { BaseShader } from "webgl-framework";
/**
 * Screen-space ambient occlusion estimated from a depth-only buffer (no normals available).
 * Samples the depth around each texel in a rotated spiral pattern and accumulates occlusion
 * from neighbours that are noticeably closer to the camera than the shaded texel.
 */
export declare class SsaoShader extends BaseShader {
    view_proj_matrix: WebGLUniformLocation | undefined;
    sDepth: WebGLUniformLocation | undefined;
    texelSize: WebGLUniformLocation | undefined;
    zNear: WebGLUniformLocation | undefined;
    zFar: WebGLUniformLocation | undefined;
    radius: WebGLUniformLocation | undefined;
    depthRange: WebGLUniformLocation | undefined;
    bias: WebGLUniformLocation | undefined;
    intensity: WebGLUniformLocation | undefined;
    rm_Vertex: number | undefined;
    rm_TexCoord0: number | undefined;
    fillCode(): void;
    fillUniformsAttributes(): void;
}
