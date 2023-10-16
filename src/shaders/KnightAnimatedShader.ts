import { DrawableShader } from "webgl-framework/dist/types/DrawableShader";
import { FOG_CHUNK_FS, FOG_CHUNK_VS, FOG_UNIFORMS_FS, FOG_UNIFORMS_VS, IFogShader } from "./FogChunks";
import { UNIFORMS_VARYINGS_CONST_FILTERED_FS, UNIFORMS_VARYINGS_CONST_FS, UNIFORMS_VARYINGS_CONST_VS, shadowConditional5TapEs3, shadowSmoothConditional5TapEs3 } from "./ShadowmapsChunks";
import { BaseShader, FullModel } from "webgl-framework";
import { RendererWithExposedMethods } from "webgl-framework/dist/types/RendererWithExposedMethods";
import { ShaderCommonFunctions } from "./ShaderCommonFunctions";

/**
 * Procedurally animated knight character.
 */
export class KnightAnimatedShader extends BaseShader implements DrawableShader, IFogShader {
    // Uniforms are of type `WebGLUniformLocation`
    view_proj_matrix: WebGLUniformLocation | undefined;
    view_matrix: WebGLUniformLocation | undefined;
    model_matrix: WebGLUniformLocation | undefined;
    ambient: WebGLUniformLocation | undefined;
    diffuse: WebGLUniformLocation | undefined;
    lightDir: WebGLUniformLocation | undefined;
    diffuseCoef: WebGLUniformLocation | undefined;
    diffuseExponent: WebGLUniformLocation | undefined;
    sTexture: WebGLUniformLocation | undefined;
    headRotationZ: WebGLUniformLocation | undefined;
    armRotations: WebGLUniformLocation | undefined;

    // Attributes are numbers.
    rm_Vertex: number | undefined;
    rm_Normal: number | undefined;
    rm_TexCoord: number | undefined;

    /** Depth sampler */
    public sDepth: WebGLUniformLocation | undefined;
    public projectionMatrix: WebGLUniformLocation | undefined;
    public modelMatrix: WebGLUniformLocation | undefined;
    /** Ligth matrix */
    public lightMatrix: WebGLUniformLocation | undefined;
    public texelSize: WebGLUniformLocation | undefined;
    public lightVector: WebGLUniformLocation | undefined;
    public shadowBrightnessVS: WebGLUniformLocation | undefined;
    public shadowBrightnessFS: WebGLUniformLocation | undefined;
    public pcfBiasCorrection: WebGLUniformLocation | undefined;

    fogStartDistance: WebGLUniformLocation | undefined;
    fogDistance: WebGLUniformLocation | undefined;
    fogColor: WebGLUniformLocation | undefined;

    static readonly UNIFORMS_CONSTANTS = `
    uniform float headRotationZ;
    uniform vec2 armRotations; // x - left arm, y - right arm
    const float ARM_PIVOT = -2.25;
    `;

