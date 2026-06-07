import { BaseShader } from "webgl-framework";

/**
 * Gaussian blur shader.
 * Uses default blur radius of 5 pixels.
 */
export class GaussianBlurShader extends BaseShader {
    view_proj_matrix: WebGLUniformLocation | undefined;
    sTexture: WebGLUniformLocation | undefined;
    brightness: WebGLUniformLocation | undefined;
    direction: WebGLUniformLocation | undefined;
    rm_Vertex: number | undefined;
    rm_TexCoord0: number | undefined;

    protected getKernel(): string {
        return `const int SAMPLE_COUNT = 6;
const float OFFSETS[6] = float[6](
    -4.455269417428358,
    -2.4751038298192056,
    -0.4950160492928827,
    1.485055021558738,
    3.465172537482815,
    5.0
);
const float WEIGHTS[6] = float[6](
    0.14587920530480702,
    0.19230308352110734,
    0.21647621943673803,
    0.20809835496561988,
    0.17082879595769634,
    0.06641434081403137
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
            mediump vec4 blur(in sampler2D sourceTexture, vec2 blurDirection, vec2 pixelCoord)
            {
                mediump vec4 result = vec4(0.0);
                vec2 size = vec2(textureSize(sourceTexture, 0));
                for (int i = 0; i < SAMPLE_COUNT; ++i)
                {
                    vec2 offset = blurDirection * OFFSETS[i] / size;
                    float weight = WEIGHTS[i];
                    result += texture(sourceTexture, pixelCoord + offset) * weight;
                }
                return result;
            }

            in vec2 vTextureCoord;
            uniform sampler2D sTexture;
            uniform vec2 direction;
            uniform mediump float brightness;
            out mediump vec4 fragColor;

            void main() {
                fragColor = blur(sTexture, direction, vTextureCoord);
                fragColor *= brightness;
            }`;
    }

    /** @inheritdoc */
    fillUniformsAttributes() {
        this.sTexture = this.getUniform("sTexture");
        this.brightness = this.getUniform("brightness");
        this.direction = this.getUniform("direction");
    }
}
