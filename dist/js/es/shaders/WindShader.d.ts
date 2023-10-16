import { BaseShader } from "webgl-framework";
import { RendererWithExposedMethods } from "webgl-framework/dist/types/RendererWithExposedMethods";
export declare class WindShader extends BaseShader {
    view_proj_matrix: WebGLUniformLocation | undefined;
    color: WebGLUniformLocation | undefined;
    offset: WebGLUniformLocation | undefined;
    dimensions: WebGLUniformLocation | undefined;
    amplitudes: WebGLUniformLocation | undefined;
    frequencies: WebGLUniformLocation | undefined;
    fogDistance: WebGLUniformLocation | undefined;
    fogStartDistance: WebGLUniformLocation | undefined;
    fillCode(): void;
    fillUniformsAttributes(): void;
    draw(renderer: RendererWithExposedMethods, tx: number, ty: number, tz: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number, segments: number): void;
}
