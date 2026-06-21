import { GaussianBlurShader } from "./GaussianBlurShader";

/**
 * Edge-aware box blur shader.
 * Averages sTexture with uniform (box) spatial weights, but completely drops taps whose
 * linearized depth (sampled from sDepth) differs from the center pixel's by more than a
 * threshold derived from depthSharpness, instead of weighing them down smoothly.
 * Cheaper per-tap than {@link BilateralBlurShader5} (a compare instead of a squared falloff),
 * at the cost of a harder, more visible cutoff at depth edges.
 * Uses a 5-tap kernel (radius of 2 pixels).
 */
export class BoxBlurShader5 extends GaussianBlurShader {
    sDepth: WebGLUniformLocation | undefined;
    depthSharpness: WebGLUniformLocation | undefined;
    cameraNearFar: WebGLUniformLocation | undefined;

    protected getKernel(): string {
        return `const int SAMPLE_COUNT = 5;
const float OFFSETS[5] = float[5](-2.0, -1.0, 0.0, 1.0, 2.0);
const float BOX_WEIGHT = 1.0 / 5.0;`;
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

            // See BilateralBlurShader5 for why raw depth-buffer values must be linearized
            // before being compared.
            float linearizeDepth(float depth, vec2 cameraNearFar) {
                float ndc = depth * 2.0 - 1.0;
                return (2.0 * cameraNearFar.x * cameraNearFar.y) / (cameraNearFar.y + cameraNearFar.x - ndc * (cameraNearFar.y - cameraNearFar.x));
            }

            // blurDirection is:
            //     vec2(1,0) for horizontal pass
            //     vec2(0,1) for vertical pass
            // The sourceTexture to be blurred MUST use linear filtering!
            // pixelCoord is in [0..1]
            // depthTexture must be the same size as sourceTexture.
            // cameraNearFar is (near, far) of the projection used to render depthTexture, needed to
            // linearize its values.
            // depthSharpness controls how aggressively taps across depth discontinuities are
            // dropped: 0 disables edge-awareness (falls back to a regular box blur), higher
            // values shrink the depth difference threshold at which a tap is excluded entirely.
            mediump vec4 blur(in sampler2D sourceTexture, in sampler2D depthTexture, vec2 blurDirection, vec2 pixelCoord, float depthSharpness, vec2 cameraNearFar)
            {
                vec2 size = vec2(textureSize(sourceTexture, 0));
                float centerDepth = linearizeDepth(texture(depthTexture, pixelCoord).r, cameraNearFar);

                mediump vec4 result = vec4(0.0);
                float totalWeight = 0.0;
                for (int i = 0; i < SAMPLE_COUNT; ++i)
                {
                    vec2 offset = blurDirection * OFFSETS[i] / size;
                    vec2 sampleCoord = pixelCoord + offset;

                    float sampleDepth = linearizeDepth(texture(depthTexture, sampleCoord).r, cameraNearFar);
                    float depthDiff = abs(sampleDepth - centerDepth) * depthSharpness;
                    // Hard cutoff: a tap either fully counts or is fully dropped, no rolloff.
                    float weight = BOX_WEIGHT * step(depthDiff, 1.0);

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
            uniform vec2 cameraNearFar;
            out mediump vec4 fragColor;

            void main() {
                fragColor = blur(sTexture, sDepth, direction, vTextureCoord, depthSharpness, cameraNearFar);
                fragColor *= brightness;
            }`;
    }

    /** @inheritdoc */
    fillUniformsAttributes() {
        super.fillUniformsAttributes();
        this.sDepth = this.getUniform("sDepth");
        this.depthSharpness = this.getUniform("depthSharpness");
        this.cameraNearFar = this.getUniform("cameraNearFar");
    }
}
