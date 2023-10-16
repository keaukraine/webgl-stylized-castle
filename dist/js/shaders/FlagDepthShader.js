"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlagDepthShader = void 0;
const webgl_framework_1 = require("webgl-framework");
/**
 * Uses the same strides as FlagSmShader.
 * Draws to depth map.
 */
class FlagDepthShader extends webgl_framework_1.BaseShader {
    fillCode() {
        this.vertexShaderCode = `#version 300 es
            precision highp float;

            uniform mat4 view_proj_matrix;
            uniform float time;
            in vec4 rm_Vertex;

            uniform float amplitude;// = 0.2;
            uniform float waves;// = 5.;

            void main(void) {
                vec4 vertex = rm_Vertex;
                float a = sin(time + rm_Vertex.y * waves);
                a *= amplitude;
                a *= vertex.y;
                vertex.x += a;

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
        this.time = this.getUniform("time");
        this.amplitude = this.getUniform("amplitude");
        this.waves = this.getUniform("waves");
    }
    /** @inheritdoc */
    drawModel(renderer, model, tx, ty, tz, rx, ry, rz, sx, sy, sz) {
        if (this.rm_Vertex === undefined || this.view_proj_matrix === undefined) {
            return;
        }
        const gl = renderer.gl;
        model.bindBuffers(gl);
        gl.enableVertexAttribArray(this.rm_Vertex);
        gl.vertexAttribPointer(this.rm_Vertex, 3, gl.HALF_FLOAT, false, 12, 0);
        renderer.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);
        gl.uniformMatrix4fv(this.view_proj_matrix, false, renderer.getMVPMatrix());
        gl.drawElements(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0);
        renderer.checkGlError("VertexColorSmShader glDrawElements");
    }
}
exports.FlagDepthShader = FlagDepthShader;
//# sourceMappingURL=FlagDepthShader.js.map