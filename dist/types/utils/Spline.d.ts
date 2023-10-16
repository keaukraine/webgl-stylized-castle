export declare class Spline {
    private y;
    private y2;
    /**
     * The constructor calculates the second derivatives of the interpolating
     * function
     * at the tabulated points xi, with xi = (i, y[i]).
     * Based on numerical recipes in C,
     * http://www.library.cornell.edu/nr/bookcpdf/c3-3.pdf .
     *
     * @param y Array of y coordinates for cubic-spline interpolation.
     */
    constructor(y: number[], bPrepareEnds: boolean);
    protected clamp(i: number, low: number, high: number): number;
    getCurrentPoint(m: number): number;
    /**
     * Returns a cubic-spline interpolated value y for the point between
     * point (n, y[n]) and (n+1, y[n+1), with t ranging from 0 for (n, y[n])
     * to 1 for (n+1, y[n+1]).
     *
     * @param n The start point.
     * @param t The distance to the next point (0..1).
     * @return A cubic-spline interpolated value.
     */
    fn(n: number, t: number): number;
    xySplineFn(xA: number[], trueX: number): number;
    private prepareSplineCoords;
}
