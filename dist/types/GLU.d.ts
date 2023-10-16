/**
 * https://github.com/bringhurst/webgl-unproject
 */
/**
 * This file contains code that may be under the following license:
 *
 * SGI FREE SOFTWARE LICENSE B (Version 2.0, Sept. 18, 2008)
 * Copyright (C) 1991-2000 Silicon Graphics, Inc. All Rights Reserved.
 *
 * See http://oss.sgi.com/projects/FreeB/ for more information.
 *
 * All code in this file which is NOT under the SGI FREE SOFTWARE LICENSE B
 * is free and unencumbered software released into the public domain.
 *
 * Anyone is free to copy, modify, publish, use, compile, sell, or
 * distribute this software, either in source code form or as a compiled
 * binary, for any purpose, commercial or non-commercial, and by any
 * means.
 *
 * In jurisdictions that recognize copyright laws, the author or authors
 * of this software dedicate any and all copyright interest in the
 * software to the public domain. We make this dedication for the benefit
 * of the public at large and to the detriment of our heirs and
 * successors. We intend this dedication to be an overt act of
 * relinquishment in perpetuity of all present and future rights to this
 * software under copyright law.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
 * OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
 * ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */
export declare const GLU: {
    /**
     * Unproject a screen point.
     *
     * @param {number} winX the window point for the x value.
     * @param {number} winY the window point for the y value.
     * @param {number} winZ the window point for the z value.
     * @param {Array.<number>} model the model-view matrix.
     * @param {Array.<number>} proj the projection matrix.
     * @param {Array.<number>} view the viewport coordinate array.
     * @param {Array.<number>} objPos the model point result.
     * @return {boolean} true if the unproject operation was successful, false otherwise.
     */
    unProject: (winX: number, winY: number, winZ: number, model: number[], proj: number[], view: number[], objPos: number[]) => boolean;
    /**
     * Multiply the matrix by the specified vector.
     *
     * @param {Array.<number>} matrix the matrix.
     * @param {Array.<number>} inp the vector.
     * @param {Array.<number>} out the output.
     */
    multMatrixVec: (matrix: number[], inp: number[], out: number[]) => void;
    /**
     * Multiply the specified matrices.
     *
     * @param {Array.<number>} a the first matrix.
     * @param {Array.<number>} b the second matrix.
     * @param {Array.<number>} r the result.
     */
    multMatrices: (a: number[], b: number[], r: number[]) => void;
    /**
     * Invert a matrix.
     *
     * @param {Array.<number>} m the matrix.
     * @param {Array.<number>} invOut the inverted output.
     * @return {boolean} true if successful, false otherwise.
     */
    invertMatrix: (m: number[], invOut: number[]) => boolean;
};
