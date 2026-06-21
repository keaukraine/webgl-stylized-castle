/**
 * Gaussian blur kernel size.
 * BILATERAL_5/BILATERAL_3 are depth-aware (cross-bilateral) variants that avoid blurring
 * across depth discontinuities; pass a depth texture to `blur()` to use them.
 * BOX_5/BOX_3 are also depth-aware, but use uniform spatial weights and a hard depth cutoff
 * instead of a smooth falloff: cheaper per-tap, but with more visible edges at depth discontinuities.
 */
export declare enum BlurSize {
    KERNEL_5 = 0,
    KERNEL_4 = 1,
    KERNEL_3 = 2,
    KERNEL_2 = 3,
    BILATERAL_5 = 4,
    BILATERAL_3 = 5,
    BOX_5 = 6,
    BOX_3 = 7
}
export interface RendertargetSize {
    width?: number;
    height?: number;
    minSize?: number;
    ratio?: number;
}
/**
 * Helper class to render and blur off-screen targets.
 */
export declare class GaussianBlurRenderPass {
    protected gl: WebGL2RenderingContext;
    private fboOffscreen?;
    private fboOffscreenVert?;
    private fboOffscreenMsaa?;
    private fboOffscreenVertMsaa?;
    private textureOffscreen?;
    private textureOffscreenVert?;
    private textureOffscreenMsaa?;
    private textureOffscreenVertMsaa?;
    private width;
    private height;
    private blurShader5;
    private blurShader4;
    private blurShader3;
    private blurShader2;
    private blurShader1;
    private blurShaderBilateral5;
    private blurShaderBilateral3;
    private blurShaderBox5;
    private blurShaderBox3;
    constructor(gl: WebGL2RenderingContext, size: RendertargetSize);
    switchToOffscreenFBO(): void;
    switchToOffscreenFBOMsaa(): void;
    blitToTexture(): void;
    get texture(): WebGLTexture | undefined;
    private getShader;
    /**
     * Binds 2D texture.
     *
     * @param textureUnit A texture unit to use
     * @param texture A texture to be used
     * @param uniform Shader's uniform ID
     */
    private setTexture2D;
    /**
     * @param depthTexture Required by BILATERAL_5/BILATERAL_3, ignored by other kernel sizes.
     *     Must be the same size as the texture being blurred.
     * @param depthSharpness Edge-preservation strength for bilateral kernels: 0 behaves like a
     *     regular Gaussian blur, higher values reject taps across depth discontinuities more strictly.
     * @param cameraNearFar Near/far planes of the projection used to render depthTexture, needed to
     *     linearize its (non-linear) values before comparing them. Required by bilateral kernels.
     */
    blur(brightness: number, size: BlurSize, depthTexture?: WebGLTexture, depthSharpness?: number, cameraNearFar?: readonly [number, number]): void;
    /**
     * Logs GL error to console.
     *
     * @param operation Operation name.
     */
    private checkGlError;
}
