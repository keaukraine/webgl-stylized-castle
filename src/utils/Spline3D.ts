import { Spline } from "./Spline";
import { Point3D } from "./Point3D";

export class Spline3D {
    private splineX: Spline;
    private splineY: Spline;
    private splineZ: Spline;

    private currentPoint: Point3D = { x: 0, y: 0, z: 0 };
    private currentRotation: Point3D = { x: 0, y: 0, z: 0 };

    constructor(bPrepareEnds: boolean, x: number[], y: number[], z: number[]) {
        this.splineX = new Spline(x, bPrepareEnds);
        this.splineY = new Spline(y, bPrepareEnds);
        this.splineZ = new Spline(z, bPrepareEnds);
    }

    getCurrentPoint(m: number): Point3D {
        this.currentPoint.x = this.splineX.getCurrentPoint(m);
        this.currentPoint.y = this.splineY.getCurrentPoint(m);
        this.currentPoint.z = this.splineZ.getCurrentPoint(m);

        return this.currentPoint;
    }

    getRotation(a: number): Point3D {
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

        this.currentRotation.x = Math.atan2(this.currentPoint.z - tempPointZ, this.currentPoint.y - tempPointY) * 180 / Math.PI;// x axis
        this.currentRotation.y = Math.atan2(this.currentPoint.z - tempPointZ, this.currentPoint.x - tempPointX) * 180 / Math.PI;// y axis
        this.currentRotation.z = Math.atan2(this.currentPoint.x - tempPointX, this.currentPoint.y - tempPointY) * 180 / Math.PI;// z axis

        return this.currentRotation;
    }
}
