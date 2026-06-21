import { GaussianBlurShader } from "./GaussianBlurShader";

/**
 * Fast cross-bilateral blur shader.
 * Blurs sTexture like a regular separable Gaussian blur, but additionally weighs each tap
 * by how close its depth (sampled from sDepth) is to the center pixel's depth. This keeps
 * the blur from mixing samples across depth discontinuities (e.g. AO bleeding/haloing
 * across silhouette edges).
 * Uses a 5-tap kernel (radius of 2 pixels).
 */
export class BilateralBlurShader5 extends GaussianBlurShader {
    sDepth: WebGLUniformLocation | undefined;
    depthSharpness: WebGLUniformLocation | undefined;

    protected getKernel(): string {
        return `const int SAMPLE_COUNT = 5;
const float OFFSETS[5] = float[5](-2.0, -1.0, 0.0, 1.0, 2.0);
const float WEIGHTS[5] = float[5](
    0.0625,
    0.25,
    0.375,
    0.25,
    0.0625
);`;
    }

    /** @inheritdoc */
    fillCode() {
        this.vertexShaderCode = `#version 300 es
            precision highp float;
            out vec2 vTextureCoord;

            const vec2 vertices[4] = vec2[4](
              vec2(-1.0f, -1.0f),
              vec2( 1.0f, -1.0f),
              vec2(-1.0f,  1.0f),
              vec2( 1.0f,  1.0f)
            );
            const vec2 uvs[4] = vec2[4](
              vec2(0.0f, 0.0f),
              vec2(1.0f, 0.0f),
              vec2(0.0f, 1.0f),
              vec2(1.0f, 1.0f)
            );

            void main() {
              gl_Position = vec4(vertices[gl_VertexID], 0.0f, 1.0f);
              vTextureCoord = uvs[gl_VertexID];
            }`;

        this.fragmentShaderCode = `#version 300 es
            precision highp float;

            ${this.getKernel()}

            // blurDirection is:
            //     vec2(1,0) for horizontal pass
            //     vec2(0,1) for vertical pass
            // The sourceTexture to be blurred MUST use linear filtering!
            // pixelCoord is in [0..1]
            // depthTexture must be the same size as sourceTexture.
            // depthSharpness controls how aggressively taps across depth discontinuities are
            // rejected: 0 disables edge-awareness (falls back to a regular Gaussian blur),
            // higher values preserve edges more strictly at the cost of more noise.
            mediump vec4 blur(in sampler2D sourceTexture, in sampler2D depthTexture, vec2 blurDirection, vec2 pixelCoord, float depthSharpness)
            {
                vec2 size = vec2(textureSize(sourceTexture, 0));
                float centerDepth = texture(depthTexture, pixelCoord).r;

                mediump vec4 result = vec4(0.0);
                float totalWeight = 0.0;
                for (int i = 0; i < SAMPLE_COUNT; ++i)
                {
                    vec2 offset = blurDirection * OFFSETS[i] / size;
                    vec2 sampleCoord = pixelCoord + offset;

                    float sampleDepth = texture(depthTexture, sampleCoord).r;
                    float depthDiff = (sampleDepth - centerDepth) * depthSharpness;
                    float weight = WEIGHTS[i] / (1.0 + depthDiff * depthDiff);

                    result += texture(sourceTexture, sampleCoord) * weight;
                    totalWeight += weight;
                }
                return result / max(totalWeight, 0.0001);
            }

            in vec2 vTextureCoord;
            uniform sampler2D sTexture;
            uniform sampler2D sDepth;
            uniform vec2 direction;
            uniform mediump float brightness;
            uniform float depthSharpness;
            out mediump vec4 fragColor;

            void main() {
                fragColor = blur(sTexture, sDepth, direction, vTextureCoord, depthSharpness);
                fragColor *= brightness;
            }`;
    }

    /** @inheritdoc */
    fillUniformsAttributes() {
        super.fillUniformsAttributes();
        this.sDepth = this.getUniform("sDepth");
        this.depthSharpness = this.getUniform("depthSharpness");
    }
}
