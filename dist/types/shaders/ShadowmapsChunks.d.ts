/**
 * Expensive 9 taps PCF.
 * Output is colorCoeff: 0 = fully shadowed, 1 = out of shadow
 */
export declare const SHADOW_PCF_9_TAPS = "\nconst float SAMPLES_COUNT = 9.0;\nconst int SAMPLES_MIN_OFFSET = -1;\nconst int SAMPLES_MAX_OFFSET = 1;\nfloat colorCoeff = 0.; // 0 = fully shadowed, 1 = out of shadow\nfloat shadow = 0.0;\nfor (int y = SAMPLES_MIN_OFFSET; y <= SAMPLES_MAX_OFFSET; ++y) {\n    for (int x = SAMPLES_MIN_OFFSET; x <= SAMPLES_MAX_OFFSET; ++x) {\n        vec2 offset = depth.xy + vec2(float(x) * texelSize, float(y) * texelSize);\n        shadow = texture2D(sDepth, offset).r;\n        if (depth.z <= shadow) {\n            colorCoeff += 1.;\n        }\n    }\n}\ncolorCoeff /= SAMPLES_COUNT;\n";
/**
 * Expensive 9 taps PCF.
 * Output is colorCoeff: 0 = fully shadowed, 1 = out of shadow
 */
export declare const SHADOW_PCF_9_TAPS_ES3: string;
/**
 * Faster but still okayish quality 5-taps PCF
 * Output is colorCoeff: 0 = fully shadowed, 1 = out of shadow
 */
export declare const SHADOW_PCF_5_TAPS = "\nconst float SAMPLES_COUNT = 5.0;\nfloat colorCoeff = 0.; // 0 = fully shadowed, 1 = out of shadow\nfloat shadow = 0.0;\nshadow = texture2D(sDepth, depth.xy).r;\nif (depth.z <= shadow) { colorCoeff += 1.; }\nshadow = texture2D(sDepth, depth.xy + vec2(-texelSize, -texelSize)).r;\nif (depth.z <= shadow) { colorCoeff += 1.; }\nshadow = texture2D(sDepth, depth.xy + vec2(-texelSize, texelSize)).r;\nif (depth.z <= shadow) { colorCoeff += 1.; }\nshadow = texture2D(sDepth, depth.xy + vec2(texelSize, -texelSize)).r;\nif (depth.z <= shadow) { colorCoeff += 1.; }\nshadow = texture2D(sDepth, depth.xy + vec2(texelSize, texelSize)).r;\nif (depth.z <= shadow) { colorCoeff += 1.; }\ncolorCoeff /= SAMPLES_COUNT;\n";
export declare const SHADOW_PCF_5_TAPS_ES3: string;
/**
 * Unfiltered shadows.
 * Output is colorCoeff: 0 = fully shadowed, 1 = out of shadow
 */
export declare const SHADOW_UNFILTERED = "\nfloat colorCoeff = 0.; // 0 = fully shadowed, 1 = out of shadow\nfloat shadow = 0.0;\nshadow = texture2D(sDepth, depth.xy).r;\nif (depth.z <= shadow) {\n    colorCoeff = 1.;\n}\n";
/**
 * Unfiltered shadows but with sampler2DShadow.
 * Output is colorCoeff: 0 = fully shadowed, 1 = out of shadow
 */
export declare const SHADOW_UNFILTERED_SMOOTH = "\nfloat colorCoeff = texture(sDepth, depth);\n";
/**
 * Unfiltered shadows.
 * Output is colorCoeff: 0 = fully shadowed, 1 = out of shadow
 */
export declare const SHADOW_UNFILTERED_ES3: string;
/** Uniforms, varyings and constants for shadowmap VS. */
export declare const UNIFORMS_VARYINGS_CONST_VS = "\nuniform vec3 lightVector;\nuniform mat4 projectionMatrix;\n// uniform mat4 viewMatrix;\nuniform mat4 modelMatrix;\nuniform mat4 lightMatrix;\nuniform float shadowBrightnessVS;\n\nout highp vec4 vPosition;\nout float vLamb;\n\nconst mat4 ScaleMatrix = mat4(0.5, 0.0, 0.0, 0.0, 0.0, 0.5, 0.0, 0.0, 0.0, 0.0, 0.5, 0.0, 0.5, 0.5, 0.5, 1.0);\n// const float BIAS = 0.2; // adjustable, for 4096 shadowmap\n// const float BIAS = 0.4; // adjustable, for 2048 shadowmap\nconst float BIAS = 0.1; // adjustable, for 2500 shadowmap\n";
/** Uniforms, varyings and constants for shadowmap FS. */
export declare const UNIFORMS_VARYINGS_CONST_FS = "\nin highp vec4 vPosition;\nuniform sampler2D sDepth;\nuniform highp float texelSize;\nuniform float shadowBrightnessFS;\nuniform float pcfBiasCorrection;\nin float vLamb;\n\n// const float PCF_BIAS_CORRECTION = 0.001; // for 4096 shadowmap\n// const float PCF_BIAS_CORRECTION = 0.002; // for 2048 shadowmap\nconst float PCF_BIAS_CORRECTION = 0.0008; // larger values (as above) cause peterpanning\n";
/** Uniforms, varyings and constants for filtered shadowmap FS. */
export declare const UNIFORMS_VARYINGS_CONST_FILTERED_FS: string;
/** Condition to test if depth coordinate is out of shadowmap. Used in FS. */
export declare const OUT_OF_SHADOWMAP_CONDITION = "(depth.x < 0.0) || (depth.x > 1.0) || (depth.y < 0.0) || (depth.y > 1.0) || (depth.z < 0.0) || (depth.z > 1.0)";
export declare function shadowConditional5TapEs3(condition: string): string;
export declare function shadowSmoothConditional5TapEs3(condition: string): string;
export declare function shadowConditional9TapEs3(condition: string): string;
