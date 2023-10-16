"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EagleDepthShader = void 0;
const webgl_framework_1 = require("webgl-framework");
const ShaderCommonFunctions_1 = require("./ShaderCommonFunctions");
const EagleAnimatedShader_1 = require("./EagleAnimatedShader");
/**
 * Procedurally animated knight character.
 */
class EagleDepthShader extends webgl_framework_1.BaseShader {
    fillCode() {
        this.vertexShaderCode = `#version 300 es
            precision highp float;

            uniform mat4 view_proj_matrix;
            in vec4 rm_Vertex;

            // Animation
            ${ShaderCommonFunctions_1.ShaderCommonFunctions.ROTATION}
            ${EagleAnimatedShader_1.EagleAnimatedShader.UNIFORMS_CONSTANTS}

            void main(void)
            {
                vec4 vertex = rm_Vertex;

                if (gl_VertexID > 44 && gl_VertexID < 81) { // left wing
                    mat4 matLeftRotation = rotationAroundX(-wingsRotation);
                    vertex.y -= WING_PIVOT;
                    vertex *= matLeftRotation;
                    vertex.y += WING_PIVOT;
                } else if (gl_VertexID > 149 && gl_VertexID < 186) { // right wing
                    mat4 matRightRotation = rotationAroundX(wingsRotation);
                    vertex.y += WING_PIVOT;
                    vertex *= matRightRotation;
                    vertex.y -= WING_PIVOT;
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
        this.wingsRotation = this.getUniform("wingsRotation");
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
exports.EagleDepthShader = EagleDepthShader;
//# sourceMappingURL=EagleDepthShader.js.map