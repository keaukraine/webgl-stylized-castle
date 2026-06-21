import { FullScreenUtils } from "webgl-framework";
import { Renderer } from "./Renderer";
import { GUI } from 'dat.gui'
import { CameraMode } from "./CameraMode";
import { BlurSize } from "./utils/GaussianBlurRenderPass";

function ready(fn: () => void) {
    if (document.readyState !== "loading") {
        fn();
    } else {
        document.addEventListener("DOMContentLoaded", fn);
    }
}


let renderer: Renderer;

ready(() => {
    renderer = new Renderer();

    renderer.ready = () => {
        initUI();
    };
    renderer.init("canvasGL", true);

    const fullScreenUtils = new FullScreenUtils();

    const toggleFullscreenElement = document.getElementById("toggleFullscreen")!;
    toggleFullscreenElement.addEventListener("click", () => {
        if (document.body.classList.contains("fs")) {
            fullScreenUtils.exitFullScreen();
        } else {
            fullScreenUtils.enterFullScreen();
        }
        fullScreenUtils.addFullScreenListener(function () {
            if (fullScreenUtils.isFullScreen()) {
                document.body.classList.add("fs");
            } else {
                document.body.classList.remove("fs");
            }
        });
    });
});

function initUI(): void {
    document.getElementById("message")?.classList.add("hidden");
    document.getElementById("canvasGL")?.classList.remove("transparent");
    setTimeout(() => document.querySelector(".promo")?.classList.remove("transparent"), 4000);
    setTimeout(() => document.querySelector("#toggleFullscreen")?.classList.remove("transparent"), 1800);

    const gui = new GUI();
    const dummyConfig = {
        github: () => window.open("https://github.com/keaukraine/webgl-stylized-castle")
    };

    gui.add(
        renderer.config,
        "timeOfDay",
        {
            "Day": 0,
            "Night": 1,
            "Sunrise": 2,
            "Sunset": 3
        }
    )
        .name("Time of Day")
        .onChange(value => renderer.config.timeOfDay = +value);

    gui.add(
        renderer.config,
        "shadowResolution",
        {
            "Ultra": 4,
            "High": 3,
            "Medium": 2,
            "Low": 1
        }
    )
        .name("Shadow resolution")
        .onChange(value => renderer.updateShadowResolution(+value));

    gui.add(
        renderer,
        "currentCameraMode",
        {
            "Orbit": CameraMode.Orbiting,
            "Cinematic": CameraMode.Random,
            "Free": CameraMode.FPS
        }
    )
        .name("Camera")
        .onChange(value => renderer.setCameraMode(+value));

    gui.add(renderer.config, "ssaoRadius", 0, 100, 1)
        .name("SSAO radius");

    gui.add(renderer.config, "ssaoDepthRange", 0, 50, 0.5)
        .name("SSAO depth range");

    gui.add(renderer.config, "ssaoBias", 0, 1, 0.01)
        .name("SSAO bias");

    gui.add(renderer.config, "ssaoIntensity", 0, 5, 0.1)
        .name("SSAO intensity");

    gui.add(
        renderer.config,
        "aoBlurMode",
        {
            "None": -1,
            "KERNEL_2": BlurSize.KERNEL_2,
            "KERNEL_3": BlurSize.KERNEL_3,
            "BILATERAL_3": BlurSize.BILATERAL_3,
            "BILATERAL_5": BlurSize.BILATERAL_5,
            "BOX_5": BlurSize.BOX_5,
            "BOX_3": BlurSize.BOX_3
        }
    )
        .name("AO blur mode")
        .onChange(value => renderer.config.aoBlurMode = +value);

    gui.add(renderer.config, "aoDepthSharpness", 0, 2, 0.01)
        .name("AO blur depth sharpness");

    gui.add(renderer.config, "showAoOnly").name("Show AO only");

    gui.add(dummyConfig, "github").name("Source at Github");

    gui.add(renderer, "fps").name("FPS").listen().domElement.style.pointerEvents = "none";
}
