export interface IShadowShader {
    sDepth: WebGLUniformLocation | undefined;
    projectionMatrix: WebGLUniformLocation | undefined;
    modelMatrix: WebGLUniformLocation | undefined;
    lightMatrix: WebGLUniformLocation | undefined;
    texelSize: WebGLUniformLocation | undefined;
    lightVector: WebGLUniformLocation | undefined;
    shadowBrightnessVS: WebGLUniformLocation | undefined;
    shadowBrightnessFS: WebGLUniformLocation | undefined;
    pcfBiasCorrection: WebGLUniformLocation | undefined;
}
