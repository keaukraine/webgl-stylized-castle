/**
* findLinePlaneIntersectionCoords (to avoid requiring unnecessary instantiation)
* Given points p with px py pz and q that define a line, and the plane
* of formula ax+by+cz+d = 0, returns the intersection point or null if none.
*/
export function findLinePlaneIntersectionCoords(px: number, py: number, pz: number, qx: number, qy: number, qz: number, a: number, b: number, c: number, d: number) {
    var tDenom = a * (qx - px) + b * (qy - py) + c * (qz - pz);
    if (tDenom == 0) {
        return null;
    }

    var t = - (a * px + b * py + c * pz + d) / tDenom;

    return {
        x: (px + t * (qx - px)),
        y: (py + t * (qy - py)),
        z: (pz + t * (qz - pz))
    };
}

export function lerp(start: number, end: number, m: number) {
    return (1 - m) * start + m * end;
}
