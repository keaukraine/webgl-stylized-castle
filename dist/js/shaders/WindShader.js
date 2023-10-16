"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WindShader = void 0;
const webgl_framework_1 = require("webgl-framework");
class WindShader extends webgl_framework_1.BaseShader {
    fillCode() {
        this.vertexShaderCode = `#version 300 es
            precision highp float;

            uniform mat4 view_proj_matrix;
            uniform vec3 offset;
            uniform vec2 dimensions; // x = length; y = width coefficient
            uniform vec3 amplitudes; // x = 1st XY harmonic; y = 2nd XY harmonic; z = Z amplitude
            uniform vec3 frequencies; // x = 1st XY harmonic; y = 2nd XY harmonic; z = Z frequency

            out float vFogAmount;
            uniform float fogDistance;
            uniform float fogStartDistance;

            const vec2 VERTICES[6] = vec2[6](
                vec2(-1.0f, -1.0f),
                vec2( 1.0f, -1.0f),
                vec2(-1.0f, 1.0f),
                vec2( 1.0f, -1.0f),
                vec2( 1.0f, 1.0f),
                vec2(-1.0f, 1.0f)
            );

            void main() {
                vec4 vertex = vec4(VERTICES[gl_VertexID % 6], 0.0, 1.0);
                vertex.y += float(gl_VertexID / 6) * 2.0;

                float t = vertex.y / dimensions.x; // normalized length
                float w = smoothstep(0.0, 0.2, t) * (1.0 - smoothstep(0.8, 1.0, t)); // width coefficient for thin start+end

                vertex.x *= w;
                vertex.x *= dimensions.y;

                vertex.xyz += offset;

                // combine 2 sine waves for horizontal waves
                vec2 noise = sin(vertex.yz * frequencies.x) * amplitudes.x;
                noise += sin(vertex.yz * frequencies.y) * amplitudes.y;

                // vertical wave
                float noise2 = sin(vertex.y * frequencies.z) * amplitudes.z;

                vertex.xy += noise;
                vertex.z += noise2;

                gl_Position = view_proj_matrix * vertex;

                vFogAmount = 1.0 - clamp((length(gl_Position) - fogStartDistance) / fogDistance, 0.0, 1.0);
            }`;
        this.fragmentShaderCode = `#version 300 es
            precision mediump float;

            in float vFogAmount;
            uniform vec4 color;
            out vec4 fragColor;

            void main() {
                fragColor = color * vFogAmount;
            }`;
    }
    fillUniformsAttributes() {
        this.view_proj_matrix = this.getUniform("view_proj_matrix");
        this.color = this.getUniform("color");
        this.offset = this.getUniform("offset");
        this.dimensions = this.getUniform("dimensions");
        this.amplitudes = this.getUniform("amplitudes");
        this.frequencies = this.getUniform("frequencies");
        this.fogDistance = this.getUniform("fogDistance");
        this.fogStartDistance = this.getUniform("fogStartDistance");
    }
    draw(renderer, tx, ty, tz, rx, ry, rz, sx, sy, sz, segments) {
        const gl = renderer.gl;
        renderer.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);
        gl.uniformMatrix4fv(this.view_proj_matrix, false, renderer.getMVPMatrix());
        gl.drawArrays(gl.TRIANGLES, 0, 6 * segments);
        renderer.checkGlError("WindStripeShader drawArrays");
    }
}
exports.WindShader = WindShader;
//# sourceMappingURL=WindShader.js.map