"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Spline3D = void 0;
const Spline_1 = require("./Spline");
class Spline3D {
    constructor(bPrepareEnds, x, y, z) {
        this.currentPoint = { x: 0, y: 0, z: 0 };
        this.currentRotation = { x: 0, y: 0, z: 0 };
        this.splineX = new Spline_1.Spline(x, bPrepareEnds);
        this.splineY = new Spline_1.Spline(y, bPrepareEnds);
        this.splineZ = new Spline_1.Spline(z, bPrepareEnds);
    }
    getCurrentPoint(m) {
        this.currentPoint.x = this.splineX.getCurrentPoint(m);
        this.currentPoint.y = this.splineY.getCurrentPoint(m);
        this.currentPoint.z = this.splineZ.getCurrentPoint(m);
        return this.currentPoint;
    }
    getRotation(a) {
        this.getCurrentPoint(a);
        let headingA = a + 0.0001;
        if (headingA > 1) {
            // headingA = 1 - headingA;
            headingA = headingA - 1;
        }
        //Point3D tempPoint = getCurrentPoint(headingA);
        const tempPointX = this.splineX.getCurrentPoint(headingA);
        const tempPointY = this.splineY.getCurrentPoint(headingA);
        const tempPointZ = this.splineZ.getCurrentPoint(headingA);
        this.currentRotation.x = Math.atan2(this.currentPoint.z - tempPointZ, this.currentPoint.y - tempPointY) * 180 / Math.PI; // x axis
        this.currentRotation.y = Math.atan2(this.currentPoint.z - tempPointZ, this.currentPoint.x - tempPointX) * 180 / Math.PI; // y axis
        this.currentRotation.z = Math.atan2(this.currentPoint.x - tempPointX, this.currentPoint.y - tempPointY) * 180 / Math.PI; // z axis
        return this.currentRotation;
    }
}
exports.Spline3D = Spline3D;
//# sourceMappingURL=Spline3D.js.map