"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shadowConditional9TapEs3 = exports.shadowSmoothConditional5TapEs3 = exports.shadowConditional5TapEs3 = exports.OUT_OF_SHADOWMAP_CONDITION = exports.UNIFORMS_VARYINGS_CONST_FILTERED_FS = exports.UNIFORMS_VARYINGS_CONST_FS = exports.UNIFORMS_VARYINGS_CONST_VS = exports.SHADOW_UNFILTERED_ES3 = exports.SHADOW_UNFILTERED_SMOOTH = exports.SHADOW_UNFILTERED = exports.SHADOW_PCF_5_TAPS_ES3 = exports.SHADOW_PCF_5_TAPS = exports.SHADOW_PCF_9_TAPS_ES3 = exports.SHADOW_PCF_9_TAPS = void 0;
/**
 * Expensive 9 taps PCF.
 * Output is colorCoeff: 0 = fully shadowed, 1 = out of shadow
 */
exports.SHADOW_PCF_9_TAPS = `
const float SAMPLES_COUNT = 9.0;
const int SAMPLES_MIN_OFFSET = -1;
const int SAMPLES_MAX_OFFSET = 1;
float colorCoeff = 0.; // 0 = fully shadowed, 1 = out of shadow
float shadow = 0.0;
for (int y = SAMPLES_MIN_OFFSET; y <= SAMPLES_MAX_OFFSET; ++y) {
    for (int x = SAMPLES_MIN_OFFSET; x <= SAMPLES_MAX_OFFSET; ++x) {
        vec2 offset = depth.xy + vec2(float(x) * texelSize, float(y) * texelSize);
        shadow = texture2D(sDepth, offset).r;
        if (depth.z <= shadow) {
            colorCoeff += 1.;
        }
    }
}
colorCoeff /= SAMPLES_COUNT;
`;
/**
 * Expensive 9 taps PCF.
 * Output is colorCoeff: 0 = fully shadowed, 1 = out of shadow
 */
exports.SHADOW_PCF_9_TAPS_ES3 = exports.SHADOW_PCF_9_TAPS.replace(/texture2D/g, "texture");
/**
 * Faster but still okayish quality 5-taps PCF
 * Output is colorCoeff: 0 = fully shadowed, 1 = out of shadow
 */
exports.SHADOW_PCF_5_TAPS = `
const float SAMPLES_COUNT = 5.0;
float colorCoeff = 0.; // 0 = fully shadowed, 1 = out of shadow
float shadow = 0.0;
shadow = texture2D(sDepth, depth.xy).r;
if (depth.z <= shadow) { colorCoeff += 1.; }
shadow = texture2D(sDepth, depth.xy + vec2(-texelSize, -texelSize)).r;
if (depth.z <= shadow) { colorCoeff += 1.; }
shadow = texture2D(sDepth, depth.xy + vec2(-texelSize, texelSize)).r;
if (depth.z <= shadow) { colorCoeff += 1.; }
shadow = texture2D(sDepth, depth.xy + vec2(texelSize, -texelSize)).r;
if (depth.z <= shadow) { colorCoeff += 1.; }
shadow = texture2D(sDepth, depth.xy + vec2(texelSize, texelSize)).r;
if (depth.z <= shadow) { colorCoeff += 1.; }
colorCoeff /= SAMPLES_COUNT;
`;
exports.SHADOW_PCF_5_TAPS_ES3 = exports.SHADOW_PCF_5_TAPS.replace(/texture2D/g, "texture");
/**
 * Unfiltered shadows.
 * Output is colorCoeff: 0 = fully shadowed, 1 = out of shadow
 */
exports.SHADOW_UNFILTERED = `
float colorCoeff = 0.; // 0 = fully shadowed, 1 = out of shadow
float shadow = 0.0;
shadow = texture2D(sDepth, depth.xy).r;
if (depth.z <= shadow) {
    colorCoeff = 1.;
}
`;
/**
 * Unfiltered shadows but with sampler2DShadow.
 * Output is colorCoeff: 0 = fully shadowed, 1 = out of shadow
 */
exports.SHADOW_UNFILTERED_SMOOTH = `
float colorCoeff = texture(sDepth, depth);
`;
/**
 * Unfiltered shadows.
 * Output is colorCoeff: 0 = fully shadowed, 1 = out of shadow
 */
