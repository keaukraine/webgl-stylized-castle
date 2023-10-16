"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Spline = void 0;
class Spline {
    /**
     * The constructor calculates the second derivatives of the interpolating
     * function
     * at the tabulated points xi, with xi = (i, y[i]).
     * Based on numerical recipes in C,
     * http://www.library.cornell.edu/nr/bookcpdf/c3-3.pdf .
     *
     * @param y Array of y coordinates for cubic-spline interpolation.
     */
    constructor(y, bPrepareEnds) {
        if (bPrepareEnds) {
            this.y = this.prepareSplineCoords(y);
        }
        else {
            this.y = y;
        }
        const n = y.length;
        this.y2 = new Array(n);
        this.y2.fill(0);
        const u = new Array(n);
        u.fill(0);
        for (let i = 1; i < n - 1; i++) {
            this.y2[i] = -1.0 / (4.0 + this.y2[i - 1]);
            u[i] = (6.0 * (y[i + 1] - 2.0 * y[i] + y[i - 1]) - u[i - 1]) / (4.0 + this.y2[i - 1]);
        }
        for (let i = n - 2; i >= 0; i--) {
            this.y2[i] = this.y2[i] * this.y2[i + 1] + u[i];
        }
    }
    clamp(i, low, high) {
        return Math.max(Math.min(i, high), low);
    }
    getCurrentPoint(m) {
        const clampedM = this.clamp(m, 0.0, 1.0);
        if (clampedM === 0.0) {
            return this.y[2];
        }
        if (clampedM === 1.0) {
            return this.y[this.y.length - 2];
        }
        const n = Math.floor(clampedM * (this.y.length - 4) + 2);
        const t = (clampedM * (this.y.length - 4) + 2) - n;
        return this.fn(n, t);
    }
    /**
     * Returns a cubic-spline interpolated value y for the point between
     * point (n, y[n]) and (n+1, y[n+1), with t ranging from 0 for (n, y[n])
     * to 1 for (n+1, y[n+1]).
     *
     * @param n The start point.
     * @param t The distance to the next point (0..1).
     * @return A cubic-spline interpolated value.
     */
    fn(n, t) {
        // console.log(n,t, this.y2[n + 1], this.y2[n]);
        return t * this.y[n + 1] - ((t - 1.0) * t * ((t - 2.0) * this.y2[n] - (t + 1.0) * this.y2[n + 1])) / 6.0 + this.y[n] - t * this.y[n];
    }
    xySplineFn(xA, trueX) {
        let X = trueX;
        let Y = 0.0;
        let T = trueX / 3.0 + 0.3333333333;
        const count = 0;
        do {
            const aTinv = 1.0 - T;
            const xC = (xA[0] * 1.0 * Math.pow(T, 3.0) +
                xA[1] * 3.0 * Math.pow(T, 2.0) * Math.pow(aTinv, 1.0) +
                xA[2] * 3.0 * Math.pow(T, 1.0) * Math.pow(aTinv, 2.0) +
                xA[3] * 1.0 * Math.pow(aTinv, 3.0));
            T += (xC - T) / 2.0;
            X = (T - 0.3333333333) * 3.0;
        } while (Math.pow(X - trueX, 2.0) > 0.0001);
        Y = (this.y[0] * 1.0 * Math.pow(1.0 - T, 3.0) +
            this.y[1] * 3.0 * Math.pow(1.0 - T, 2.0) * Math.pow(T, 1.0) +
            this.y[2] * 3.0 * Math.pow(1.0 - T, 1.0) * Math.pow(T, 2.0) +
            this.y[3] * 1.0 * Math.pow(T, 3.0));
        return Y;
    }
    prepareSplineCoords(array) {
        array[0] = array[array.length - 4];
        array[1] = array[array.length - 3];
        array[array.length - 2] = array[2];
        array[array.length - 1] = array[3];
        return array;
    }
}
exports.Spline = Spline;
//# sourceMappingURL=Spline.js.map