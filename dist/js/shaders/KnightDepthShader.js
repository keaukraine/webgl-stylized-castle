"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnightDepthShader = void 0;
const webgl_framework_1 = require("webgl-framework");
const ShaderCommonFunctions_1 = require("./ShaderCommonFunctions");
const KnightAnimatedShader_1 = require("./KnightAnimatedShader");
/**
 * Procedurally animated knight character.
 */
class KnightDepthShader extends webgl_framework_1.BaseShader {
    fillCode() {
        this.vertexShaderCode = `#version 300 es
            precision highp float;

            uniform mat4 view_proj_matrix;
            in vec4 rm_Vertex;

            // Animation
            ${ShaderCommonFunctions_1.ShaderCommonFunctions.ROTATION}
            ${KnightAnimatedShader_1.KnightAnimatedShader.UNIFORMS_CONSTANTS}

            void main(void)
            {
                vec4 vertex = rm_Vertex;

                if (gl_VertexID < 36) { // body
                } else if (gl_VertexID < 72) { // head
                    mat4 matHeadRotation = rotationAroundZ(headRotationZ);
                    vertex *= matHeadRotation;
                } else if (gl_VertexID < 108) { // left arm
                    mat4 matLeftArmRotation = rotationAroundY(armRotations.x);
                    vertex.z += ARM_PIVOT;
                    vertex *= matLeftArmRotation;
                    vertex.z -= ARM_PIVOT;
                } else { // right arm
                    mat4 matRightArmRotation = rotationAroundY(armRotations.y);
                    vertex.z += ARM_PIVOT;
                    vertex *= matRightArmRotation;
                    vertex.z -= ARM_PIVOT;
                }

                gl_Position = view_proj_matrix * vertex;
            }`;
        this.fragmentShaderCode = `#version 300 es
            precision mediump float;

            void main(void) {
            }`;
    }
    fillUniformsAttributes() {
        this.rm_Vertex = this.getAttrib("rm_Vertex");
        this.view_proj_matrix = this.getUniform("view_proj_matrix");
        this.headRotationZ = this.getUniform("headRotationZ");
        this.armRotations = this.getUniform("armRotations");
    }
    /** @inheritdoc */
    drawModel(renderer, model, tx, ty, tz, rx, ry, rz, sx, sy, sz) {
        if (this.rm_Vertex === undefined
            || this.view_proj_matrix === undefined) {
            return;
        }
        const gl = renderer.gl;
        model.bindBuffers(gl);
        gl.enableVertexAttribArray(this.rm_Vertex);
        gl.vertexAttribPointer(this.rm_Vertex, 3, gl.FLOAT, false, 4 * (3 + 2 + 3), 0);
        renderer.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);
        gl.uniformMatrix4fv(this.view_proj_matrix, false, renderer.getMVPMatrix());
        gl.drawElements(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0);
        renderer.checkGlError("VertexColorSmShader glDrawElements");
    }
}
exports.KnightDepthShader = KnightDepthShader;
//# sourceMappingURL=KnightDepthShader.js.map