    fillCode() {
        this.vertexShaderCode = `#version 300 es
            precision highp float;

            uniform vec4 lightDir;
            uniform mat4 view_matrix;
            uniform mat4 model_matrix;
            uniform mat4 view_proj_matrix;
            uniform float diffuseCoef;
            uniform float diffuseExponent;

            uniform vec3 colors[32];

            out float vLightCoeff;
            out vec2 vTexCoord;
            out vec3 vVertex;

            in vec4 rm_Vertex;
            in vec2 rm_TexCoord;
            in vec3 rm_Normal;

            const float ONE = 1.0;
            const float ZERO = 0.0;

            // Shadowmaps stuff
            ${UNIFORMS_VARYINGS_CONST_VS}

            // Fog stuff
            ${FOG_UNIFORMS_VS}

            // Animation
            ${ShaderCommonFunctions.ROTATION}
            ${KnightAnimatedShader.UNIFORMS_CONSTANTS}

            void main(void)
            {
                vTexCoord = rm_TexCoord;
                vVertex = rm_Vertex.xyz;

                vec4 vertex = rm_Vertex;
                vec4 normal = vec4(rm_Normal, ZERO);

                if (gl_VertexID < 36) { // body
                } else if (gl_VertexID < 72) { // head
                    mat4 matHeadRotation = rotationAroundZ(headRotationZ);
                    normal *= matHeadRotation;
                    vertex *= matHeadRotation;
                } else if (gl_VertexID < 108) { // left arm
                    mat4 matLeftArmRotation = rotationAroundY(armRotations.x);
                    normal *= matLeftArmRotation;
                    vertex.z += ARM_PIVOT;
                    vertex *= matLeftArmRotation;
                    vertex.z -= ARM_PIVOT;
                } else { // right arm
                    mat4 matRightArmRotation = rotationAroundY(armRotations.y);
                    normal *= matRightArmRotation;
                    vertex.z += ARM_PIVOT;
                    vertex *= matRightArmRotation;
                    vertex.z -= ARM_PIVOT;
                }

                gl_Position = view_proj_matrix * vertex;

                vec3 vLightVec = (view_matrix * lightDir).xyz;
                normal = model_matrix * normal;
                vec3 vNormal = normalize(view_matrix * normal).xyz; // w component of rm_Normal might be ignored, and implicitly converted to vec4 in uniform declaration
                float d = pow(max(ZERO, dot(vNormal, normalize(vLightVec))), diffuseExponent); // redundant normalize() ??

                float angle = rm_Normal.z;

                vLightCoeff = d * diffuseCoef;

                // Shadowmap stuff
                vec3 LightVec = normalize(lightVector);
                vec3 worldNormal = normalize(mat3(modelMatrix) * rm_Normal);
                float lamb = (dot(worldNormal, LightVec)); // range is -1...1 https://chortle.ccsu.edu/vectorlessons/vch09/vch09_6.html
                vertex.xyz += worldNormal * BIAS * (ONE - lamb);
                vPosition = ScaleMatrix * projectionMatrix * lightMatrix * modelMatrix * vertex;

                // Fog stuff
                ${FOG_CHUNK_VS}
            }`;

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

            void main(void)
            {
                highp vec3 depth = vPosition.xyz / vPosition.w;
                ${shadowSmoothConditional5TapEs3("vFogAmount > 0.1")}
                colorCoeff = clamp(colorCoeff, shadowBrightnessFS, 1.); // clamp to limit shadow intensity
                float lightCoeff = min(colorCoeff, vLightCoeff); // this mixes Lambert and shadow coefficients
                fragColor = texture(sTexture, vTexCoord) * mix(ambient, diffuse, lightCoeff);

                // Fog stuff
                ${FOG_CHUNK_FS}
            }`;
    }

    fillUniformsAttributes() {
        this.rm_Vertex = this.getAttrib("rm_Vertex");
        this.rm_Normal = this.getAttrib("rm_Normal");
        this.rm_TexCoord = this.getAttrib("rm_TexCoord");

        this.view_matrix = this.getUniform("view_matrix");
        this.view_proj_matrix = this.getUniform("view_proj_matrix");
        this.model_matrix = this.getUniform("model_matrix");
        this.ambient = this.getUniform("ambient");
        this.diffuse = this.getUniform("diffuse");
        this.lightDir = this.getUniform("lightDir");
        this.diffuseCoef = this.getUniform("diffuseCoef");
        this.diffuseExponent = this.getUniform("diffuseExponent");

        this.sTexture = this.getUniform("sTexture");

        this.headRotationZ = this.getUniform("headRotationZ");
        this.armRotations = this.getUniform("armRotations");

        this.sDepth = this.getUniform("sDepth");
        this.projectionMatrix = this.getUniform("projectionMatrix");
        // this.viewMatrix = this.getUniform("viewMatrix");
        this.modelMatrix = this.getUniform("modelMatrix");
        this.lightMatrix = this.getUniform("lightMatrix");
        this.texelSize = this.getUniform("texelSize");
        this.lightVector = this.getUniform("lightVector");
        // this.shadowBrightnessVS = this.getUniform("shadowBrightnessVS"); // because vLamb is not used in this lighting model
        this.shadowBrightnessFS = this.getUniform("shadowBrightnessFS");
        this.pcfBiasCorrection = this.getUniform("pcfBiasCorrection");

        // Fog stuff
        this.fogColor = this.getUniform("fogColor");
        this.fogStartDistance = this.getUniform("fogStartDistance");
        this.fogDistance = this.getUniform("fogDistance");
    }

    /** @inheritdoc */
    drawModel(
        renderer: RendererWithExposedMethods,
        model: FullModel,
        tx: number, ty: number, tz: number,
        rx: number, ry: number, rz: number,
        sx: number, sy: number, sz: number
    ): void {
        if (this.rm_Vertex === undefined
            || this.rm_Normal === undefined
            || this.rm_TexCoord === undefined
            || this.view_proj_matrix === undefined
            || this.view_matrix === undefined
            || this.model_matrix === undefined
        ) {
            return;
        }

        const gl = renderer.gl as WebGL2RenderingContext;

        model.bindBuffers(gl);

        gl.enableVertexAttribArray(this.rm_Vertex);
        gl.enableVertexAttribArray(this.rm_TexCoord);
        gl.enableVertexAttribArray(this.rm_Normal);
        gl.vertexAttribPointer(this.rm_Vertex, 3, gl.FLOAT, false, 4 * (3 + 2 + 3), 0);
        gl.vertexAttribPointer(this.rm_TexCoord, 2, gl.FLOAT, false, 4 * (3 + 2 + 3), 4 * (3));
        gl.vertexAttribPointer(this.rm_Normal, 3, gl.FLOAT, true, 4 * (3 + 2 + 3), 4 * (3 + 2));

        renderer.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);

        gl.uniformMatrix4fv(this.view_proj_matrix, false, renderer.getMVPMatrix());
        gl.uniformMatrix4fv(this.view_matrix, false, renderer.getViewMatrix());
        gl.uniformMatrix4fv(this.model_matrix, false, renderer.getModelMatrix());
        gl.drawElements(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0);

        renderer.checkGlError("VertexColorSmShader glDrawElements");
    }
}
