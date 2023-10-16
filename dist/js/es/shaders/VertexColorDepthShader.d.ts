import { DrawableShader } from "webgl-framework/dist/types/DrawableShader";
import { BaseShader, FullModel } from "webgl-framework";
import { RendererWithExposedMethods } from "webgl-framework/dist/types/RendererWithExposedMethods";
/**
 * Uses the same strides as VertexColorSmShader.
 * Draws to depth map.
 */
export declare class VertexColorDepthShader extends BaseShader implements DrawableShader {
    view_proj_matrix: WebGLUniformLocation | undefined;
    rm_Vertex: number | undefined;
    fillCode(): void;
    fillUniformsAttributes(): void;
    /** @inheritdoc */
    drawModel(renderer: RendererWithExposedMethods, model: FullModel, tx: number, ty: number, tz: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number): void;
}
