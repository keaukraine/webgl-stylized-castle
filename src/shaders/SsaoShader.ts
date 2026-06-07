import { BaseShader } from "webgl-framework";
import { ShaderCommonFunctions } from "./ShaderCommonFunctions";

/**
 * Screen-space ambient occlusion estimated from a depth-only buffer (no normals available).
 *
 * Reconstructs view-space position from the depth buffer + inverse projection matrix, derives an
 * approximate surface normal from screen-space position derivatives, and performs a horizon/hemisphere
 * test in true 3D space. Working in 3D (rather than comparing raw or linearized depth values directly)
 * avoids depth-precision banding artifacts on sloped surfaces, since the comparison is naturally
 * scale- and precision-invariant.
 */
export class SsaoShader extends BaseShader {
    view_proj_matrix: WebGLUniformLocation | undefined;
    sDepth: WebGLUniformLocation | undefined;
    invProjMatrix: WebGLUniformLocation | undefined;
    texelSize: WebGLUniformLocation | undefined;
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
            uniform mat4 invProjMatrix; // inverse of the projection matrix used to render sDepth
            uniform vec2 texelSize; // 1 / depth texture size, in texels
            uniform float radius; // sampling radius, in texels
            uniform float depthRange; // view-space distance at which occlusion contribution fades to zero
            uniform float bias; // minimal horizon cosine to count as occlusion (filters normal estimation noise)
            uniform float intensity; // occlusion strength multiplier

            ${ShaderCommonFunctions.RANDOM}

            const int SAMPLES = 12;
            const float GOLDEN_ANGLE = 2.39996323; // ~137.5 degrees, gives a well distributed spiral

            // Reconstructs view-space position from a depth buffer sample at the given UV
            vec3 reconstructViewPos(vec2 uv, float rawDepth) {
                vec4 ndc = vec4(uv * 2.0 - 1.0, rawDepth * 2.0 - 1.0, 1.0);
                vec4 viewPos = invProjMatrix * ndc;
                return viewPos.xyz / viewPos.w;
            }

            void main() {
                float originRawDepth = texture(sDepth, vTextureCoord).r;

                // Background (cleared depth = far plane): nothing to occlude
                if (originRawDepth > 0.9999) {
                    fragColor = vec4(1.0);
                    return;
                }

                vec3 originPos = reconstructViewPos(vTextureCoord, originRawDepth);

                // Approximate local surface normal from screen-space derivatives of the reconstructed
                // position — the only "normal" information obtainable from a depth buffer alone.
                // View-space camera looks down -Z, so a surface facing the camera has normal.z > 0.
                vec3 normal = normalize(cross(dFdx(originPos), dFdy(originPos)));
                if (normal.z < 0.0) {
                    normal = -normal;
                }

                // Per-pixel rotation of the sampling spiral to turn banding into less noticeable noise
                float rotation = random_vec2(vTextureCoord) * 6.28318530718;
                float cs = cos(rotation);
                float sn = sin(rotation);

                float occlusion = 0.0;
                float totalWeight = 0.0;

                for (int i = 0; i < SAMPLES; i++) {
                    float t = (float(i) + 0.5) / float(SAMPLES);
                    float dist = sqrt(t); // uniform distribution over a disk
                    float angle = float(i) * GOLDEN_ANGLE;

                    vec2 dir = vec2(cos(angle), sin(angle));
                    // rotate sampling direction by the per-pixel random angle
                    vec2 rotatedDir = vec2(dir.x * cs - dir.y * sn, dir.x * sn + dir.y * cs);
                    vec2 sampleUV = vTextureCoord + rotatedDir * dist * radius * texelSize;

                    float sampleRawDepth = texture(sDepth, sampleUV).r;
                    vec3 samplePos = reconstructViewPos(sampleUV, sampleRawDepth);

                    vec3 toSample = samplePos - originPos;
                    float sampleDist = length(toSample);
                    vec3 sampleDir = toSample / max(sampleDist, 0.0001);

                    // How far the sample sits above the local tangent plane, towards the camera/normal:
                    // close to 0 for points on the same plane (no self-occlusion), positive for occluders
                    float horizon = dot(normal, sampleDir) - bias;

                    // Fade out contributions from samples that are far away in 3D, so unrelated geometry
                    // (background, distant walls) doesn't produce false occlusion or dilute the average
                    // near silhouette edges
                    float rangeCheck = 1.0 - smoothstep(0.0, depthRange, sampleDist);

                    occlusion += max(horizon, 0.0) * rangeCheck;
                    totalWeight += rangeCheck;
                }

                occlusion = clamp(occlusion / max(totalWeight, 0.0001) * intensity, 0.0, 1.0);

                float ao = 1.0 - occlusion;
                fragColor = vec4(ao, ao, ao, 1.0);
            }`;
    }

    fillUniformsAttributes() {
        this.view_proj_matrix = this.getUniform("view_proj_matrix");
        this.sDepth = this.getUniform("sDepth");
        this.invProjMatrix = this.getUniform("invProjMatrix");
        this.texelSize = this.getUniform("texelSize");
        this.radius = this.getUniform("radius");
        this.depthRange = this.getUniform("depthRange");
        this.bias = this.getUniform("bias");
        this.intensity = this.getUniform("intensity");

        this.rm_Vertex = this.getAttrib("rm_Vertex");
        this.rm_TexCoord0 = this.getAttrib("rm_TexCoord0");
    }
}
