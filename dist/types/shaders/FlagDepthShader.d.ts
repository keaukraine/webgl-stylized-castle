import { DrawableShader } from "webgl-framework/dist/types/DrawableShader";
import { BaseShader, FullModel } from "webgl-framework";
import { RendererWithExposedMethods } from "webgl-framework/dist/types/RendererWithExposedMethods";
import { IFlagShader } from "./FlagSmShader";
/**
 * Uses the same strides as FlagSmShader.
 * Draws to depth map.
 */
export declare class FlagDepthShader extends BaseShader implements DrawableShader, IFlagShader {
    view_proj_matrix: WebGLUniformLocation | undefined;
    time: WebGLUniformLocation | undefined;
    amplitude: WebGLUniformLocation | undefined;
    waves: WebGLUniformLocation | undefined;
    rm_Vertex: number | undefined;
    fillCode(): void;
    fillUniformsAttributes(): void;
    /** @inheritdoc */
    drawModel(renderer: RendererWithExposedMethods, model: FullModel, tx: number, ty: number, tz: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number): void;
}
