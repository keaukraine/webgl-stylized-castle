import { DrawableShader } from "webgl-framework/dist/types/DrawableShader";
import { BaseShader, FullModel } from "webgl-framework";
import { RendererWithExposedMethods } from "webgl-framework/dist/types/RendererWithExposedMethods";
import { ShaderCommonFunctions } from "./ShaderCommonFunctions";
import { EagleAnimatedShader } from "./EagleAnimatedShader";

/**
 * Procedurally animated knight character.
 */
export class EagleDepthShader extends BaseShader implements DrawableShader {
    // Uniforms are of type `WebGLUniformLocation`
    view_proj_matrix: WebGLUniformLocation | undefined;
    wingsRotation: WebGLUniformLocation | undefined;

    // Attributes are numbers.
    rm_Vertex: number | undefined;

    fillCode() {
        this.vertexShaderCode = `#version 300 es
            precision highp float;

            uniform mat4 view_proj_matrix;
            in vec4 rm_Vertex;

            // Animation
            ${ShaderCommonFunctions.ROTATION}
            ${EagleAnimatedShader.UNIFORMS_CONSTANTS}

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
    drawModel(
        renderer: RendererWithExposedMethods,
        model: FullModel,
        tx: number, ty: number, tz: number,
        rx: number, ry: number, rz: number,
        sx: number, sy: number, sz: number
    ): void {
        if (this.rm_Vertex === undefined
            || this.view_proj_matrix === undefined
        ) {
            return;
        }

        const gl = renderer.gl as WebGL2RenderingContext;

        model.bindBuffers(gl);

        gl.enableVertexAttribArray(this.rm_Vertex);
        gl.vertexAttribPointer(this.rm_Vertex, 3, gl.FLOAT, false, 4 * (3 + 2 + 3), 0);

        renderer.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);

        gl.uniformMatrix4fv(this.view_proj_matrix, false, renderer.getMVPMatrix());
        gl.drawElements(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0);

        renderer.checkGlError("VertexColorSmShader glDrawElements");
    }
}
