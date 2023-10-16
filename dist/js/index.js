"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const webgl_framework_1 = require("webgl-framework");
const Renderer_1 = require("./Renderer");
const dat_gui_1 = require("dat.gui");
const CameraMode_1 = require("./CameraMode");
function ready(fn) {
    if (document.readyState !== "loading") {
        fn();
    }
    else {
        document.addEventListener("DOMContentLoaded", fn);
    }
}
let renderer;
ready(() => {
    renderer = new Renderer_1.Renderer();
    renderer.ready = () => {
        initUI();
    };
    renderer.init("canvasGL", true);
    const fullScreenUtils = new webgl_framework_1.FullScreenUtils();
    const toggleFullscreenElement = document.getElementById("toggleFullscreen");
    toggleFullscreenElement.addEventListener("click", () => {
        if (document.body.classList.contains("fs")) {
            fullScreenUtils.exitFullScreen();
        }
        else {
            fullScreenUtils.enterFullScreen();
        }
        fullScreenUtils.addFullScreenListener(function () {
            if (fullScreenUtils.isFullScreen()) {
                document.body.classList.add("fs");
            }
            else {
                document.body.classList.remove("fs");
            }
        });
    });
});
function initUI() {
    var _a, _b;
    (_a = document.getElementById("message")) === null || _a === void 0 ? void 0 : _a.classList.add("hidden");
    (_b = document.getElementById("canvasGL")) === null || _b === void 0 ? void 0 : _b.classList.remove("transparent");
    setTimeout(() => { var _a; return (_a = document.querySelector(".promo")) === null || _a === void 0 ? void 0 : _a.classList.remove("transparent"); }, 4000);
    setTimeout(() => { var _a; return (_a = document.querySelector("#toggleFullscreen")) === null || _a === void 0 ? void 0 : _a.classList.remove("transparent"); }, 1800);
    const gui = new dat_gui_1.GUI();
    const dummyConfig = {
        github: () => window.open("https://github.com/keaukraine/webgl-stylized-castle")
    };
    gui.add(renderer.config, "timeOfDay", {
        "Day": 0,
        "Night": 1,
        "Sunrise": 2,
        "Sunset": 3
    })
        .name("Time of Day")
        .onChange(value => renderer.config.timeOfDay = +value);
    gui.add(renderer.config, "shadowResolution", {
        "Ultra": 4,
        "High": 3,
        "Medium": 2,
        "Low": 1
    })
        .name("Shadow resolution")
        .onChange(value => renderer.updateShadowResolution(+value));
    gui.add(renderer, "currentCameraMode", {
        "Orbit": CameraMode_1.CameraMode.Orbiting,
        "Cinematic": CameraMode_1.CameraMode.Random,
        "Free": CameraMode_1.CameraMode.FPS
    })
        .name("Camera")
        .onChange(value => renderer.setCameraMode(+value));
    gui.add(dummyConfig, "github").name("Source at Github");
}
//# sourceMappingURL=index.js.map