import { DrawableShader } from "webgl-framework/dist/types/DrawableShader";
import { IFogShader } from "./FogChunks";
import { KnightAnimatedShader } from "./KnightAnimatedShader";
/**
 * Procedurally animated knight character.
 */
export declare class KnightAnimatedAoShader extends KnightAnimatedShader implements DrawableShader, IFogShader {
    aoTexture: WebGLUniformLocation | undefined;
    inverseAoTexSize: WebGLUniformLocation | undefined;
    fillCode(): void;
    fillUniformsAttributes(): void;
}
