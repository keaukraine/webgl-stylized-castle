/** Uniforms, varyings and constants for the fog VS. */
export const FOG_UNIFORMS_VS = `
out float vFogAmount;
uniform float fogDistance;
uniform float fogStartDistance;
`

/** Fog amount calculation in VS. */
export const FOG_CHUNK_VS = `
vFogAmount = clamp((length(gl_Position) - fogStartDistance) / fogDistance, 0.0, 1.0);
`;

/** Uniforms, varyings and constants for the fog FS. */
export const FOG_UNIFORMS_FS = `
in float vFogAmount;
uniform vec4 fogColor;
`;

/** Applying fog color in FS. GLES 3.0 */
export const FOG_CHUNK_FS = `
fragColor = mix(fragColor, fogColor, vFogAmount);
`;

/** Linear distance fog shader. */
export interface IFogShader {
    /** Fog start distance. */
    fogStartDistance: WebGLUniformLocation | undefined;
    /** Fog transition distance. */
    fogDistance: WebGLUniformLocation | undefined;
    /** Fog color. */
    fogColor: WebGLUniformLocation | undefined;
}
