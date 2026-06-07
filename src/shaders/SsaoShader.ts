import { BaseShader } from "webgl-framework";
import { ShaderCommonFunctions } from "./ShaderCommonFunctions";

/**
 * Screen-space ambient occlusion estimated from a depth-only buffer (no normals available).
 * Samples the depth around each texel in a rotated spiral pattern and accumulates occlusion
 * from neighbours that are noticeably closer to the camera than the shaded texel.
 */
export class SsaoShader extends BaseShader {
    view_proj_matrix: WebGLUniformLocation | undefined;
    sDepth: WebGLUniformLocation | undefined;
    texelSize: WebGLUniformLocation | undefined;
    zNear: WebGLUniformLocation | undefined;
    zFar: WebGLUniformLocation | undefined;
    radius: WebGLUniformLocation | undefined;
    depthRange: WebGLUniformLocation | undefined;
    bias: WebGLUniformLocation | undefined;
    intensity: WebGLUniformLocation | undefined;

    rm_Vertex: number | undefined;
    rm_TexCoord0: number | undefined;

    fillCode() {
        this.vertexShaderCode = `#version 300 es
            precision highp float;

            uniform mat4 view_proj_matrix;
            in vec4 rm_Vertex;
            in vec2 rm_TexCoord0;
            out vec2 vTextureCoord;

            void main() {
                gl_Position = view_proj_matrix * rm_Vertex;
                vTextureCoord = rm_TexCoord0;
            }`;

        this.fragmentShaderCode = `#version 300 es
            precision highp float;

            in vec2 vTextureCoord;
            out vec4 fragColor;

            uniform sampler2D sDepth;
            uniform vec2 texelSize; // 1 / depth texture size, in texels
            uniform float zNear;
            uniform float zFar;
            uniform float radius; // sampling radius, in texels
            uniform float depthRange; // linear depth difference at which occlusion contribution fades to zero
            uniform float bias; // minimal linear depth difference to count as occlusion
            uniform float intensity; // occlusion strength multiplier

            ${ShaderCommonFunctions.RANDOM}

            const int SAMPLES = 12;
            const float GOLDEN_ANGLE = 2.39996323; // ~137.5 degrees, gives a well distributed spiral

            // Converts non-linear depth buffer value into linear distance from the camera
            float linearizeDepth(float d) {
                float ndc = d * 2.0 - 1.0;
                return (2.0 * zNear * zFar) / (zFar + zNear - ndc * (zFar - zNear));
            }

            void main() {
                float originRawDepth = texture(sDepth, vTextureCoord).r;

                // Background (cleared depth = far plane): nothing to occlude
                if (originRawDepth > 0.9999) {
                    fragColor = vec4(1.0);
                    return;
                }

                float originDepth = linearizeDepth(originRawDepth);

                // Per-pixel rotation of the sampling spiral to turn banding into less noticeable noise
                float rotation = random_vec2(vTextureCoord) * 6.28318530718;
                float cs = cos(rotation);
                float sn = sin(rotation);

                float occlusion = 0.0;

                for (int i = 0; i < SAMPLES; i++) {
                    float t = (float(i) + 0.5) / float(SAMPLES);
                    float dist = sqrt(t); // uniform distribution over a disk
                    float angle = float(i) * GOLDEN_ANGLE;

                    vec2 dir = vec2(cos(angle), sin(angle));
                    // rotate sampling direction by the per-pixel random angle
                    vec2 rotatedDir = vec2(dir.x * cs - dir.y * sn, dir.x * sn + dir.y * cs);

                    vec2 sampleUV = vTextureCoord + rotatedDir * dist * radius * texelSize;

                    float sampleRawDepth = texture(sDepth, sampleUV).r;
                    float sampleDepth = linearizeDepth(sampleRawDepth);

                    // Positive when the sampled point is closer to the camera, i.e. a potential occluder
                    float diff = originDepth - sampleDepth;

                    // Fade out contribution from samples that are far away from the shaded point in depth,
                    // so unrelated geometry (e.g. background behind a wall) doesn't produce false occlusion
                    float rangeCheck = 1.0 - smoothstep(0.0, depthRange, abs(diff));

                    occlusion += step(bias, diff) * rangeCheck;
                }

                occlusion = clamp(occlusion / float(SAMPLES) * intensity, 0.0, 1.0);

                float ao = 1.0 - occlusion;
                fragColor = vec4(ao, ao, ao, 1.0);
            }`;
    }

    fillUniformsAttributes() {
        this.view_proj_matrix = this.getUniform("view_proj_matrix");
        this.sDepth = this.getUniform("sDepth");
        this.texelSize = this.getUniform("texelSize");
        this.zNear = this.getUniform("zNear");
        this.zFar = this.getUniform("zFar");
        this.radius = this.getUniform("radius");
        this.depthRange = this.getUniform("depthRange");
        this.bias = this.getUniform("bias");
        this.intensity = this.getUniform("intensity");

        this.rm_Vertex = this.getAttrib("rm_Vertex");
        this.rm_TexCoord0 = this.getAttrib("rm_TexCoord0");
    }
}
