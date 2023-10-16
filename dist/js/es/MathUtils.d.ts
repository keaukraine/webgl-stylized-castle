/**
* findLinePlaneIntersectionCoords (to avoid requiring unnecessary instantiation)
* Given points p with px py pz and q that define a line, and the plane
* of formula ax+by+cz+d = 0, returns the intersection point or null if none.
*/
export declare function findLinePlaneIntersectionCoords(px: number, py: number, pz: number, qx: number, qy: number, qz: number, a: number, b: number, c: number, d: number): {
    x: number;
    y: number;
    z: number;
} | null;
export declare function lerp(start: number, end: number, m: number): number;
