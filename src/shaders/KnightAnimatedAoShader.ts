import { DrawableShader } from "webgl-framework/dist/types/DrawableShader";
import { FOG_CHUNK_FS, FOG_CHUNK_VS, FOG_UNIFORMS_FS, FOG_UNIFORMS_VS, IFogShader } from "./FogChunks";
import { UNIFORMS_VARYINGS_CONST_FILTERED_FS, UNIFORMS_VARYINGS_CONST_FS, UNIFORMS_VARYINGS_CONST_VS, shadowConditional5TapEs3, shadowSmoothConditional5TapEs3 } from "./ShadowmapsChunks";
import { KnightAnimatedShader } from "./KnightAnimatedShader";

/**
 * Procedurally animated knight character.
 */
export class KnightAnimatedAoShader extends KnightAnimatedShader implements DrawableShader, IFogShader {
    // Uniforms are of type `WebGLUniformLocation`
    aoTexture: WebGLUniformLocation | undefined;
    inverseAoTexSize: WebGLUniformLocation | undefined;

    fillCode() {
        super.fillCode();


        this.fragmentShaderCode = `#version 300 es
            precision mediump float;

            in vec2 vTexCoord;
            in vec3 vVertex;
            in float vLightCoeff;
            out vec4 fragColor;

            uniform mediump vec4 diffuse;
            uniform mediump vec4 ambient;
            uniform sampler2D sTexture;

            // Shadowmaps stuff
            ${UNIFORMS_VARYINGS_CONST_FILTERED_FS}

            // Fog stuff
            ${FOG_UNIFORMS_FS}

            // AO stuff
            uniform sampler2D aoTexture;
            uniform vec2 inverseAoTexSize;

            void main(void)
            {
                highp vec3 depth = vPosition.xyz / vPosition.w;
                ${shadowSmoothConditional5TapEs3("vFogAmount > 0.1")}
                colorCoeff = clamp(colorCoeff, shadowBrightnessFS, 1.); // clamp to limit shadow intensity
                float lightCoeff = min(colorCoeff, vLightCoeff); // this mixes Lambert and shadow coefficients

                fragColor = texture(sTexture, vTexCoord) * mix(ambient, diffuse, lightCoeff);

                vec2 aoUV = gl_FragCoord.xy * inverseAoTexSize;
                float ao = texture(aoTexture, aoUV).r;
                fragColor.rgb *= ao;

                // Fog stuff
                ${FOG_CHUNK_FS}
            }`;
    }

    fillUniformsAttributes() {
        super.fillUniformsAttributes();
        this.aoTexture = this.getUniform("aoTexture");
        this.inverseAoTexSize = this.getUniform("inverseAoTexSize");
    }
}
