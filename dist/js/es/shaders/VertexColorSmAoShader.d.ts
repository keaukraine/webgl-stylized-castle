import { DrawableShader } from "webgl-framework/dist/types/DrawableShader";
import { IShadowShader } from "./IShadowShader";
import { IFogShader } from "./FogChunks";
import { VertexColorSmShader } from "./VertexColorSmShader";
/**
 * Uses indexed vertex colors.
 * Applies shadow map and Lambertian lighting.
 */
export declare class VertexColorSmAoShader extends VertexColorSmShader implements DrawableShader, IShadowShader, IFogShader {
    aoTexture: WebGLUniformLocation | undefined;
    inverseAoTexSize: WebGLUniformLocation | undefined;
    fillCode(): void;
    fillUniformsAttributes(): void;
}
