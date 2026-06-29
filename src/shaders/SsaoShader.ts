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
    sampleOffsets: WebGLUniformLocation | undefined;

    rm_Vertex: number | undefined;
    rm_TexCoord0: number | undefined;

    // Must match SAMPLES in the fragment shader below.
    private static readonly SAMPLES = 10;
    private static readonly GOLDEN_ANGLE = 2.39996323; // ~137.5 degrees, gives a well distributed spiral

    private static sampleOffsetsBuffer: Float32Array | undefined;

    public get precomputedSampleOffsets(): Float32Array {
        if (SsaoShader.sampleOffsetsBuffer === undefined) {
            SsaoShader.sampleOffsetsBuffer = SsaoShader.computeSampleOffsets();
        }
        return SsaoShader.sampleOffsetsBuffer;
    }

    /**
     * Precomputes the spiral sampling offsets (direction * distance) used by the SSAO loop.
     * These depend only on the sample index, so they're identical for every fragment - the Mali
     * offline compiler flags the in-shader cos/sin/sqrt version as "uniform computation" (ALU work
     * that's wastefully repeated per-fragment instead of being supplied as a uniform).
     */
    private static computeSampleOffsets(): Float32Array {
        const offsets = new Float32Array(SsaoShader.SAMPLES * 2);
        for (let i = 0; i < SsaoShader.SAMPLES; i++) {
            const dist = Math.sqrt((i + 0.5) / SsaoShader.SAMPLES); // uniform distribution over a disk
            const angle = i * SsaoShader.GOLDEN_ANGLE;
            offsets[i * 2] = Math.cos(angle) * dist;
            offsets[i * 2 + 1] = Math.sin(angle) * dist;
        }
        return offsets;
    }

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
            out mediump vec4 fragColor;

            const int SAMPLES = 10;

            uniform highp sampler2D sDepth;
            uniform highp mat4 invProjMatrix; // inverse of the projection matrix used to render sDepth; feeds depth reconstruction, needs full range/precision
            uniform mediump vec2 texelSize; // 1 / depth texture size, in texels
            uniform mediump float radius; // sampling radius, in texels
            uniform mediump float depthRange; // view-space distance at which occlusion contribution fades to zero
            uniform mediump float bias; // minimal horizon cosine to count as occlusion (filters normal estimation noise)
            uniform mediump float intensity; // occlusion strength multiplier
            // Precomputed (cos(i * goldenAngle), sin(i * goldenAngle)) * sqrt((i + 0.5) / SAMPLES) spiral
            // offsets - identical for every fragment, so computed once on the CPU rather than with
            // per-fragment cos/sin/sqrt (see SsaoShader.computeSampleOffsets).
            uniform mediump vec2 sampleOffsets[SAMPLES];

            ${ShaderCommonFunctions.RANDOM}

            // Reconstructs view-space position from a depth buffer sample at the given UV
            vec3 reconstructViewPos(vec2 uv, float rawDepth) {
                vec4 ndc = vec4(vec3(uv, rawDepth) * 2.0 - 1.0, 1.0);
                vec4 viewPos = invProjMatrix * ndc;
                return viewPos.xyz / viewPos.w;
            }

            // Returns mediump: the highp position differences below already absorbed the
            // precision-sensitive cancellation, so the resulting direction can be cheap.
            mediump vec3 depthToNormal(vec2 vTextureCoord, float originRawDepth, vec3 originPos) {
                // Approximate local surface normal from the reconstructed position of the four
                // immediate neighbours — the only "normal" information obtainable from a depth
                // buffer alone. Using one-sided differences (and picking the smaller jump on each
                // axis) rather than a symmetric dFdx/dFdy avoids sampling across silhouette edges,
                // where a central difference would straddle the object and the background and
                // produce a garbage normal (visible as a dark outline around every object).

                // vec2 uvL = vTextureCoord + vec2(-texelSize.x, 0.0);
                // vec2 uvR = vTextureCoord + vec2(texelSize.x, 0.0);
                // vec2 uvD = vTextureCoord + vec2(0.0, -texelSize.y);
                // vec2 uvU = vTextureCoord + vec2(0.0, texelSize.y);

                vec4 uvLR = vec4(vTextureCoord, vTextureCoord) + vec4(-texelSize.x, 0.0, texelSize.x, 0.0);
                vec4 uvUD = vec4(vTextureCoord, vTextureCoord) + vec4(0.0, -texelSize.y, 0.0, texelSize.y);
                vec2 uvL = uvLR.xy;
                vec2 uvR = uvLR.zw;
                vec2 uvD = uvUD.xy;
                vec2 uvU = uvUD.zw;

                vec3 posL = reconstructViewPos(uvL, texture(sDepth, uvL).x);
                vec3 posR = reconstructViewPos(uvR, texture(sDepth, uvR).x);
                vec3 posD = reconstructViewPos(uvD, texture(sDepth, uvD).x);
                vec3 posU = reconstructViewPos(uvU, texture(sDepth, uvU).x);

                mediump vec3 ddxL = originPos - posL;
                mediump vec3 ddxR = posR - originPos;
                mediump vec3 ddx = (abs(ddxL.z) < abs(ddxR.z)) ? ddxL : ddxR;

                mediump vec3 ddyD = originPos - posD;
                mediump vec3 ddyU = posU - originPos;
                mediump vec3 ddy = (abs(ddyD.z) < abs(ddyU.z)) ? ddyD : ddyU;

                // View-space camera looks down -Z, so a surface facing the camera has normal.z > 0
                mediump vec3 normal = normalize(cross(ddx, ddy));

                return normal;
            }

            vec3 depthToNormal2(vec2 tc, float rawDepth) {
                float depth = rawDepth;
                vec4 clipSpace = vec4(tc * 2.0 - 1.0, depth, 1.0);
                vec4 viewSpace = invProjMatrix * clipSpace;
                viewSpace.xyz /= viewSpace.w;
                vec3 pos = viewSpace.xyz;
                vec3 n = normalize(cross(dFdx(pos), dFdy(pos)));
                // n *= -1.0;

                return n;
            }

            void main() {
                float originRawDepth = texture(sDepth, vTextureCoord).r;

                // Background (cleared depth = far plane): nothing to occlude
                if (originRawDepth > 0.9999) {
                    fragColor = vec4(1.0);
                    return;
                }

                vec3 originPos = reconstructViewPos(vTextureCoord, originRawDepth);

                mediump vec3 normal = depthToNormal(vTextureCoord, originRawDepth, originPos);
                // vec3 normal = depthToNormal2(vTextureCoord, originRawDepth);

                // Per-pixel rotation of the sampling spiral to turn banding into less noticeable noise
                // float rotation = random_vec2(mod(vTextureCoord, 0.003125)) * 6.28318530718; // FIXME: TEST - simulate very small (4x4) repetitive random texture or even matrix

                // random_vec2's hash relies on highp range/precision internally (see ShaderCommonFunctions),
                // but the resulting angle is smooth and bounded, so it can drop to mediump from here on.
                mediump float rotation = random_vec2(vTextureCoord) * 6.28318530718;
                mediump float cs = cos(rotation);
                mediump float sn = sin(rotation);

                mediump float occlusion = 0.0;
                mediump float totalWeight = 0.0;

                for (int i = 0; i < SAMPLES; i++) {
                    mediump vec2 dir = sampleOffsets[i];
                    // rotate sampling direction by the per-pixel random angle
                    mediump vec2 rotatedDir = vec2(dir.x * cs - dir.y * sn, dir.x * sn + dir.y * cs);
                    // sampleUV stays highp: vTextureCoord is highp, so this sum is evaluated at
                    // highp and feeds straight into the depth fetch + position reconstruction below.
                    vec2 sampleUV = vTextureCoord + rotatedDir * radius * texelSize;

                    float sampleRawDepth = texture(sDepth, sampleUV).r;
                    vec3 samplePos = reconstructViewPos(sampleUV, sampleRawDepth);

                    // The highp subtraction below already did the precision-sensitive cancellation,
                    // so the resulting (small) vector and everything derived from it can be mediump.
                    mediump vec3 toSample = samplePos - originPos;
                    mediump float sampleDist = length(toSample);
                    mediump vec3 sampleDir = toSample / max(sampleDist, 0.0001);

                    // How far the sample sits above the local tangent plane, towards the camera/normal:
                    // close to 0 for points on the same plane (no self-occlusion), positive for occluders
                    mediump float horizon = dot(normal, sampleDir) - bias;

                    // Fade out contributions from samples that are far away in 3D, so unrelated geometry
                    // (background, distant walls) doesn't produce false occlusion or dilute the average
                    // near silhouette edges
                    mediump float rangeCheck = 1.0 - smoothstep(0.0, depthRange, sampleDist);

                    occlusion += max(horizon, 0.0) * rangeCheck;
                    totalWeight += rangeCheck;
                }

                occlusion = clamp(occlusion / max(totalWeight, 0.0001) * intensity, 0.0, 1.0);

                mediump float ao = 1.0 - occlusion;
                // ao = pow(ao, 3.0);
                fragColor = vec4(ao, ao, ao, 1.0);

                // Debug: visualize the normal
                // fragColor *= 0.0001; fragColor.rgb += normal;
                // fragColor *= 0.0001; fragColor.rgb += vec3(rotation);
            }`;

            console.log({code: this.fragmentShaderCode});
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
        this.sampleOffsets = this.getUniform("sampleOffsets");

        this.rm_Vertex = this.getAttrib("rm_Vertex");
        this.rm_TexCoord0 = this.getAttrib("rm_TexCoord0");
    }
}
