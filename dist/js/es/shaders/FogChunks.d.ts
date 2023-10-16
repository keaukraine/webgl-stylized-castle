/** Uniforms, varyings and constants for the fog VS. */
export declare const FOG_UNIFORMS_VS = "\nout float vFogAmount;\nuniform float fogDistance;\nuniform float fogStartDistance;\n";
/** Fog amount calculation in VS. */
export declare const FOG_CHUNK_VS = "\nvFogAmount = clamp((length(gl_Position) - fogStartDistance) / fogDistance, 0.0, 1.0);\n";
/** Uniforms, varyings and constants for the fog FS. */
export declare const FOG_UNIFORMS_FS = "\nin float vFogAmount;\nuniform vec4 fogColor;\n";
/** Applying fog color in FS. GLES 3.0 */
export declare const FOG_CHUNK_FS = "\nfragColor = mix(fragColor, fogColor, vFogAmount);\n";
/** Linear distance fog shader. */
export interface IFogShader {
    /** Fog start distance. */
    fogStartDistance: WebGLUniformLocation | undefined;
    /** Fog transition distance. */
    fogDistance: WebGLUniformLocation | undefined;
    /** Fog color. */
    fogColor: WebGLUniformLocation | undefined;
}
