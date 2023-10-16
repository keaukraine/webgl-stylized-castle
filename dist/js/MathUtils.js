"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lerp = exports.findLinePlaneIntersectionCoords = void 0;
/**
* findLinePlaneIntersectionCoords (to avoid requiring unnecessary instantiation)
* Given points p with px py pz and q that define a line, and the plane
* of formula ax+by+cz+d = 0, returns the intersection point or null if none.
*/
function findLinePlaneIntersectionCoords(px, py, pz, qx, qy, qz, a, b, c, d) {
    var tDenom = a * (qx - px) + b * (qy - py) + c * (qz - pz);
    if (tDenom == 0) {
        return null;
    }
    var t = -(a * px + b * py + c * pz + d) / tDenom;
    return {
        x: (px + t * (qx - px)),
        y: (py + t * (qy - py)),
        z: (pz + t * (qz - pz))
    };
}
exports.findLinePlaneIntersectionCoords = findLinePlaneIntersectionCoords;
function lerp(start, end, m) {
    return (1 - m) * start + m * end;
}
exports.lerp = lerp;
//# sourceMappingURL=MathUtils.js.map