/**
 * Gaussian blur kernel size.
 */
export declare enum BlurSize {
    KERNEL_5 = 0,
    KERNEL_4 = 1,
    KERNEL_3 = 2,
    KERNEL_2 = 3
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
    blur(brightness: number, size: BlurSize): void;
    /**
     * Logs GL error to console.
     *
     * @param operation Operation name.
     */
    private checkGlError;
}
