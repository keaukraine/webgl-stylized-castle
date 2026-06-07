import { FrameBuffer, MsaaFrameBuffer, TextureUtils } from "webgl-framework";
import { GaussianBlurShader } from "./shaders/GaussianBlurShader";
import { GaussianBlurShader4 } from "./shaders/GaussianBlurShader4";
import { GaussianBlurShader3 } from "./shaders/GaussianBlurShader3";
import { GaussianBlurShader2 } from "./shaders/GaussianBlurShader2";

/**
 * Gaussian blur kernel size.
 */
export enum BlurSize {
    KERNEL_5, KERNEL_4, KERNEL_3, KERNEL_2
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
export class GaussianBlurRenderPass {
    private fboOffscreen?: FrameBuffer;
    private fboOffscreenVert?: FrameBuffer;

    private fboOffscreenMsaa?: MsaaFrameBuffer;
    private fboOffscreenVertMsaa?: FrameBuffer;

    private textureOffscreen?: WebGLTexture;
    private textureOffscreenVert?: WebGLTexture;

    private textureOffscreenMsaa?: WebGLTexture;
    private textureOffscreenVertMsaa?: WebGLTexture;

    private width = 0;
    private height = 0;

    private blurShader5: GaussianBlurShader;
    private blurShader4: GaussianBlurShader;
    private blurShader3: GaussianBlurShader;
    private blurShader2: GaussianBlurShader;

    constructor(protected gl: WebGL2RenderingContext, size: RendertargetSize) {
        const { width, height, minSize, ratio } = size;
        if (width !== undefined && height !== undefined) {
            this.width = width;
            this.height = height;
        } else if (minSize !== undefined && ratio !== undefined) {
            this.width = ratio > 1 ? Math.round(minSize * ratio) : minSize;
            this.height = ratio > 1 ? minSize : Math.round(minSize / ratio);
        }

        this.blurShader5 = new GaussianBlurShader(gl);
        this.blurShader4 = new GaussianBlurShader4(gl);
        this.blurShader3 = new GaussianBlurShader3(gl);
        this.blurShader2 = new GaussianBlurShader2(gl);

        this.textureOffscreen = TextureUtils.createNpotTexture(gl, this.width, this.height, false)!;
        this.fboOffscreen = new FrameBuffer(gl);
        this.fboOffscreen.textureHandle = this.textureOffscreen;
        this.fboOffscreen.width = this.width;
        this.fboOffscreen.height = this.height;
        this.fboOffscreen.createGLData(this.width, this.height);

        this.textureOffscreenMsaa = TextureUtils.createNpotTexture(gl, this.width, this.height, false)!;
        this.fboOffscreenMsaa = new MsaaFrameBuffer(gl);
        this.fboOffscreenMsaa.textureHandle = this.textureOffscreenMsaa;
        this.fboOffscreenMsaa.width = this.width;
        this.fboOffscreenMsaa.height = this.height;
        this.fboOffscreenMsaa.createGLData(this.width, this.height, false);

        this.textureOffscreenVert = TextureUtils.createNpotTexture(gl, this.width, this.height, false)!;
        this.fboOffscreenVert = new FrameBuffer(gl);
        this.fboOffscreenVert.textureHandle = this.textureOffscreenVert;
        this.fboOffscreenVert.width = this.width;
        this.fboOffscreenVert.height = this.height;
        this.fboOffscreenVert.createGLData(this.width, this.height);

        this.textureOffscreenVertMsaa = TextureUtils.createNpotTexture(gl, this.width, this.height, false)!;
        this.fboOffscreenVertMsaa = new FrameBuffer(gl);
        this.fboOffscreenVertMsaa.textureHandle = this.textureOffscreenVertMsaa;
        this.fboOffscreenVertMsaa.width = this.width;
        this.fboOffscreenVertMsaa.height = this.height;
        this.fboOffscreenVertMsaa.createGLData(this.width, this.height);

        console.log(`Created GaussianBlurRenderPass with dimensions ${this.width}x${this.height}`);
    }

    public switchToOffscreenFBO(): void {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fboOffscreen!.framebufferHandle);
        this.gl.viewport(0, 0, this.width, this.height);
    }

    public switchToOffscreenFBOMsaa(): void {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fboOffscreenMsaa!.framebufferMsaaHandle);
        this.gl.viewport(0, 0, this.width, this.height);
    }

    public blitToTexture(): void {
        // Blit framebuffers, no Multisample texture 2d in WebGL 2
        this.gl.bindFramebuffer(this.gl.READ_FRAMEBUFFER, this.fboOffscreenMsaa!.framebufferMsaaHandle);
        this.gl.bindFramebuffer(this.gl.DRAW_FRAMEBUFFER, this.fboOffscreen!.framebufferHandle);
        this.gl.clearBufferfv(this.gl.COLOR, 0, [0.0, 0.0, 0.0, 1.0]);
        this.gl.blitFramebuffer(
            0, 0, this.width, this.height,
            0, 0, this.width, this.height,
            this.gl.COLOR_BUFFER_BIT, this.gl.NEAREST
        );
    }

    public get texture() {
        return this.textureOffscreen;
    }

    private getShader(size: BlurSize) {
        switch (size) {
            case BlurSize.KERNEL_2:
                return this.blurShader2;
            case BlurSize.KERNEL_3:
                return this.blurShader3;
            default:
            case BlurSize.KERNEL_4:
                return this.blurShader4;
            case BlurSize.KERNEL_5:
                return this.blurShader5;
        }
    }

    /**
     * Binds 2D texture.
     *
     * @param textureUnit A texture unit to use
     * @param texture A texture to be used
     * @param uniform Shader's uniform ID
     */
    private setTexture2D(textureUnit: number, texture: WebGLTexture, uniform: WebGLUniformLocation): void {
        this.gl.activeTexture(this.gl.TEXTURE0 + textureUnit);
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.uniform1i(uniform, textureUnit);
    }

    public blur(brightness: number, size: BlurSize): void {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);

        this.gl.disable(this.gl.BLEND);

        let shader = this.getShader(size);

        shader.use();
        this.gl.uniform1f(shader.brightness!, brightness);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fboOffscreenVert!.framebufferHandle);
        this.gl.viewport(0, 0, this.width, this.height);
        this.gl.uniform2f(shader.direction!, 0.0, 1.0);
        this.setTexture2D(0, this.textureOffscreen!, shader.sTexture!);
        this.gl.disable(this.gl.DEPTH_TEST);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fboOffscreen!.framebufferHandle);
        this.gl.viewport(0, 0, this.width, this.height);
        this.gl.uniform2f(shader.direction!, 1.0, 0.0);
        this.setTexture2D(0, this.textureOffscreenVert!, shader.sTexture!);
        this.gl.disable(this.gl.DEPTH_TEST);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }

    /**
     * Logs GL error to console.
     *
     * @param operation Operation name.
     */
    private checkGlError(operation: string): void {
        let error;
        while ((error = this.gl.getError()) !== this.gl.NO_ERROR) {
            console.error(`${operation}: glError ${error}`);
        }
    }
}
