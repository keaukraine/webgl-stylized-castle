"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FOG_CHUNK_FS = exports.FOG_UNIFORMS_FS = exports.FOG_CHUNK_VS = exports.FOG_UNIFORMS_VS = void 0;
/** Uniforms, varyings and constants for the fog VS. */
exports.FOG_UNIFORMS_VS = `
out float vFogAmount;
uniform float fogDistance;
uniform float fogStartDistance;
`;
/** Fog amount calculation in VS. */
exports.FOG_CHUNK_VS = `
vFogAmount = clamp((length(gl_Position) - fogStartDistance) / fogDistance, 0.0, 1.0);
`;
/** Uniforms, varyings and constants for the fog FS. */
exports.FOG_UNIFORMS_FS = `
in float vFogAmount;
uniform vec4 fogColor;
`;
/** Applying fog color in FS. GLES 3.0 */
exports.FOG_CHUNK_FS = `
fragColor = mix(fragColor, fogColor, vFogAmount);
`;
//# sourceMappingURL=FogChunks.js.map