exports.SHADOW_UNFILTERED_ES3 = exports.SHADOW_UNFILTERED.replace(/texture2D/g, "texture");
/** Uniforms, varyings and constants for shadowmap VS. */
exports.UNIFORMS_VARYINGS_CONST_VS = `
uniform vec3 lightVector;
uniform mat4 projectionMatrix;
// uniform mat4 viewMatrix;
uniform mat4 modelMatrix;
uniform mat4 lightMatrix;
uniform float shadowBrightnessVS;

out highp vec4 vPosition;
out float vLamb;

const mat4 ScaleMatrix = mat4(0.5, 0.0, 0.0, 0.0, 0.0, 0.5, 0.0, 0.0, 0.0, 0.0, 0.5, 0.0, 0.5, 0.5, 0.5, 1.0);
// const float BIAS = 0.2; // adjustable, for 4096 shadowmap
// const float BIAS = 0.4; // adjustable, for 2048 shadowmap
const float BIAS = 0.1; // adjustable, for 2500 shadowmap
`;
/** Uniforms, varyings and constants for shadowmap FS. */
exports.UNIFORMS_VARYINGS_CONST_FS = `
in highp vec4 vPosition;
uniform sampler2D sDepth;
uniform highp float texelSize;
uniform float shadowBrightnessFS;
uniform float pcfBiasCorrection;
in float vLamb;

// const float PCF_BIAS_CORRECTION = 0.001; // for 4096 shadowmap
// const float PCF_BIAS_CORRECTION = 0.002; // for 2048 shadowmap
const float PCF_BIAS_CORRECTION = 0.0008; // larger values (as above) cause peterpanning
`;
/** Uniforms, varyings and constants for filtered shadowmap FS. */
exports.UNIFORMS_VARYINGS_CONST_FILTERED_FS = exports.UNIFORMS_VARYINGS_CONST_FS.replace(/sampler2D/g, "mediump sampler2DShadow");
/** Condition to test if depth coordinate is out of shadowmap. Used in FS. */
exports.OUT_OF_SHADOWMAP_CONDITION = `(depth.x < 0.0) || (depth.x > 1.0) || (depth.y < 0.0) || (depth.y > 1.0) || (depth.z < 0.0) || (depth.z > 1.0)`;
function shadowConditional5TapEs3(condition) {
    return `
    float colorCoeff = 0.; // 0 = fully shadowed, 1 = out of shadow
    if (${condition}) { // unfiltered
        float shadow = 0.0;
        shadow = texture(sDepth, depth.xy).r;
        if (depth.z <= shadow) {
            colorCoeff = 1.;
        }
    } else { // 5 taps PCF
        depth.z -= pcfBiasCorrection;
        const float SAMPLES_COUNT = 5.0;
        float shadow = 0.0;
        shadow = texture(sDepth, depth.xy).r;
        if (depth.z <= shadow) { colorCoeff += 1.; }
        shadow = texture(sDepth, depth.xy + vec2(-texelSize, -texelSize)).r;
        if (depth.z <= shadow) { colorCoeff += 1.; }
        shadow = texture(sDepth, depth.xy + vec2(-texelSize, texelSize)).r;
        if (depth.z <= shadow) { colorCoeff += 1.; }
        shadow = texture(sDepth, depth.xy + vec2(texelSize, -texelSize)).r;
        if (depth.z <= shadow) { colorCoeff += 1.; }
        shadow = texture(sDepth, depth.xy + vec2(texelSize, texelSize)).r;
        if (depth.z <= shadow) { colorCoeff += 1.; }
        colorCoeff /= SAMPLES_COUNT;
    }
    `;
}
exports.shadowConditional5TapEs3 = shadowConditional5TapEs3;
function shadowSmoothConditional5TapEs3(condition) {
    return `
    float colorCoeff = 0.; // 0 = fully shadowed, 1 = out of shadow
    depth.z -= pcfBiasCorrection;
    if (${condition}) { // unfiltered
        colorCoeff = texture(sDepth, depth);
    } else { // 5 taps PCF
        colorCoeff = texture(sDepth, depth);
        colorCoeff += texture(sDepth, vec3(depth.x-texelSize, depth.y-texelSize, depth.z));
        colorCoeff += texture(sDepth, vec3(depth.x-texelSize, depth.y+texelSize, depth.z));
        colorCoeff += texture(sDepth, vec3(depth.x+texelSize, depth.y-texelSize, depth.z));
        colorCoeff += texture(sDepth, vec3(depth.x+texelSize, depth.y+texelSize, depth.z));
        const float SAMPLES_COUNT = 5.0;
        colorCoeff /= SAMPLES_COUNT;
    }
    `;
}
exports.shadowSmoothConditional5TapEs3 = shadowSmoothConditional5TapEs3;
function shadowConditional9TapEs3(condition) {
    return `
    float colorCoeff = 0.; // 0 = fully shadowed, 1 = out of shadow
    if (${condition}) { // unfiltered
        float shadow = 0.0;
        shadow = texture(sDepth, depth.xy).r;
        if (depth.z <= shadow) {
            colorCoeff = 1.;
        }
    } else { // 9 taps PCF
        const float SAMPLES_COUNT = 9.0;
        const int SAMPLES_MIN_OFFSET = -1;
        const int SAMPLES_MAX_OFFSET = 1;
        float shadow = 0.0;
        for (int y = SAMPLES_MIN_OFFSET; y <= SAMPLES_MAX_OFFSET; ++y) {
            for (int x = SAMPLES_MIN_OFFSET; x <= SAMPLES_MAX_OFFSET; ++x) {
                vec2 offset = depth.xy + vec2(float(x) * texelSize, float(y) * texelSize);
                shadow = texture(sDepth, offset).r;
                if (depth.z <= shadow) {
                    colorCoeff += 1.;
                }
            }
        }
        colorCoeff /= SAMPLES_COUNT;
    }
    `;
}
exports.shadowConditional9TapEs3 = shadowConditional9TapEs3;
//# sourceMappingURL=ShadowmapsChunks.js.map