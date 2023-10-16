import { Point3D } from "./Point3D";
export declare class Spline3D {
    private splineX;
    private splineY;
    private splineZ;
    private currentPoint;
    private currentRotation;
    constructor(bPrepareEnds: boolean, x: number[], y: number[], z: number[]);
    getCurrentPoint(m: number): Point3D;
    getRotation(a: number): Point3D;
}
