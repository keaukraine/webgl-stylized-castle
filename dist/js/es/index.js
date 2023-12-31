class FullScreenUtils {
    /** Enters fullscreen. */
    enterFullScreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen({ navigationUI: "hide" });
        }
    }
    /** Exits fullscreen */
    exitFullScreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
    /**
     * Adds cross-browser fullscreenchange event
     *
     * @param exitHandler Function to be called on fullscreenchange event
     */
    addFullScreenListener(exitHandler) {
        document.addEventListener("fullscreenchange", exitHandler, false);
    }
    /**
     * Checks fullscreen state.
     *
     * @return `true` if fullscreen is active, `false` if not
     */
    isFullScreen() {
        return !!document.fullscreenElement;
    }
}

class BinaryDataLoader {
    static async load(url) {
        const response = await fetch(url);
        return response.arrayBuffer();
    }
}

class UncompressedTextureLoader {
    static load(url, gl, minFilter = gl.LINEAR, magFilter = gl.LINEAR, clamp = false) {
        return new Promise((resolve, reject) => {
            const texture = gl.createTexture();
            if (texture === null) {
                reject("Error creating WebGL texture");
                return;
            }
            const image = new Image();
            image.src = url;
            image.onload = () => {
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
                if (clamp === true) {
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                }
                else {
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
                }
                gl.bindTexture(gl.TEXTURE_2D, null);
                if (image && image.src) {
                    console.log(`Loaded texture ${url} [${image.width}x${image.height}]`);
                }
                resolve(texture);
            };
            image.onerror = () => reject("Cannot load image");
        });
    }
    static async loadCubemap(url, gl, extension = "png") {
        const texture = gl.createTexture();
        if (texture === null) {
            throw new Error("Error creating WebGL texture");
        }
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        const promises = [
            { type: gl.TEXTURE_CUBE_MAP_POSITIVE_X, suffix: `-posx.${extension}` },
            { type: gl.TEXTURE_CUBE_MAP_NEGATIVE_X, suffix: `-negx.${extension}` },
            { type: gl.TEXTURE_CUBE_MAP_POSITIVE_Y, suffix: `-posy.${extension}` },
            { type: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, suffix: `-negy.${extension}` },
            { type: gl.TEXTURE_CUBE_MAP_POSITIVE_Z, suffix: `-posz.${extension}` },
            { type: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, suffix: `-negz.${extension}` }
        ].map(face => new Promise((resolve, reject) => {
            const image = new Image();
            image.src = url + face.suffix;
            image.onload = () => {
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
                // gl.texImage2D(face.type, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                gl.texImage2D(face.type, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
                if (image && image.src) {
                    console.log(`Loaded texture ${url}${face.suffix} [${image.width}x${image.height}]`);
                }
                resolve();
            };
            image.onerror = () => reject("Cannot load image");
        }));
        await Promise.all(promises);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return texture;
    }
}

class FullModel {
    /** Default constructor. */
    constructor() {
        /** Number of model indices. */
        this.numIndices = 0;
    }
    loadBuffer(gl, buffer, target, arrayBuffer) {
        var byteArray = new Uint8Array(arrayBuffer, 0, arrayBuffer.byteLength);
        gl.bindBuffer(target, buffer);
        gl.bufferData(target, byteArray, gl.STATIC_DRAW);
    }
    /**
     * Loads model.
     *
     * @param url Base URL to model indices and strides files.
     * @param gl WebGL context.
     * @returns Promise which resolves when model is loaded.
     */
    async load(url, gl) {
        const [dataIndices, dataStrides] = await Promise.all([
            BinaryDataLoader.load(`${url}-indices.bin`),
            BinaryDataLoader.load(`${url}-strides.bin`)
        ]);
        console.log(`Loaded ${url}-indices.bin (${dataIndices.byteLength} bytes)`);
        console.log(`Loaded ${url}-strides.bin (${dataStrides.byteLength} bytes)`);
        this.bufferIndices = gl.createBuffer();
        this.loadBuffer(gl, this.bufferIndices, gl.ELEMENT_ARRAY_BUFFER, dataIndices);
        this.numIndices = dataIndices.byteLength / 2 / 3;
        this.bufferStrides = gl.createBuffer();
        this.loadBuffer(gl, this.bufferStrides, gl.ARRAY_BUFFER, dataStrides);
    }
    /**
     * Binds buffers for a `glDrawElements()` call.
     *
     * @param gl WebGL context.
     */
    bindBuffers(gl) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferStrides);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufferIndices);
    }
    /**
     * Returns number of indices in model.
     *
     * @return Number of indices
     */
    getNumIndices() {
        return this.numIndices;
    }
}

class BaseShader {
    /**
     * Constructor. Compiles shader.
     *
     * @param gl WebGL context.
     */
    constructor(gl) {
        this.gl = gl;
        this.vertexShaderCode = "";
        this.fragmentShaderCode = "";
        this.fillCode();
        this.initShader();
    }
    /**
     * Creates WebGL shader from code.
     *
     * @param type Shader type.
     * @param code GLSL code.
     * @returns Shader or `undefined` if there were errors during shader compilation.
     */
    getShader(type, code) {
        const shader = this.gl.createShader(type);
        if (!shader) {
            console.warn('Error creating shader.');
            return undefined;
        }
        this.gl.shaderSource(shader, code);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.warn(this.gl.getShaderInfoLog(shader));
            return undefined;
        }
        return shader;
    }
    /**
     * Get shader unform location.
     *
     * @param uniform Uniform name.
     * @return Uniform location.
     */
    getUniform(uniform) {
        if (this.program === undefined) {
            throw new Error('No program for shader.');
        }
        const result = this.gl.getUniformLocation(this.program, uniform);
        if (result !== null) {
            return result;
        }
        else {
            throw new Error(`Cannot get uniform "${uniform}".`);
        }
    }
    /**
     * Get shader attribute location.
     *
     * @param attrib Attribute name.
     * @return Attribute location.
     */
    getAttrib(attrib) {
        if (this.program === undefined) {
            throw new Error("No program for shader.");
        }
        return this.gl.getAttribLocation(this.program, attrib);
    }
    /** Initializes shader. */
    initShader() {
        const fragmentShader = this.getShader(this.gl.FRAGMENT_SHADER, this.fragmentShaderCode);
        const vertexShader = this.getShader(this.gl.VERTEX_SHADER, this.vertexShaderCode);
        const shaderProgram = this.gl.createProgram();
        if (fragmentShader === undefined || vertexShader === undefined || shaderProgram === null) {
            return;
        }
        this.gl.attachShader(shaderProgram, vertexShader);
        this.gl.attachShader(shaderProgram, fragmentShader);
        this.gl.linkProgram(shaderProgram);
        if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
            console.warn(this.constructor.name + ": Could not initialise shader");
        }
        else {
            console.log(this.constructor.name + ": Initialised shader");
        }
        this.gl.useProgram(shaderProgram);
        this.program = shaderProgram;
        this.fillUniformsAttributes();
    }
    /** Activates shader. */
    use() {
        if (this.program) {
            this.gl.useProgram(this.program);
        }
    }
    /** Deletes shader. */
    deleteProgram() {
        if (this.program) {
            this.gl.deleteProgram(this.program);
        }
    }
}

/**
 * Common utilities
 * @module glMatrix
 */
// Configuration Constants
var EPSILON$1 = 0.000001;
var ARRAY_TYPE$1 = typeof Float32Array !== 'undefined' ? Float32Array : Array;
if (!Math.hypot) Math.hypot = function () {
  var y = 0,
      i = arguments.length;

  while (i--) {
    y += arguments[i] * arguments[i];
  }

  return Math.sqrt(y);
};

/**
 * 3x3 Matrix
 * @module mat3
 */

/**
 * Creates a new identity mat3
 *
 * @returns {mat3} a new 3x3 matrix
 */

function create$2() {
  var out = new ARRAY_TYPE$1(9);

  if (ARRAY_TYPE$1 != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
  }

  out[0] = 1;
  out[4] = 1;
  out[8] = 1;
  return out;
}

/**
 * 4x4 Matrix<br>Format: column-major, when typed out it looks like row-major<br>The matrices are being post multiplied.
 * @module mat4
 */

/**
 * Creates a new identity mat4
 *
 * @returns {mat4} a new 4x4 matrix
 */

function create$3() {
  var out = new ARRAY_TYPE$1(16);

  if (ARRAY_TYPE$1 != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
  }

  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
}
/**
 * Set a mat4 to the identity matrix
 *
 * @param {mat4} out the receiving matrix
 * @returns {mat4} out
 */

function identity$3(out) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = 1;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 1;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Multiplies two mat4s
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the first operand
 * @param {ReadonlyMat4} b the second operand
 * @returns {mat4} out
 */

function multiply$3(out, a, b) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15]; // Cache only the current line of the second matrix

  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[4];
  b1 = b[5];
  b2 = b[6];
  b3 = b[7];
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[8];
  b1 = b[9];
  b2 = b[10];
  b3 = b[11];
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[12];
  b1 = b[13];
  b2 = b[14];
  b3 = b[15];
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  return out;
}
/**
 * Translate a mat4 by the given vector
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to translate
 * @param {ReadonlyVec3} v vector to translate by
 * @returns {mat4} out
 */

function translate$2(out, a, v) {
  var x = v[0],
      y = v[1],
      z = v[2];
  var a00, a01, a02, a03;
  var a10, a11, a12, a13;
  var a20, a21, a22, a23;

  if (a === out) {
    out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
    out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
    out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
    out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
  } else {
    a00 = a[0];
    a01 = a[1];
    a02 = a[2];
    a03 = a[3];
    a10 = a[4];
    a11 = a[5];
    a12 = a[6];
    a13 = a[7];
    a20 = a[8];
    a21 = a[9];
    a22 = a[10];
    a23 = a[11];
    out[0] = a00;
    out[1] = a01;
    out[2] = a02;
    out[3] = a03;
    out[4] = a10;
    out[5] = a11;
    out[6] = a12;
    out[7] = a13;
    out[8] = a20;
    out[9] = a21;
    out[10] = a22;
    out[11] = a23;
    out[12] = a00 * x + a10 * y + a20 * z + a[12];
    out[13] = a01 * x + a11 * y + a21 * z + a[13];
    out[14] = a02 * x + a12 * y + a22 * z + a[14];
    out[15] = a03 * x + a13 * y + a23 * z + a[15];
  }

  return out;
}
/**
 * Scales the mat4 by the dimensions in the given vec3 not using vectorization
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to scale
 * @param {ReadonlyVec3} v the vec3 to scale the matrix by
 * @returns {mat4} out
 **/

function scale$3(out, a, v) {
  var x = v[0],
      y = v[1],
      z = v[2];
  out[0] = a[0] * x;
  out[1] = a[1] * x;
  out[2] = a[2] * x;
  out[3] = a[3] * x;
  out[4] = a[4] * y;
  out[5] = a[5] * y;
  out[6] = a[6] * y;
  out[7] = a[7] * y;
  out[8] = a[8] * z;
  out[9] = a[9] * z;
  out[10] = a[10] * z;
  out[11] = a[11] * z;
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
/**
 * Rotates a mat4 by the given angle around the given axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @param {ReadonlyVec3} axis the axis to rotate around
 * @returns {mat4} out
 */

function rotate$3(out, a, rad, axis) {
  var x = axis[0],
      y = axis[1],
      z = axis[2];
  var len = Math.hypot(x, y, z);
  var s, c, t;
  var a00, a01, a02, a03;
  var a10, a11, a12, a13;
  var a20, a21, a22, a23;
  var b00, b01, b02;
  var b10, b11, b12;
  var b20, b21, b22;

  if (len < EPSILON$1) {
    return null;
  }

  len = 1 / len;
  x *= len;
  y *= len;
  z *= len;
  s = Math.sin(rad);
  c = Math.cos(rad);
  t = 1 - c;
  a00 = a[0];
  a01 = a[1];
  a02 = a[2];
  a03 = a[3];
  a10 = a[4];
  a11 = a[5];
  a12 = a[6];
  a13 = a[7];
  a20 = a[8];
  a21 = a[9];
  a22 = a[10];
  a23 = a[11]; // Construct the elements of the rotation matrix

  b00 = x * x * t + c;
  b01 = y * x * t + z * s;
  b02 = z * x * t - y * s;
  b10 = x * y * t - z * s;
  b11 = y * y * t + c;
  b12 = z * y * t + x * s;
  b20 = x * z * t + y * s;
  b21 = y * z * t - x * s;
  b22 = z * z * t + c; // Perform rotation-specific matrix multiplication

  out[0] = a00 * b00 + a10 * b01 + a20 * b02;
  out[1] = a01 * b00 + a11 * b01 + a21 * b02;
  out[2] = a02 * b00 + a12 * b01 + a22 * b02;
  out[3] = a03 * b00 + a13 * b01 + a23 * b02;
  out[4] = a00 * b10 + a10 * b11 + a20 * b12;
  out[5] = a01 * b10 + a11 * b11 + a21 * b12;
  out[6] = a02 * b10 + a12 * b11 + a22 * b12;
  out[7] = a03 * b10 + a13 * b11 + a23 * b12;
  out[8] = a00 * b20 + a10 * b21 + a20 * b22;
  out[9] = a01 * b20 + a11 * b21 + a21 * b22;
  out[10] = a02 * b20 + a12 * b21 + a22 * b22;
  out[11] = a03 * b20 + a13 * b21 + a23 * b22;

  if (a !== out) {
    // If the source and destination differ, copy the unchanged last row
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  }

  return out;
}
/**
 * Rotates a matrix by the given angle around the X axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateX$1(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a10 = a[4];
  var a11 = a[5];
  var a12 = a[6];
  var a13 = a[7];
  var a20 = a[8];
  var a21 = a[9];
  var a22 = a[10];
  var a23 = a[11];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged rows
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[4] = a10 * c + a20 * s;
  out[5] = a11 * c + a21 * s;
  out[6] = a12 * c + a22 * s;
  out[7] = a13 * c + a23 * s;
  out[8] = a20 * c - a10 * s;
  out[9] = a21 * c - a11 * s;
  out[10] = a22 * c - a12 * s;
  out[11] = a23 * c - a13 * s;
  return out;
}
/**
 * Rotates a matrix by the given angle around the Y axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateY$2(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a03 = a[3];
  var a20 = a[8];
  var a21 = a[9];
  var a22 = a[10];
  var a23 = a[11];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged rows
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[0] = a00 * c - a20 * s;
  out[1] = a01 * c - a21 * s;
  out[2] = a02 * c - a22 * s;
  out[3] = a03 * c - a23 * s;
  out[8] = a00 * s + a20 * c;
  out[9] = a01 * s + a21 * c;
  out[10] = a02 * s + a22 * c;
  out[11] = a03 * s + a23 * c;
  return out;
}
/**
 * Rotates a matrix by the given angle around the Z axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateZ$2(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a03 = a[3];
  var a10 = a[4];
  var a11 = a[5];
  var a12 = a[6];
  var a13 = a[7];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged last row
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[0] = a00 * c + a10 * s;
  out[1] = a01 * c + a11 * s;
  out[2] = a02 * c + a12 * s;
  out[3] = a03 * c + a13 * s;
  out[4] = a10 * c - a00 * s;
  out[5] = a11 * c - a01 * s;
  out[6] = a12 * c - a02 * s;
  out[7] = a13 * c - a03 * s;
  return out;
}
/**
 * Generates a frustum matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {Number} left Left bound of the frustum
 * @param {Number} right Right bound of the frustum
 * @param {Number} bottom Bottom bound of the frustum
 * @param {Number} top Top bound of the frustum
 * @param {Number} near Near bound of the frustum
 * @param {Number} far Far bound of the frustum
 * @returns {mat4} out
 */

function frustum(out, left, right, bottom, top, near, far) {
  var rl = 1 / (right - left);
  var tb = 1 / (top - bottom);
  var nf = 1 / (near - far);
  out[0] = near * 2 * rl;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = near * 2 * tb;
  out[6] = 0;
  out[7] = 0;
  out[8] = (right + left) * rl;
  out[9] = (top + bottom) * tb;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[14] = far * near * 2 * nf;
  out[15] = 0;
  return out;
}

/**
 * 3 Dimensional Vector
 * @module vec3
 */

/**
 * Creates a new, empty vec3
 *
 * @returns {vec3} a new 3D vector
 */

function create$4() {
  var out = new ARRAY_TYPE$1(3);

  if (ARRAY_TYPE$1 != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }

  return out;
}
/**
 * Calculates the length of a vec3
 *
 * @param {ReadonlyVec3} a vector to calculate length of
 * @returns {Number} length of a
 */

function length(a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  return Math.hypot(x, y, z);
}
/**
 * Creates a new vec3 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} a new 3D vector
 */

function fromValues$4(x, y, z) {
  var out = new ARRAY_TYPE$1(3);
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}
/**
 * Normalize a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to normalize
 * @returns {vec3} out
 */

function normalize$1(out, a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var len = x * x + y * y + z * z;

  if (len > 0) {
    //TODO: evaluate use of glm_invsqrt here?
    len = 1 / Math.sqrt(len);
  }

  out[0] = a[0] * len;
  out[1] = a[1] * len;
  out[2] = a[2] * len;
  return out;
}
/**
 * Calculates the dot product of two vec3's
 *
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {Number} dot product of a and b
 */

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
/**
 * Computes the cross product of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function cross(out, a, b) {
  var ax = a[0],
      ay = a[1],
      az = a[2];
  var bx = b[0],
      by = b[1],
      bz = b[2];
  out[0] = ay * bz - az * by;
  out[1] = az * bx - ax * bz;
  out[2] = ax * by - ay * bx;
  return out;
}
/**
 * Alias for {@link vec3.length}
 * @function
 */

var len = length;
/**
 * Perform some operation over an array of vec3s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

(function () {
  var vec = create$4();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 3;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
    }

    return a;
  };
})();

/**
 * 4 Dimensional Vector
 * @module vec4
 */

/**
 * Creates a new, empty vec4
 *
 * @returns {vec4} a new 4D vector
 */

function create$5() {
  var out = new ARRAY_TYPE$1(4);

  if (ARRAY_TYPE$1 != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
  }

  return out;
}
/**
 * Normalize a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a vector to normalize
 * @returns {vec4} out
 */

function normalize$1$1(out, a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var w = a[3];
  var len = x * x + y * y + z * z + w * w;

  if (len > 0) {
    len = 1 / Math.sqrt(len);
  }

  out[0] = x * len;
  out[1] = y * len;
  out[2] = z * len;
  out[3] = w * len;
  return out;
}
/**
 * Perform some operation over an array of vec4s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec4. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec4s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

(function () {
  var vec = create$5();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 4;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      vec[3] = a[i + 3];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
      a[i + 3] = vec[3];
    }

    return a;
  };
})();

/**
 * Quaternion
 * @module quat
 */

/**
 * Creates a new identity quat
 *
 * @returns {quat} a new quaternion
 */

function create$6() {
  var out = new ARRAY_TYPE$1(4);

  if (ARRAY_TYPE$1 != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }

  out[3] = 1;
  return out;
}
/**
 * Sets a quat from the given angle and rotation axis,
 * then returns it.
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyVec3} axis the axis around which to rotate
 * @param {Number} rad the angle in radians
 * @returns {quat} out
 **/

function setAxisAngle(out, axis, rad) {
  rad = rad * 0.5;
  var s = Math.sin(rad);
  out[0] = s * axis[0];
  out[1] = s * axis[1];
  out[2] = s * axis[2];
  out[3] = Math.cos(rad);
  return out;
}
/**
 * Performs a spherical linear interpolation between two quat
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a the first operand
 * @param {ReadonlyQuat} b the second operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {quat} out
 */

function slerp(out, a, b, t) {
  // benchmarks:
  //    http://jsperf.com/quaternion-slerp-implementations
  var ax = a[0],
      ay = a[1],
      az = a[2],
      aw = a[3];
  var bx = b[0],
      by = b[1],
      bz = b[2],
      bw = b[3];
  var omega, cosom, sinom, scale0, scale1; // calc cosine

  cosom = ax * bx + ay * by + az * bz + aw * bw; // adjust signs (if necessary)

  if (cosom < 0.0) {
    cosom = -cosom;
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
  } // calculate coefficients


  if (1.0 - cosom > EPSILON$1) {
    // standard case (slerp)
    omega = Math.acos(cosom);
    sinom = Math.sin(omega);
    scale0 = Math.sin((1.0 - t) * omega) / sinom;
    scale1 = Math.sin(t * omega) / sinom;
  } else {
    // "from" and "to" quaternions are very close
    //  ... so we can do a linear interpolation
    scale0 = 1.0 - t;
    scale1 = t;
  } // calculate final values


  out[0] = scale0 * ax + scale1 * bx;
  out[1] = scale0 * ay + scale1 * by;
  out[2] = scale0 * az + scale1 * bz;
  out[3] = scale0 * aw + scale1 * bw;
  return out;
}
/**
 * Creates a quaternion from the given 3x3 rotation matrix.
 *
 * NOTE: The resultant quaternion is not normalized, so you should be sure
 * to renormalize the quaternion yourself where necessary.
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyMat3} m rotation matrix
 * @returns {quat} out
 * @function
 */

function fromMat3(out, m) {
  // Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
  // article "Quaternion Calculus and Fast Animation".
  var fTrace = m[0] + m[4] + m[8];
  var fRoot;

  if (fTrace > 0.0) {
    // |w| > 1/2, may as well choose w > 1/2
    fRoot = Math.sqrt(fTrace + 1.0); // 2w

    out[3] = 0.5 * fRoot;
    fRoot = 0.5 / fRoot; // 1/(4w)

    out[0] = (m[5] - m[7]) * fRoot;
    out[1] = (m[6] - m[2]) * fRoot;
    out[2] = (m[1] - m[3]) * fRoot;
  } else {
    // |w| <= 1/2
    var i = 0;
    if (m[4] > m[0]) i = 1;
    if (m[8] > m[i * 3 + i]) i = 2;
    var j = (i + 1) % 3;
    var k = (i + 2) % 3;
    fRoot = Math.sqrt(m[i * 3 + i] - m[j * 3 + j] - m[k * 3 + k] + 1.0);
    out[i] = 0.5 * fRoot;
    fRoot = 0.5 / fRoot;
    out[3] = (m[j * 3 + k] - m[k * 3 + j]) * fRoot;
    out[j] = (m[j * 3 + i] + m[i * 3 + j]) * fRoot;
    out[k] = (m[k * 3 + i] + m[i * 3 + k]) * fRoot;
  }

  return out;
}
/**
 * Normalize a quat
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a quaternion to normalize
 * @returns {quat} out
 * @function
 */

var normalize$2 = normalize$1$1;
/**
 * Sets a quaternion to represent the shortest rotation from one
 * vector to another.
 *
 * Both vectors are assumed to be unit length.
 *
 * @param {quat} out the receiving quaternion.
 * @param {ReadonlyVec3} a the initial vector
 * @param {ReadonlyVec3} b the destination vector
 * @returns {quat} out
 */

(function () {
  var tmpvec3 = create$4();
  var xUnitVec3 = fromValues$4(1, 0, 0);
  var yUnitVec3 = fromValues$4(0, 1, 0);
  return function (out, a, b) {
    var dot$$1 = dot(a, b);

    if (dot$$1 < -0.999999) {
      cross(tmpvec3, xUnitVec3, a);
      if (len(tmpvec3) < 0.000001) cross(tmpvec3, yUnitVec3, a);
      normalize$1(tmpvec3, tmpvec3);
      setAxisAngle(out, tmpvec3, Math.PI);
      return out;
    } else if (dot$$1 > 0.999999) {
      out[0] = 0;
      out[1] = 0;
      out[2] = 0;
      out[3] = 1;
      return out;
    } else {
      cross(tmpvec3, a, b);
      out[0] = tmpvec3[0];
      out[1] = tmpvec3[1];
      out[2] = tmpvec3[2];
      out[3] = 1 + dot$$1;
      return normalize$2(out, out);
    }
  };
})();
/**
 * Performs a spherical linear interpolation with two control points
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a the first operand
 * @param {ReadonlyQuat} b the second operand
 * @param {ReadonlyQuat} c the third operand
 * @param {ReadonlyQuat} d the fourth operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {quat} out
 */

(function () {
  var temp1 = create$6();
  var temp2 = create$6();
  return function (out, a, b, c, d, t) {
    slerp(temp1, a, d, t);
    slerp(temp2, b, c, t);
    slerp(out, temp1, temp2, 2 * t * (1 - t));
    return out;
  };
})();
/**
 * Sets the specified quaternion with values corresponding to the given
 * axes. Each axis is a vec3 and is expected to be unit length and
 * perpendicular to all other specified axes.
 *
 * @param {ReadonlyVec3} view  the vector representing the viewing direction
 * @param {ReadonlyVec3} right the vector representing the local "right" direction
 * @param {ReadonlyVec3} up    the vector representing the local "up" direction
 * @returns {quat} out
 */

(function () {
  var matr = create$2();
  return function (out, view, right, up) {
    matr[0] = right[0];
    matr[3] = right[1];
    matr[6] = right[2];
    matr[1] = up[0];
    matr[4] = up[1];
    matr[7] = up[2];
    matr[2] = -view[0];
    matr[5] = -view[1];
    matr[8] = -view[2];
    return normalize$2(out, fromMat3(out, matr));
  };
})();

/**
 * 2 Dimensional Vector
 * @module vec2
 */

/**
 * Creates a new, empty vec2
 *
 * @returns {vec2} a new 2D vector
 */

function create$8() {
  var out = new ARRAY_TYPE$1(2);

  if (ARRAY_TYPE$1 != Float32Array) {
    out[0] = 0;
    out[1] = 0;
  }

  return out;
}
/**
 * Perform some operation over an array of vec2s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec2. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec2s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

(function () {
  var vec = create$8();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 2;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
    }

    return a;
  };
})();

class BaseRenderer {
    constructor() {
        this.mMMatrix = create$3();
        this.mVMatrix = create$3();
        this.mMVPMatrix = create$3();
        this.mProjMatrix = create$3();
        this.matOrtho = create$3();
        this.m_boundTick = this.tick.bind(this);
        this.isWebGL2 = false;
        this.viewportWidth = 0;
        this.viewportHeight = 0;
    }
    /** Getter for current WebGL context. */
    get gl() {
        if (this.m_gl === undefined) {
            throw new Error("No WebGL context");
        }
        return this.m_gl;
    }
    /** Logs last GL error to console */
    logGLError() {
        var err = this.gl.getError();
        if (err !== this.gl.NO_ERROR) {
            console.warn(`WebGL error # + ${err}`);
        }
    }
    /**
     * Binds 2D texture.
     *
     * @param textureUnit A texture unit to use
     * @param texture A texture to be used
     * @param uniform Shader's uniform ID
     */
    setTexture2D(textureUnit, texture, uniform) {
        this.gl.activeTexture(this.gl.TEXTURE0 + textureUnit);
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.uniform1i(uniform, textureUnit);
    }
    /**
     * Binds cubemap texture.
     *
     * @param textureUnit A texture unit to use
     * @param texture A texture to be used
     * @param uniform Shader's uniform ID
     */
    setTextureCubemap(textureUnit, texture, uniform) {
        this.gl.activeTexture(this.gl.TEXTURE0 + textureUnit);
        this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, texture);
        this.gl.uniform1i(uniform, textureUnit);
    }
    /**
     * Calculates FOV for matrix.
     *
     * @param matrix Output matrix
     * @param fovY Vertical FOV in degrees
     * @param aspect Aspect ratio of viewport
     * @param zNear Near clipping plane distance
     * @param zFar Far clipping plane distance
     */
    setFOV(matrix, fovY, aspect, zNear, zFar) {
        const fH = Math.tan(fovY / 360.0 * Math.PI) * zNear;
        const fW = fH * aspect;
        frustum(matrix, -fW, fW, -fH, fH, zNear, zFar);
    }
    /**
     * Calculates MVP matrix. Saved in this.mMVPMatrix
     */
    calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz) {
        identity$3(this.mMMatrix);
        rotate$3(this.mMMatrix, this.mMMatrix, 0, [1, 0, 0]);
        translate$2(this.mMMatrix, this.mMMatrix, [tx, ty, tz]);
        scale$3(this.mMMatrix, this.mMMatrix, [sx, sy, sz]);
        rotateX$1(this.mMMatrix, this.mMMatrix, rx);
        rotateY$2(this.mMMatrix, this.mMMatrix, ry);
        rotateZ$2(this.mMMatrix, this.mMMatrix, rz);
        multiply$3(this.mMVPMatrix, this.mVMatrix, this.mMMatrix);
        multiply$3(this.mMVPMatrix, this.mProjMatrix, this.mMVPMatrix);
    }
    /** Perform each frame's draw calls here. */
    drawScene() {
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }
    /** Called on each frame. */
    tick() {
        requestAnimationFrame(this.m_boundTick);
        this.resizeCanvas();
        this.drawScene();
        this.animate();
    }
    /**
     * Initializes WebGL context.
     *
     * @param canvas Canvas to initialize WebGL.
     */
    initGL(canvas) {
        const gl = canvas.getContext("webgl", { alpha: false });
        if (gl === null) {
            throw new Error("Cannot initialize WebGL context");
        }
        // this.isETC1Supported = !!gl.getExtension('WEBGL_compressed_texture_etc1');
        return gl;
    }
    ;
    /**
     * Initializes WebGL 2 context
     *
     * @param canvas Canvas to initialize WebGL 2.
     */
    initGL2(canvas) {
        let gl = canvas.getContext("webgl2", { alpha: false });
        if (gl === null) {
            console.warn('Could not initialise WebGL 2, falling back to WebGL 1');
            return this.initGL(canvas);
        }
        return gl;
    }
    ;
    /**
     * Generates mipmasp for textures.
     *
     * @param textures Textures to generate mipmaps for.
     */
    generateMipmaps(...textures) {
        for (const texture of textures) {
            this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR);
            this.gl.generateMipmap(this.gl.TEXTURE_2D);
        }
    }
    /**
     * Initializes WebGL and calls all callbacks.
     *
     * @param canvasID ID of canvas element to initialize WebGL.
     * @param requestWebGL2 Set to `true` to initialize WebGL 2 context.
     */
    init(canvasID, requestWebGL2 = false) {
        this.onBeforeInit();
        this.canvas = document.getElementById(canvasID);
        if (this.canvas === null) {
            throw new Error("Cannot find canvas element");
        }
        this.viewportWidth = this.canvas.width;
        this.viewportHeight = this.canvas.height;
        this.m_gl = !!requestWebGL2 ? this.initGL2(this.canvas) : this.initGL(this.canvas);
        if (this.m_gl) {
            this.resizeCanvas();
            this.onAfterInit();
            this.initShaders();
            this.loadData();
            this.m_boundTick();
        }
        else {
            this.onInitError();
        }
    }
    /** Adjusts viewport according to resizing of canvas. */
    resizeCanvas() {
        if (this.canvas === undefined) {
            return;
        }
        const cssToRealPixels = window.devicePixelRatio || 1;
        const displayWidth = Math.floor(this.canvas.clientWidth * cssToRealPixels);
        const displayHeight = Math.floor(this.canvas.clientHeight * cssToRealPixels);
        if (this.canvas.width != displayWidth || this.canvas.height != displayHeight) {
            this.canvas.width = displayWidth;
            this.canvas.height = displayHeight;
        }
    }
    /**
     * Logs GL error to console.
     *
     * @param operation Operation name.
     */
    checkGlError(operation) {
        let error;
        while ((error = this.gl.getError()) !== this.gl.NO_ERROR) {
            console.error(`${operation}: glError ${error}`);
        }
    }
    /** @inheritdoc */
    unbindBuffers() {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);
    }
    /** @inheritdoc */
    getMVPMatrix() {
        return this.mMVPMatrix;
    }
    /** @inheritdoc */
    getOrthoMatrix() {
        return this.matOrtho;
    }
    /** @inheritdoc */
    getModelMatrix() {
        return this.mMMatrix;
    }
    /** @inheritdoc */
    getViewMatrix() {
        return this.mVMatrix;
    }
}

class FrameBuffer {
    /** Constructor. */
    constructor(gl) {
        this.gl = gl;
        this.m_textureHandle = null;
        this.m_depthTextureHandle = null;
        this.m_framebufferHandle = null;
        this.m_depthbufferHandle = null;
    }
    /** Creates OpenGL objects */
    createGLData(width, height) {
        this.m_width = width;
        this.m_height = height;
        if (this.m_textureHandle !== null && this.m_width > 0 && this.m_height > 0) {
            this.m_framebufferHandle = this.gl.createFramebuffer(); // alternative to GLES20.glGenFramebuffers()
            if (this.m_textureHandle !== null) {
                this.gl.bindTexture(this.gl.TEXTURE_2D, this.m_textureHandle);
                this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.m_framebufferHandle);
                this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.m_textureHandle, 0);
                this.checkGlError("FB");
            }
            if (this.m_depthTextureHandle === null) {
                this.m_depthbufferHandle = this.gl.createRenderbuffer();
                this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.m_depthbufferHandle);
                this.checkGlError("FB - glBindRenderbuffer");
                this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, this.m_width, this.m_height);
                this.checkGlError("FB - glRenderbufferStorage");
                this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, this.m_depthbufferHandle);
                this.checkGlError("FB - glFramebufferRenderbuffer");
            }
            else {
                this.gl.bindTexture(this.gl.TEXTURE_2D, this.m_depthTextureHandle);
                this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.m_framebufferHandle);
                this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.TEXTURE_2D, this.m_depthTextureHandle, 0);
                this.checkGlError("FB depth");
            }
            const result = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
            if (result != this.gl.FRAMEBUFFER_COMPLETE) {
                console.error(`Error creating framebufer: ${result}`);
            }
            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);
            // this.gl.bindTexture(this.gl.TEXTURE_2D, 0);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        }
    }
    checkGlError(op) {
        let error;
        while ((error = this.gl.getError()) !== this.gl.NO_ERROR) {
            console.error(`${op}: glError ${error}`);
        }
    }
    get width() {
        return this.m_width;
    }
    set width(value) {
        this.m_width = value;
    }
    get height() {
        return this.m_height;
    }
    set height(value) {
        this.m_height = value;
    }
    get textureHandle() {
        return this.m_textureHandle;
    }
    set textureHandle(value) {
        this.m_textureHandle = value;
    }
    get depthbufferHandle() {
        return this.m_depthbufferHandle;
    }
    set depthbufferHandle(value) {
        this.m_depthbufferHandle = value;
    }
    get framebufferHandle() {
        return this.m_framebufferHandle;
    }
    set framebufferHandle(value) {
        this.m_framebufferHandle = value;
    }
    get depthTextureHandle() {
        return this.m_depthTextureHandle;
    }
    set depthTextureHandle(value) {
        this.m_depthTextureHandle = value;
    }
}

/** Utilities to create various textures. */
class TextureUtils {
    /**
     * Creates non-power-of-two (NPOT) texture.
     *
     * @param gl WebGL context.
     * @param texWidth Texture width.
     * @param texHeight Texture height.
     * @param hasAlpha Set to `true` to create texture with alpha channel.
     */
    static createNpotTexture(gl, texWidth, texHeight, hasAlpha = false) {
        const textureID = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, textureID);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        let glFormat = null, glInternalFormat = null;
        if (hasAlpha) {
            glFormat = gl.RGBA;
            glInternalFormat = gl.RGBA;
        }
        else {
            glFormat = gl.RGB;
            glInternalFormat = gl.RGB;
        }
        gl.texImage2D(gl.TEXTURE_2D, 0, glInternalFormat, texWidth, texHeight, 0, glFormat, gl.UNSIGNED_BYTE, null);
        return textureID;
    }
    /**
     * Creates depth texture.
     *
     * @param gl WebGL context.
     * @param texWidth Texture width.
     * @param texHeight Texture height.
     */
    static createDepthTexture(gl, texWidth, texHeight) {
        const textureID = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, textureID);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        const version = gl.getParameter(gl.VERSION) || "";
        const glFormat = gl.DEPTH_COMPONENT;
        const glInternalFormat = version.includes("WebGL 2")
            ? gl.DEPTH_COMPONENT16
            : gl.DEPTH_COMPONENT;
        const type = gl.UNSIGNED_SHORT;
        // In WebGL, we cannot pass array to depth texture.
        gl.texImage2D(gl.TEXTURE_2D, 0, glInternalFormat, texWidth, texHeight, 0, glFormat, type, null);
        return textureID;
    }
}

class DiffuseShader extends BaseShader {
    /** @inheritdoc */
    fillCode() {
        this.vertexShaderCode = 'uniform mat4 view_proj_matrix;\n' +
            'attribute vec4 rm_Vertex;\n' +
            'attribute vec2 rm_TexCoord0;\n' +
            'varying vec2 vTextureCoord;\n' +
            '\n' +
            'void main() {\n' +
            '  gl_Position = view_proj_matrix * rm_Vertex;\n' +
            '  vTextureCoord = rm_TexCoord0;\n' +
            '}';
        this.fragmentShaderCode = 'precision mediump float;\n' +
            'varying vec2 vTextureCoord;\n' +
            'uniform sampler2D sTexture;\n' +
            '\n' +
            'void main() {\n' +
            '  gl_FragColor = texture2D(sTexture, vTextureCoord);\n' +
            '}';
    }
    /** @inheritdoc */
    fillUniformsAttributes() {
        this.view_proj_matrix = this.getUniform('view_proj_matrix');
        this.rm_Vertex = this.getAttrib('rm_Vertex');
        this.rm_TexCoord0 = this.getAttrib('rm_TexCoord0');
        this.sTexture = this.getUniform('sTexture');
    }
    /** @inheritdoc */
    drawModel(renderer, model, tx, ty, tz, rx, ry, rz, sx, sy, sz) {
        if (this.rm_Vertex === undefined || this.rm_TexCoord0 === undefined || this.view_proj_matrix === undefined) {
            return;
        }
        const gl = renderer.gl;
        model.bindBuffers(gl);
        gl.enableVertexAttribArray(this.rm_Vertex);
        gl.enableVertexAttribArray(this.rm_TexCoord0);
        gl.vertexAttribPointer(this.rm_Vertex, 3, gl.FLOAT, false, 4 * (3 + 2), 0);
        gl.vertexAttribPointer(this.rm_TexCoord0, 2, gl.FLOAT, false, 4 * (3 + 2), 4 * 3);
        renderer.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);
        gl.uniformMatrix4fv(this.view_proj_matrix, false, renderer.getMVPMatrix());
        gl.drawElements(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0);
        renderer.checkGlError("DiffuseShader glDrawElements");
    }
}

/**
 * Common utilities
 * @module glMatrix
 */
// Configuration Constants
var EPSILON = 0.000001;
var ARRAY_TYPE = typeof Float32Array !== 'undefined' ? Float32Array : Array;
if (!Math.hypot) Math.hypot = function () {
  var y = 0,
      i = arguments.length;

  while (i--) {
    y += arguments[i] * arguments[i];
  }

  return Math.sqrt(y);
};

/**
 * 4x4 Matrix<br>Format: column-major, when typed out it looks like row-major<br>The matrices are being post multiplied.
 * @module mat4
 */

/**
 * Creates a new identity mat4
 *
 * @returns {mat4} a new 4x4 matrix
 */

function create$1() {
  var out = new ARRAY_TYPE(16);

  if (ARRAY_TYPE != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
  }

  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
}
/**
 * Creates a new mat4 initialized with values from an existing matrix
 *
 * @param {ReadonlyMat4} a matrix to clone
 * @returns {mat4} a new 4x4 matrix
 */

function clone(a) {
  var out = new ARRAY_TYPE(16);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  out[9] = a[9];
  out[10] = a[10];
  out[11] = a[11];
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
/**
 * Copy the values from one mat4 to another
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the source matrix
 * @returns {mat4} out
 */

function copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  out[9] = a[9];
  out[10] = a[10];
  out[11] = a[11];
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
/**
 * Set a mat4 to the identity matrix
 *
 * @param {mat4} out the receiving matrix
 * @returns {mat4} out
 */

function identity(out) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = 1;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 1;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Inverts a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the source matrix
 * @returns {mat4} out
 */

function invert(out, a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];
  var b00 = a00 * a11 - a01 * a10;
  var b01 = a00 * a12 - a02 * a10;
  var b02 = a00 * a13 - a03 * a10;
  var b03 = a01 * a12 - a02 * a11;
  var b04 = a01 * a13 - a03 * a11;
  var b05 = a02 * a13 - a03 * a12;
  var b06 = a20 * a31 - a21 * a30;
  var b07 = a20 * a32 - a22 * a30;
  var b08 = a20 * a33 - a23 * a30;
  var b09 = a21 * a32 - a22 * a31;
  var b10 = a21 * a33 - a23 * a31;
  var b11 = a22 * a33 - a23 * a32; // Calculate the determinant

  var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

  if (!det) {
    return null;
  }

  det = 1.0 / det;
  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return out;
}
/**
 * Translate a mat4 by the given vector
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to translate
 * @param {ReadonlyVec3} v vector to translate by
 * @returns {mat4} out
 */

function translate(out, a, v) {
  var x = v[0],
      y = v[1],
      z = v[2];
  var a00, a01, a02, a03;
  var a10, a11, a12, a13;
  var a20, a21, a22, a23;

  if (a === out) {
    out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
    out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
    out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
    out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
  } else {
    a00 = a[0];
    a01 = a[1];
    a02 = a[2];
    a03 = a[3];
    a10 = a[4];
    a11 = a[5];
    a12 = a[6];
    a13 = a[7];
    a20 = a[8];
    a21 = a[9];
    a22 = a[10];
    a23 = a[11];
    out[0] = a00;
    out[1] = a01;
    out[2] = a02;
    out[3] = a03;
    out[4] = a10;
    out[5] = a11;
    out[6] = a12;
    out[7] = a13;
    out[8] = a20;
    out[9] = a21;
    out[10] = a22;
    out[11] = a23;
    out[12] = a00 * x + a10 * y + a20 * z + a[12];
    out[13] = a01 * x + a11 * y + a21 * z + a[13];
    out[14] = a02 * x + a12 * y + a22 * z + a[14];
    out[15] = a03 * x + a13 * y + a23 * z + a[15];
  }

  return out;
}
/**
 * Rotates a matrix by the given angle around the X axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateX(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a10 = a[4];
  var a11 = a[5];
  var a12 = a[6];
  var a13 = a[7];
  var a20 = a[8];
  var a21 = a[9];
  var a22 = a[10];
  var a23 = a[11];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged rows
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[4] = a10 * c + a20 * s;
  out[5] = a11 * c + a21 * s;
  out[6] = a12 * c + a22 * s;
  out[7] = a13 * c + a23 * s;
  out[8] = a20 * c - a10 * s;
  out[9] = a21 * c - a11 * s;
  out[10] = a22 * c - a12 * s;
  out[11] = a23 * c - a13 * s;
  return out;
}
/**
 * Rotates a matrix by the given angle around the Y axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateY$1(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a03 = a[3];
  var a20 = a[8];
  var a21 = a[9];
  var a22 = a[10];
  var a23 = a[11];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged rows
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[0] = a00 * c - a20 * s;
  out[1] = a01 * c - a21 * s;
  out[2] = a02 * c - a22 * s;
  out[3] = a03 * c - a23 * s;
  out[8] = a00 * s + a20 * c;
  out[9] = a01 * s + a21 * c;
  out[10] = a02 * s + a22 * c;
  out[11] = a03 * s + a23 * c;
  return out;
}
/**
 * Rotates a matrix by the given angle around the Z axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateZ$1(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a03 = a[3];
  var a10 = a[4];
  var a11 = a[5];
  var a12 = a[6];
  var a13 = a[7];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged last row
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[0] = a00 * c + a10 * s;
  out[1] = a01 * c + a11 * s;
  out[2] = a02 * c + a12 * s;
  out[3] = a03 * c + a13 * s;
  out[4] = a10 * c - a00 * s;
  out[5] = a11 * c - a01 * s;
  out[6] = a12 * c - a02 * s;
  out[7] = a13 * c - a03 * s;
  return out;
}
/**
 * Returns the translation vector component of a transformation
 *  matrix. If a matrix is built with fromRotationTranslation,
 *  the returned vector will be the same as the translation vector
 *  originally supplied.
 * @param  {vec3} out Vector to receive translation component
 * @param  {ReadonlyMat4} mat Matrix to be decomposed (input)
 * @return {vec3} out
 */

function getTranslation(out, mat) {
  out[0] = mat[12];
  out[1] = mat[13];
  out[2] = mat[14];
  return out;
}
/**
 * Generates a orthogonal projection matrix with the given bounds.
 * The near/far clip planes correspond to a normalized device coordinate Z range of [-1, 1],
 * which matches WebGL/OpenGL's clip volume.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} left Left bound of the frustum
 * @param {number} right Right bound of the frustum
 * @param {number} bottom Bottom bound of the frustum
 * @param {number} top Top bound of the frustum
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */

function orthoNO(out, left, right, bottom, top, near, far) {
  var lr = 1 / (left - right);
  var bt = 1 / (bottom - top);
  var nf = 1 / (near - far);
  out[0] = -2 * lr;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = -2 * bt;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 2 * nf;
  out[11] = 0;
  out[12] = (left + right) * lr;
  out[13] = (top + bottom) * bt;
  out[14] = (far + near) * nf;
  out[15] = 1;
  return out;
}
/**
 * Alias for {@link mat4.orthoNO}
 * @function
 */

var ortho = orthoNO;
/**
 * Generates a look-at matrix with the given eye position, focal point, and up axis.
 * If you want a matrix that actually makes an object look at another object, you should use targetTo instead.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {ReadonlyVec3} eye Position of the viewer
 * @param {ReadonlyVec3} center Point the viewer is looking at
 * @param {ReadonlyVec3} up vec3 pointing up
 * @returns {mat4} out
 */

function lookAt(out, eye, center, up) {
  var x0, x1, x2, y0, y1, y2, z0, z1, z2, len;
  var eyex = eye[0];
  var eyey = eye[1];
  var eyez = eye[2];
  var upx = up[0];
  var upy = up[1];
  var upz = up[2];
  var centerx = center[0];
  var centery = center[1];
  var centerz = center[2];

  if (Math.abs(eyex - centerx) < EPSILON && Math.abs(eyey - centery) < EPSILON && Math.abs(eyez - centerz) < EPSILON) {
    return identity(out);
  }

  z0 = eyex - centerx;
  z1 = eyey - centery;
  z2 = eyez - centerz;
  len = 1 / Math.hypot(z0, z1, z2);
  z0 *= len;
  z1 *= len;
  z2 *= len;
  x0 = upy * z2 - upz * z1;
  x1 = upz * z0 - upx * z2;
  x2 = upx * z1 - upy * z0;
  len = Math.hypot(x0, x1, x2);

  if (!len) {
    x0 = 0;
    x1 = 0;
    x2 = 0;
  } else {
    len = 1 / len;
    x0 *= len;
    x1 *= len;
    x2 *= len;
  }

  y0 = z1 * x2 - z2 * x1;
  y1 = z2 * x0 - z0 * x2;
  y2 = z0 * x1 - z1 * x0;
  len = Math.hypot(y0, y1, y2);

  if (!len) {
    y0 = 0;
    y1 = 0;
    y2 = 0;
  } else {
    len = 1 / len;
    y0 *= len;
    y1 *= len;
    y2 *= len;
  }

  out[0] = x0;
  out[1] = y0;
  out[2] = z0;
  out[3] = 0;
  out[4] = x1;
  out[5] = y1;
  out[6] = z1;
  out[7] = 0;
  out[8] = x2;
  out[9] = y2;
  out[10] = z2;
  out[11] = 0;
  out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
  out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
  out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
  out[15] = 1;
  return out;
}

/**
 * 3 Dimensional Vector
 * @module vec3
 */

/**
 * Creates a new, empty vec3
 *
 * @returns {vec3} a new 3D vector
 */

function create() {
  var out = new ARRAY_TYPE(3);

  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }

  return out;
}
/**
 * Creates a new vec3 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} a new 3D vector
 */

function fromValues(x, y, z) {
  var out = new ARRAY_TYPE(3);
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}
/**
 * Adds two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  return out;
}
/**
 * Scales a vec3 by a scalar number
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec3} out
 */

function scale(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  return out;
}
/**
 * Normalize a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to normalize
 * @returns {vec3} out
 */

function normalize(out, a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var len = x * x + y * y + z * z;

  if (len > 0) {
    //TODO: evaluate use of glm_invsqrt here?
    len = 1 / Math.sqrt(len);
  }

  out[0] = a[0] * len;
  out[1] = a[1] * len;
  out[2] = a[2] * len;
  return out;
}
/**
 * Transforms the vec3 with a mat4.
 * 4th vector component is implicitly '1'
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to transform
 * @param {ReadonlyMat4} m matrix to transform with
 * @returns {vec3} out
 */

function transformMat4(out, a, m) {
  var x = a[0],
      y = a[1],
      z = a[2];
  var w = m[3] * x + m[7] * y + m[11] * z + m[15];
  w = w || 1.0;
  out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
  out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
  out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
  return out;
}
/**
 * Rotate a 3D vector around the y-axis
 * @param {vec3} out The receiving vec3
 * @param {ReadonlyVec3} a The vec3 point to rotate
 * @param {ReadonlyVec3} b The origin of the rotation
 * @param {Number} rad The angle of rotation in radians
 * @returns {vec3} out
 */

function rotateY(out, a, b, rad) {
  var p = [],
      r = []; //Translate point to the origin

  p[0] = a[0] - b[0];
  p[1] = a[1] - b[1];
  p[2] = a[2] - b[2]; //perform rotation

  r[0] = p[2] * Math.sin(rad) + p[0] * Math.cos(rad);
  r[1] = p[1];
  r[2] = p[2] * Math.cos(rad) - p[0] * Math.sin(rad); //translate to correct position

  out[0] = r[0] + b[0];
  out[1] = r[1] + b[1];
  out[2] = r[2] + b[2];
  return out;
}
/**
 * Rotate a 3D vector around the z-axis
 * @param {vec3} out The receiving vec3
 * @param {ReadonlyVec3} a The vec3 point to rotate
 * @param {ReadonlyVec3} b The origin of the rotation
 * @param {Number} rad The angle of rotation in radians
 * @returns {vec3} out
 */

function rotateZ(out, a, b, rad) {
  var p = [],
      r = []; //Translate point to the origin

  p[0] = a[0] - b[0];
  p[1] = a[1] - b[1];
  p[2] = a[2] - b[2]; //perform rotation

  r[0] = p[0] * Math.cos(rad) - p[1] * Math.sin(rad);
  r[1] = p[0] * Math.sin(rad) + p[1] * Math.cos(rad);
  r[2] = p[2]; //translate to correct position

  out[0] = r[0] + b[0];
  out[1] = r[1] + b[1];
  out[2] = r[2] + b[2];
  return out;
}
/**
 * Perform some operation over an array of vec3s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

(function () {
  var vec = create();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 3;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
    }

    return a;
  };
})();

var CameraMode;
(function (CameraMode) {
    CameraMode[CameraMode["Rotating"] = 0] = "Rotating";
    CameraMode[CameraMode["Random"] = 1] = "Random";
    CameraMode[CameraMode["Orbiting"] = 2] = "Orbiting";
    CameraMode[CameraMode["FPS"] = 3] = "FPS";
})(CameraMode || (CameraMode = {}));

/** Uniforms, varyings and constants for the fog VS. */
const FOG_UNIFORMS_VS = `
out float vFogAmount;
uniform float fogDistance;
uniform float fogStartDistance;
`;
/** Fog amount calculation in VS. */
const FOG_CHUNK_VS = `
vFogAmount = clamp((length(gl_Position) - fogStartDistance) / fogDistance, 0.0, 1.0);
`;
/** Uniforms, varyings and constants for the fog FS. */
const FOG_UNIFORMS_FS = `
in float vFogAmount;
uniform vec4 fogColor;
`;
/** Applying fog color in FS. GLES 3.0 */
const FOG_CHUNK_FS = `
fragColor = mix(fragColor, fogColor, vFogAmount);
`;

/**
 * Expensive 9 taps PCF.
 * Output is colorCoeff: 0 = fully shadowed, 1 = out of shadow
 */
/** Uniforms, varyings and constants for shadowmap VS. */
const UNIFORMS_VARYINGS_CONST_VS = `
uniform vec3 lightVector;
uniform mat4 projectionMatrix;
// uniform mat4 viewMatrix;
uniform mat4 modelMatrix;
uniform mat4 lightMatrix;
uniform float shadowBrightnessVS;

out highp vec4 vPosition;
out float vLamb;

const mat4 ScaleMatrix = mat4(0.5, 0.0, 0.0, 0.0, 0.0, 0.5, 0.0, 0.0, 0.0, 0.0, 0.5, 0.0, 0.5, 0.5, 0.5, 1.0);
// const float BIAS = 0.2; // adjustable, for 4096 shadowmap
// const float BIAS = 0.4; // adjustable, for 2048 shadowmap
const float BIAS = 0.1; // adjustable, for 2500 shadowmap
`;
/** Uniforms, varyings and constants for shadowmap FS. */
const UNIFORMS_VARYINGS_CONST_FS = `
in highp vec4 vPosition;
uniform sampler2D sDepth;
uniform highp float texelSize;
uniform float shadowBrightnessFS;
uniform float pcfBiasCorrection;
in float vLamb;

// const float PCF_BIAS_CORRECTION = 0.001; // for 4096 shadowmap
// const float PCF_BIAS_CORRECTION = 0.002; // for 2048 shadowmap
const float PCF_BIAS_CORRECTION = 0.0008; // larger values (as above) cause peterpanning
`;
/** Uniforms, varyings and constants for filtered shadowmap FS. */
const UNIFORMS_VARYINGS_CONST_FILTERED_FS = UNIFORMS_VARYINGS_CONST_FS.replace(/sampler2D/g, "mediump sampler2DShadow");
function shadowSmoothConditional5TapEs3(condition) {
    return `
    float colorCoeff = 0.; // 0 = fully shadowed, 1 = out of shadow
    depth.z -= pcfBiasCorrection;
    if (${condition}) { // unfiltered
        colorCoeff = texture(sDepth, depth);
    } else { // 5 taps PCF
        colorCoeff = texture(sDepth, depth);
        colorCoeff += texture(sDepth, vec3(depth.x-texelSize, depth.y-texelSize, depth.z));
        colorCoeff += texture(sDepth, vec3(depth.x-texelSize, depth.y+texelSize, depth.z));
        colorCoeff += texture(sDepth, vec3(depth.x+texelSize, depth.y-texelSize, depth.z));
        colorCoeff += texture(sDepth, vec3(depth.x+texelSize, depth.y+texelSize, depth.z));
        const float SAMPLES_COUNT = 5.0;
        colorCoeff /= SAMPLES_COUNT;
    }
    `;
}

/**
 * Uses indexed vertex colors.
 * Applies shadow map and Lambertian lighting.
 */
class VertexColorSmShader extends BaseShader {
    fillCode() {
        this.vertexShaderCode = `#version 300 es
            precision highp float;

            uniform vec4 lightDir;
            uniform mat4 view_matrix;
            uniform mat4 model_matrix;
            uniform mat4 view_proj_matrix;
            uniform float diffuseCoef;
            uniform float diffuseExponent;

            uniform vec3 colors[32];

            out vec4 vDiffuseColor;
            out float vLightCoeff;

            in vec4 rm_Vertex;
            in uint rm_Color;
            in vec3 rm_Normal;

            const float ONE = 1.0;
            const float ZERO = 0.0;

            // Shadowmaps stuff
            ${UNIFORMS_VARYINGS_CONST_VS}

            // Fog stuff
            ${FOG_UNIFORMS_VS}

            void main(void)
            {
                vec4 pos = model_matrix * rm_Vertex;

                gl_Position = view_proj_matrix * rm_Vertex;

                vec3 vLightVec = (view_matrix * lightDir).xyz;
                vec4 normal = model_matrix * vec4(rm_Normal, ZERO);
                vec3 vNormal = normalize(view_matrix * normal).xyz; // w component of rm_Normal might be ignored, and implicitly converted to vec4 in uniform declaration
                float d = pow(max(ZERO, dot(vNormal, normalize(vLightVec))), diffuseExponent); // redundant normalize() ??

                float angle = rm_Normal.z;

                vec4 color = vec4(colors[rm_Color], ONE);

                vDiffuseColor = color;
                vLightCoeff = d * diffuseCoef;

                // Shadowmap stuff
                vec3 LightVec = normalize(lightVector);
                vec3 worldNormal = normalize(mat3(modelMatrix) * rm_Normal);
                float lamb = (dot(worldNormal, LightVec)); // range is -1...1 https://chortle.ccsu.edu/vectorlessons/vch09/vch09_6.html
                vec4 vertex = rm_Vertex;
                vertex.xyz += worldNormal * BIAS * (ONE - lamb);
                vPosition = ScaleMatrix * projectionMatrix * lightMatrix * modelMatrix * vertex;

                // Fog stuff
                ${FOG_CHUNK_VS}
            }`;
        this.fragmentShaderCode = `#version 300 es
            precision mediump float;

            in mediump vec4 vDiffuseColor;
            in mediump float vLightCoeff;
            out vec4 fragColor;

            uniform mediump vec4 diffuse;
            uniform mediump vec4 ambient;

            // Shadowmaps stuff
            ${UNIFORMS_VARYINGS_CONST_FILTERED_FS}

            // Fog stuff
            ${FOG_UNIFORMS_FS}

            void main(void)
            {
                highp vec3 depth = vPosition.xyz / vPosition.w;

                ${shadowSmoothConditional5TapEs3("vFogAmount > 0.1")}

                colorCoeff = clamp(colorCoeff, shadowBrightnessFS, 1.); // clamp to limit shadow intensity
                float lightCoeff = min(colorCoeff, vLightCoeff); // this mixes Lambert and shadow coefficients
                fragColor = vDiffuseColor * mix(ambient, diffuse, lightCoeff);

                // Fog stuff
                ${FOG_CHUNK_FS}
            }`;
    }
    fillUniformsAttributes() {
        this.rm_Vertex = this.getAttrib("rm_Vertex");
        this.rm_Normal = this.getAttrib("rm_Normal");
        this.rm_Color = this.getAttrib("rm_Color");
        this.view_matrix = this.getUniform("view_matrix");
        this.view_proj_matrix = this.getUniform("view_proj_matrix");
        this.model_matrix = this.getUniform("model_matrix");
        this.ambient = this.getUniform("ambient");
        this.diffuse = this.getUniform("diffuse");
        this.lightDir = this.getUniform("lightDir");
        this.diffuseCoef = this.getUniform("diffuseCoef");
        this.diffuseExponent = this.getUniform("diffuseExponent");
        this.colors = this.getUniform("colors");
        this.sDepth = this.getUniform("sDepth");
        this.projectionMatrix = this.getUniform("projectionMatrix");
        this.modelMatrix = this.getUniform("modelMatrix");
        this.lightMatrix = this.getUniform("lightMatrix");
        this.texelSize = this.getUniform("texelSize");
        this.lightVector = this.getUniform("lightVector");
        this.shadowBrightnessFS = this.getUniform("shadowBrightnessFS");
        this.pcfBiasCorrection = this.getUniform("pcfBiasCorrection");
        // Fog stuff
        this.fogColor = this.getUniform("fogColor");
        this.fogStartDistance = this.getUniform("fogStartDistance");
        this.fogDistance = this.getUniform("fogDistance");
    }
    /** @inheritdoc */
    drawModel(renderer, model, tx, ty, tz, rx, ry, rz, sx, sy, sz) {
        if (this.rm_Vertex === undefined
            || this.rm_Normal === undefined
            || this.rm_Color === undefined
            || this.view_proj_matrix === undefined
            || this.view_matrix === undefined
            || this.model_matrix === undefined) {
            return;
        }
        const gl = renderer.gl;
        model.bindBuffers(gl);
        gl.enableVertexAttribArray(this.rm_Vertex);
        gl.enableVertexAttribArray(this.rm_Color);
        gl.enableVertexAttribArray(this.rm_Normal);
        gl.vertexAttribPointer(this.rm_Vertex, 3, gl.HALF_FLOAT, false, 12, 0);
        gl.vertexAttribIPointer(this.rm_Color, 1, gl.UNSIGNED_BYTE, 12, 6);
        gl.vertexAttribPointer(this.rm_Normal, 3, gl.BYTE, true, 12, 7);
        renderer.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);
        gl.uniformMatrix4fv(this.view_proj_matrix, false, renderer.getMVPMatrix());
        gl.uniformMatrix4fv(this.view_matrix, false, renderer.getViewMatrix());
        gl.uniformMatrix4fv(this.model_matrix, false, renderer.getModelMatrix());
        gl.drawElements(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0);
        renderer.checkGlError("VertexColorSmShader glDrawElements");
    }
}

/**
 * Uses the same strides as VertexColorSmShader.
 * Draws to depth map.
 */
class VertexColorDepthShader extends BaseShader {
    fillCode() {
        this.vertexShaderCode = `#version 300 es
            precision highp float;

            uniform mat4 view_proj_matrix;
            in vec4 rm_Vertex;

            void main(void) {
                gl_Position = view_proj_matrix * rm_Vertex;
            }`;
        this.fragmentShaderCode = `#version 300 es
            precision mediump float;

            void main(void) {
            }`;
    }
    fillUniformsAttributes() {
        this.rm_Vertex = this.getAttrib("rm_Vertex");
        this.view_proj_matrix = this.getUniform("view_proj_matrix");
    }
    /** @inheritdoc */
    drawModel(renderer, model, tx, ty, tz, rx, ry, rz, sx, sy, sz) {
        if (this.rm_Vertex === undefined || this.view_proj_matrix === undefined) {
            return;
        }
        const gl = renderer.gl;
        model.bindBuffers(gl);
        gl.enableVertexAttribArray(this.rm_Vertex);
        gl.vertexAttribPointer(this.rm_Vertex, 3, gl.HALF_FLOAT, false, 12, 0);
        renderer.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);
        gl.uniformMatrix4fv(this.view_proj_matrix, false, renderer.getMVPMatrix());
        gl.drawElements(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0);
        renderer.checkGlError("VertexColorSmShader glDrawElements");
    }
}

/**
 * Uses indexed vertex colors.
 * Applies shadow map and Lambertian lighting.
 */
class FlagSmShader extends BaseShader {
    fillCode() {
        this.vertexShaderCode = `#version 300 es
            precision highp float;

            uniform vec4 lightDir;
            uniform mat4 view_matrix;
            uniform mat4 model_matrix;
            uniform mat4 view_proj_matrix;
            uniform float diffuseCoef;
            uniform float diffuseExponent;

            uniform vec4 color;
            uniform float time;

            out vec4 vDiffuseColor;
            out float vLightCoeff;

            in vec4 rm_Vertex;
            in vec3 rm_Normal;

            const float ONE = 1.0;
            const float ZERO = 0.0;

            uniform float amplitude;
            uniform float waves;

            // Shadowmaps stuff
            ${UNIFORMS_VARYINGS_CONST_VS}

            // Fog stuff
            ${FOG_UNIFORMS_VS}

            const float NORMAL_BEND_COEFF = 0.6;

            void main(void)
            {
                vec4 vertex = rm_Vertex;
                vec3 animatedNormal = rm_Normal;

                float a = sin(time + rm_Vertex.y * waves);
                a *= amplitude;
                a *= vertex.y;
                vertex.x += a;

                float n = cos(time + rm_Vertex.y * waves) * NORMAL_BEND_COEFF;
                n *= vertex.y;
                animatedNormal.y = -n * animatedNormal.x;
                animatedNormal = normalize(animatedNormal);

                vec4 pos = model_matrix * vertex;

                gl_Position = view_proj_matrix * vertex;

                vec3 vLightVec = (view_matrix * lightDir).xyz;
                vec4 normal = model_matrix * vec4(animatedNormal, ZERO);
                vec3 vNormal = normalize(view_matrix * normal).xyz; // w component of animatedNormal might be ignored, and implicitly converted to vec4 in uniform declaration
                float d = pow(max(ZERO, dot(vNormal, normalize(vLightVec))), diffuseExponent); // redundant normalize() ??

                vDiffuseColor = color;
                vLightCoeff = d * diffuseCoef;

                // Shadowmap stuff
                vec3 LightVec = normalize(lightVector);
                vec3 worldNormal = normalize(mat3(modelMatrix) * animatedNormal);
                float lamb = (dot(worldNormal, LightVec)); // range is -1...1 https://chortle.ccsu.edu/vectorlessons/vch09/vch09_6.html
                vertex.xyz += worldNormal * BIAS * (ONE - lamb);
                vPosition = ScaleMatrix * projectionMatrix * lightMatrix * modelMatrix * vertex;

                // Fog stuff
                ${FOG_CHUNK_VS}
            }`;
        this.fragmentShaderCode = `#version 300 es
            precision mediump float;

            in vec2 vTexCoord;
            in vec4 vDiffuseColor;
            in float vLightCoeff;
            out vec4 fragColor;

            uniform mediump vec4 diffuse;
            uniform mediump vec4 ambient;

            // Shadowmaps stuff
            ${UNIFORMS_VARYINGS_CONST_FILTERED_FS}

            // Fog stuff
            ${FOG_UNIFORMS_FS}

            void main(void)
            {
                highp vec3 depth = vPosition.xyz / vPosition.w;
                ${shadowSmoothConditional5TapEs3("vFogAmount > 0.1")}
                colorCoeff = clamp(colorCoeff, shadowBrightnessFS, 1.); // clamp to limit shadow intensity
                float lightCoeff = min(colorCoeff, vLightCoeff); // this mixes Lambert and shadow coefficients
                fragColor = vDiffuseColor * mix(ambient, diffuse, lightCoeff);

                // Fog stuff
                ${FOG_CHUNK_FS}
            }`;
    }
    fillUniformsAttributes() {
        this.rm_Vertex = this.getAttrib("rm_Vertex");
        this.rm_Normal = this.getAttrib("rm_Normal");
        this.view_matrix = this.getUniform("view_matrix");
        this.view_proj_matrix = this.getUniform("view_proj_matrix");
        this.model_matrix = this.getUniform("model_matrix");
        this.ambient = this.getUniform("ambient");
        this.diffuse = this.getUniform("diffuse");
        this.lightDir = this.getUniform("lightDir");
        this.diffuseCoef = this.getUniform("diffuseCoef");
        this.diffuseExponent = this.getUniform("diffuseExponent");
        this.color = this.getUniform("color");
        this.time = this.getUniform("time");
        this.amplitude = this.getUniform("amplitude");
        this.waves = this.getUniform("waves");
        this.sDepth = this.getUniform("sDepth");
        this.projectionMatrix = this.getUniform("projectionMatrix");
        // this.viewMatrix = this.getUniform("viewMatrix");
        this.modelMatrix = this.getUniform("modelMatrix");
        this.lightMatrix = this.getUniform("lightMatrix");
        this.texelSize = this.getUniform("texelSize");
        this.lightVector = this.getUniform("lightVector");
        // this.shadowBrightnessVS = this.getUniform("shadowBrightnessVS"); // because vLamb is not used in this lighting model
        this.shadowBrightnessFS = this.getUniform("shadowBrightnessFS");
        this.pcfBiasCorrection = this.getUniform("pcfBiasCorrection");
        // Fog stuff
        this.fogColor = this.getUniform("fogColor");
        this.fogStartDistance = this.getUniform("fogStartDistance");
        this.fogDistance = this.getUniform("fogDistance");
    }
    /** @inheritdoc */
    drawModel(renderer, model, tx, ty, tz, rx, ry, rz, sx, sy, sz) {
        if (this.rm_Vertex === undefined
            || this.rm_Normal === undefined
            || this.view_proj_matrix === undefined
            || this.view_matrix === undefined
            || this.model_matrix === undefined) {
            return;
        }
        const gl = renderer.gl;
        model.bindBuffers(gl);
        gl.enableVertexAttribArray(this.rm_Vertex);
        gl.enableVertexAttribArray(this.rm_Normal);
        gl.vertexAttribPointer(this.rm_Vertex, 3, gl.HALF_FLOAT, false, 12, 0);
        gl.vertexAttribPointer(this.rm_Normal, 3, gl.BYTE, true, 12, 6);
        renderer.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);
        gl.uniformMatrix4fv(this.view_proj_matrix, false, renderer.getMVPMatrix());
        gl.uniformMatrix4fv(this.view_matrix, false, renderer.getViewMatrix());
        gl.uniformMatrix4fv(this.model_matrix, false, renderer.getModelMatrix());
        gl.drawElements(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0);
        renderer.checkGlError("VertexColorSmShader glDrawElements");
    }
}

/**
 * Uses the same strides as FlagSmShader.
 * Draws to depth map.
 */
class FlagDepthShader extends BaseShader {
    fillCode() {
        this.vertexShaderCode = `#version 300 es
            precision highp float;

            uniform mat4 view_proj_matrix;
            uniform float time;
            in vec4 rm_Vertex;

            uniform float amplitude;// = 0.2;
            uniform float waves;// = 5.;

            void main(void) {
                vec4 vertex = rm_Vertex;
                float a = sin(time + rm_Vertex.y * waves);
                a *= amplitude;
                a *= vertex.y;
                vertex.x += a;

                gl_Position = view_proj_matrix * vertex;
            }`;
        this.fragmentShaderCode = `#version 300 es
            precision mediump float;

            void main(void) {
            }`;
    }
    fillUniformsAttributes() {
        this.rm_Vertex = this.getAttrib("rm_Vertex");
        this.view_proj_matrix = this.getUniform("view_proj_matrix");
        this.time = this.getUniform("time");
        this.amplitude = this.getUniform("amplitude");
        this.waves = this.getUniform("waves");
    }
    /** @inheritdoc */
    drawModel(renderer, model, tx, ty, tz, rx, ry, rz, sx, sy, sz) {
        if (this.rm_Vertex === undefined || this.view_proj_matrix === undefined) {
            return;
        }
        const gl = renderer.gl;
        model.bindBuffers(gl);
        gl.enableVertexAttribArray(this.rm_Vertex);
        gl.vertexAttribPointer(this.rm_Vertex, 3, gl.HALF_FLOAT, false, 12, 0);
        renderer.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);
        gl.uniformMatrix4fv(this.view_proj_matrix, false, renderer.getMVPMatrix());
        gl.drawElements(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0);
        renderer.checkGlError("VertexColorSmShader glDrawElements");
    }
}

const ShaderCommonFunctions = {
    RANDOM: `
    /** From https://thebookofshaders.com/10/ */
    float random_vec2 (vec2 st) {
        return fract(sin(dot(st.xy,vec2(12.9898, 78.233))) * 43758.5453123);
    }

    /** Optimized version of the same random() from The Book of Shaders */
    float random (float st) {
        return fract(sin(st) * 43758.5453123);
    }
    `,
    INVERSE_RANDOM: `
    /** From https://thebookofshaders.com/10/ */
    float random_vec2 (vec2 st) {
        return 1.0 - fract(sin(dot(st.xy,vec2(12.9898, 78.233))) * 43758.5453123);
    }

    /** Optimized version of the same random() from The Book of Shaders */
    float random (float st) {
        return 1.0 - fract(sin(st) * 43758.5453123);
    }
    `,
    GRADIENT_NOISE: `
    vec2 random2(vec2 st){
        st = vec2( dot(st,vec2(127.1,311.7)),
                  dot(st,vec2(269.5,183.3)) );
        return -1.0 + 2.0*fract(sin(st)*43758.5453123);
    }

    // Gradient Noise by Inigo Quilez - iq/2013
    // https://www.shadertoy.com/view/XdXGW8
    // The MIT License
    // Copyright © 2013 Inigo Quilez
    // Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
    // https://www.youtube.com/c/InigoQuilez
    // https://iquilezles.org
    float noise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);

        vec2 u = f*f*(3.0-2.0*f);

        return mix( mix( dot( random2(i + vec2(0.0,0.0) ), f - vec2(0.0,0.0) ),
                         dot( random2(i + vec2(1.0,0.0) ), f - vec2(1.0,0.0) ), u.x),
                    mix( dot( random2(i + vec2(0.0,1.0) ), f - vec2(0.0,1.0) ),
                         dot( random2(i + vec2(1.0,1.0) ), f - vec2(1.0,1.0) ), u.x), u.y);
    }
    `,
    ROTATION: `
    /** https://www.neilmendoza.com/glsl-rotation-about-an-arbitrary-axis/ */
    mat4 rotationMatrix(vec3 axis, float angle)
    {
        // axis = normalize(axis);
        float s = sin(angle);
        float c = cos(angle);
        float oc = 1.0 - c;

        return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                    oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
                    oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
                    0.0,                                0.0,                                0.0,                                1.0);
    }

    /** Optimized version to rotate only around X axis */
    mat4 rotationAroundX(float angle)
    {
        float s = sin(angle);
        float c = cos(angle);

        return mat4(1.0, 0.0, 0.0, 0.0,
                    0.0, c,   -s,  0.0,
                    0.0, s,   c,   0.0,
                    0.0, 0.0, 0.0, 1.0);
    }

    /** Optimized version to rotate only around Y axis */
    mat4 rotationAroundY(float angle)
    {
        float s = sin(angle);
        float c = cos(angle);
        // float oc = 1.0 - c;

        return mat4(c,   0.0, s,   0.0,
                    0.0, 1.0, 0.0, 0.0,
                    -s,  0.0, c,   0.0,
                    0.0, 0.0, 0.0, 1.0);
    }

    /** Optimized version to rotate only around Z axis */
    mat4 rotationAroundZ(float angle)
    {
        float s = sin(angle);
        float c = cos(angle);

        return mat4(c,  -s,   0.0, 0.0,
                    s,   c,   0.0, 0.0,
                    0.0, 0.0, 1.0, 0.0,
                    0.0, 0.0, 0.0, 1.0);
    }
    `,
    /**
     * Fast and somewhat good enough.
     */
    VALUE_NOISE: `
    // https://www.shadertoy.com/view/lsf3WH
    // The MIT License
    // Copyright © 2013 Inigo Quilez
    // Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
    // https://www.youtube.com/c/InigoQuilez
    // https://iquilezles.org/

    float hash(vec2 p)  // replace this by something better
    {
        p  = 50.0*fract( p*0.3183099 + vec2(0.71,0.113));
        return -1.0+2.0*fract( p.x*p.y*(p.x+p.y) );
    }

    float noise( in vec2 p )
    {
        vec2 i = floor( p );
        vec2 f = fract( p );

        // vec2 u = f*f*(3.0-2.0*f); // original
        vec2 u = f; // less contrast, faster

        return mix( mix( hash( i + vec2(0.0,0.0) ),
                         hash( i + vec2(1.0,0.0) ), u.x),
                    mix( hash( i + vec2(0.0,1.0) ),
                         hash( i + vec2(1.0,1.0) ), u.x), u.y);
    }
    `,
    /**
     * Clear repetitive horizontal and vertical patterns can be seen.
     * Still good enough for low-frequency vertex stuff
     */
    VALUE_NOISE_CHEAP: `
    // https://www.shadertoy.com/view/lsf3WH
    // The MIT License
    // Copyright © 2013 Inigo Quilez
    // Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
    // https://www.youtube.com/c/InigoQuilez
    // https://iquilezles.org/

    float hash(vec2 p)  // replace this by something better
    {
        p  = 50.0*fract( p*0.3183099 + vec2(0.71,0.113));
        return -1.0+2.0*fract( p.x*p.y ); // repetitive horizontal and vertical patterns can be seen
    }

    float noise( in vec2 p )
    {
        vec2 i = floor( p );
        vec2 f = fract( p );

        // vec2 u = f*f*(3.0-2.0*f); // original
        vec2 u = f; // less contrast, faster

        return mix( mix( hash( i + vec2(0.0,0.0) ),
                         hash( i + vec2(1.0,0.0) ), u.x),
                    mix( hash( i + vec2(0.0,1.0) ),
                         hash( i + vec2(1.0,1.0) ), u.x), u.y);
    }
    `,
    /**
     * Generates 2 random values for 2 vec2 packed into single vec4.
     */
    VALUE_NOISE2: `
    // https://www.shadertoy.com/view/lsf3WH
    // The MIT License
    // Copyright © 2013 Inigo Quilez
    // Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
    // https://www.youtube.com/c/InigoQuilez
    // https://iquilezles.org/

    const vec4 VALUE_NOISE_VEC2_COEFFS = vec4(0.71,0.113, 0.77,0.111);

    vec2 hash2(vec4 p)  // replace this by something better
    {
        p  = 50.0*fract( p*0.3183099 + VALUE_NOISE_VEC2_COEFFS);
        return -1.0 + 2.0 * fract( vec2(
            ( p.x*p.y*(p.x+p.y) ),
            ( p.z*p.w*(p.z+p.w) )
        ));
    }

    vec2 noise2( in vec4 p )
    {
        vec4 i = floor( p );
        vec4 f = fract( p );
        // vec2 u = f*f*(3.0-2.0*f); // original
        vec4 u = f; // less contrast, faster
        return mix( mix( hash2( i ),
                         hash2( i + vec4(1.0,0.0,1.0,0.0) ), u.x),
                    mix( hash2( i + vec4(0.0,1.0,0.0,1.0) ),
                         hash2( i + vec4(1.0,1.0,1.0,1.0) ), u.x), u.y);
    }
    `,
    /**
     * Generates 2 random values for 2 vec2 packed into single vec4.
     * Clear repetitive horizontal and vertical patterns can be seen.
     * Still good enough for low-frequency vertex stuff
     */
    VALUE_NOISE2_CHEAP: `
    // https://www.shadertoy.com/view/lsf3WH
    // The MIT License
    // Copyright © 2013 Inigo Quilez
    // Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
    // https://www.youtube.com/c/InigoQuilez
    // https://iquilezles.org/

    const vec4 VALUE_NOISE_VEC2_COEFFS = vec4(0.71,0.113, 0.77,0.111);

    vec2 hash2(vec4 p)  // replace this by something better
    {
        p  = 50.0*fract( p*0.3183099 + VALUE_NOISE_VEC2_COEFFS);
        return -1.0 + 2.0 * fract( vec2(
            ( p.x*p.y ), // repetitive horizontal and vertical patterns can be seen
            ( p.z*p.w )
        ));
    }

    vec2 noise2( in vec4 p )
    {
        vec4 i = floor( p );
        vec4 f = fract( p );
        // vec2 u = f*f*(3.0-2.0*f); // original
        vec4 u = f; // less contrast, faster
        return mix( mix( hash2( i ),
                         hash2( i + vec4(1.0,0.0,1.0,0.0) ), u.x),
                    mix( hash2( i + vec4(0.0,1.0,0.0,1.0) ),
                         hash2( i + vec4(1.0,1.0,1.0,1.0) ), u.x), u.y);
    }
    `
};

/**
 * Procedurally animated knight character.
 */
class KnightAnimatedShader extends BaseShader {
    fillCode() {
        this.vertexShaderCode = `#version 300 es
            precision highp float;

            uniform vec4 lightDir;
            uniform mat4 view_matrix;
            uniform mat4 model_matrix;
            uniform mat4 view_proj_matrix;
            uniform float diffuseCoef;
            uniform float diffuseExponent;

            uniform vec3 colors[32];

            out float vLightCoeff;
            out vec2 vTexCoord;
            out vec3 vVertex;

            in vec4 rm_Vertex;
            in vec2 rm_TexCoord;
            in vec3 rm_Normal;

            const float ONE = 1.0;
            const float ZERO = 0.0;

            // Shadowmaps stuff
            ${UNIFORMS_VARYINGS_CONST_VS}

            // Fog stuff
            ${FOG_UNIFORMS_VS}

            // Animation
            ${ShaderCommonFunctions.ROTATION}
            ${KnightAnimatedShader.UNIFORMS_CONSTANTS}

            void main(void)
            {
                vTexCoord = rm_TexCoord;
                vVertex = rm_Vertex.xyz;

                vec4 vertex = rm_Vertex;
                vec4 normal = vec4(rm_Normal, ZERO);

                if (gl_VertexID < 36) { // body
                } else if (gl_VertexID < 72) { // head
                    mat4 matHeadRotation = rotationAroundZ(headRotationZ);
                    normal *= matHeadRotation;
                    vertex *= matHeadRotation;
                } else if (gl_VertexID < 108) { // left arm
                    mat4 matLeftArmRotation = rotationAroundY(armRotations.x);
                    normal *= matLeftArmRotation;
                    vertex.z += ARM_PIVOT;
                    vertex *= matLeftArmRotation;
                    vertex.z -= ARM_PIVOT;
                } else { // right arm
                    mat4 matRightArmRotation = rotationAroundY(armRotations.y);
                    normal *= matRightArmRotation;
                    vertex.z += ARM_PIVOT;
                    vertex *= matRightArmRotation;
                    vertex.z -= ARM_PIVOT;
                }

                gl_Position = view_proj_matrix * vertex;

                vec3 vLightVec = (view_matrix * lightDir).xyz;
                normal = model_matrix * normal;
                vec3 vNormal = normalize(view_matrix * normal).xyz; // w component of rm_Normal might be ignored, and implicitly converted to vec4 in uniform declaration
                float d = pow(max(ZERO, dot(vNormal, normalize(vLightVec))), diffuseExponent); // redundant normalize() ??

                float angle = rm_Normal.z;

                vLightCoeff = d * diffuseCoef;

                // Shadowmap stuff
                vec3 LightVec = normalize(lightVector);
                vec3 worldNormal = normalize(mat3(modelMatrix) * rm_Normal);
                float lamb = (dot(worldNormal, LightVec)); // range is -1...1 https://chortle.ccsu.edu/vectorlessons/vch09/vch09_6.html
                vertex.xyz += worldNormal * BIAS * (ONE - lamb);
                vPosition = ScaleMatrix * projectionMatrix * lightMatrix * modelMatrix * vertex;

                // Fog stuff
                ${FOG_CHUNK_VS}
            }`;
        this.fragmentShaderCode = `#version 300 es
            precision mediump float;

            in vec2 vTexCoord;
            in vec3 vVertex;
            in float vLightCoeff;
            out vec4 fragColor;

            uniform mediump vec4 diffuse;
            uniform mediump vec4 ambient;
            uniform sampler2D sTexture;

            // Shadowmaps stuff
            ${UNIFORMS_VARYINGS_CONST_FILTERED_FS}

            // Fog stuff
            ${FOG_UNIFORMS_FS}

            void main(void)
            {
                highp vec3 depth = vPosition.xyz / vPosition.w;
                ${shadowSmoothConditional5TapEs3("vFogAmount > 0.1")}
                colorCoeff = clamp(colorCoeff, shadowBrightnessFS, 1.); // clamp to limit shadow intensity
                float lightCoeff = min(colorCoeff, vLightCoeff); // this mixes Lambert and shadow coefficients
                fragColor = texture(sTexture, vTexCoord) * mix(ambient, diffuse, lightCoeff);

                // Fog stuff
                ${FOG_CHUNK_FS}
            }`;
    }
    fillUniformsAttributes() {
        this.rm_Vertex = this.getAttrib("rm_Vertex");
        this.rm_Normal = this.getAttrib("rm_Normal");
        this.rm_TexCoord = this.getAttrib("rm_TexCoord");
        this.view_matrix = this.getUniform("view_matrix");
        this.view_proj_matrix = this.getUniform("view_proj_matrix");
        this.model_matrix = this.getUniform("model_matrix");
        this.ambient = this.getUniform("ambient");
        this.diffuse = this.getUniform("diffuse");
        this.lightDir = this.getUniform("lightDir");
        this.diffuseCoef = this.getUniform("diffuseCoef");
        this.diffuseExponent = this.getUniform("diffuseExponent");
        this.sTexture = this.getUniform("sTexture");
        this.headRotationZ = this.getUniform("headRotationZ");
        this.armRotations = this.getUniform("armRotations");
        this.sDepth = this.getUniform("sDepth");
        this.projectionMatrix = this.getUniform("projectionMatrix");
        // this.viewMatrix = this.getUniform("viewMatrix");
        this.modelMatrix = this.getUniform("modelMatrix");
        this.lightMatrix = this.getUniform("lightMatrix");
        this.texelSize = this.getUniform("texelSize");
        this.lightVector = this.getUniform("lightVector");
        // this.shadowBrightnessVS = this.getUniform("shadowBrightnessVS"); // because vLamb is not used in this lighting model
        this.shadowBrightnessFS = this.getUniform("shadowBrightnessFS");
        this.pcfBiasCorrection = this.getUniform("pcfBiasCorrection");
        // Fog stuff
        this.fogColor = this.getUniform("fogColor");
        this.fogStartDistance = this.getUniform("fogStartDistance");
        this.fogDistance = this.getUniform("fogDistance");
    }
    /** @inheritdoc */
    drawModel(renderer, model, tx, ty, tz, rx, ry, rz, sx, sy, sz) {
        if (this.rm_Vertex === undefined
            || this.rm_Normal === undefined
            || this.rm_TexCoord === undefined
            || this.view_proj_matrix === undefined
            || this.view_matrix === undefined
            || this.model_matrix === undefined) {
            return;
        }
        const gl = renderer.gl;
        model.bindBuffers(gl);
        gl.enableVertexAttribArray(this.rm_Vertex);
        gl.enableVertexAttribArray(this.rm_TexCoord);
        gl.enableVertexAttribArray(this.rm_Normal);
        gl.vertexAttribPointer(this.rm_Vertex, 3, gl.FLOAT, false, 4 * (3 + 2 + 3), 0);
        gl.vertexAttribPointer(this.rm_TexCoord, 2, gl.FLOAT, false, 4 * (3 + 2 + 3), 4 * (3));
        gl.vertexAttribPointer(this.rm_Normal, 3, gl.FLOAT, true, 4 * (3 + 2 + 3), 4 * (3 + 2));
        renderer.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);
        gl.uniformMatrix4fv(this.view_proj_matrix, false, renderer.getMVPMatrix());
        gl.uniformMatrix4fv(this.view_matrix, false, renderer.getViewMatrix());
        gl.uniformMatrix4fv(this.model_matrix, false, renderer.getModelMatrix());
        gl.drawElements(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0);
        renderer.checkGlError("VertexColorSmShader glDrawElements");
    }
}
KnightAnimatedShader.UNIFORMS_CONSTANTS = `
    uniform float headRotationZ;
    uniform vec2 armRotations; // x - left arm, y - right arm
    const float ARM_PIVOT = -2.25;
    `;

/**
 * Procedurally animated knight character.
 */
class KnightDepthShader extends BaseShader {
    fillCode() {
        this.vertexShaderCode = `#version 300 es
            precision highp float;

            uniform mat4 view_proj_matrix;
            in vec4 rm_Vertex;

            // Animation
            ${ShaderCommonFunctions.ROTATION}
            ${KnightAnimatedShader.UNIFORMS_CONSTANTS}

            void main(void)
            {
                vec4 vertex = rm_Vertex;

                if (gl_VertexID < 36) { // body
                } else if (gl_VertexID < 72) { // head
                    mat4 matHeadRotation = rotationAroundZ(headRotationZ);
                    vertex *= matHeadRotation;
                } else if (gl_VertexID < 108) { // left arm
                    mat4 matLeftArmRotation = rotationAroundY(armRotations.x);
                    vertex.z += ARM_PIVOT;
                    vertex *= matLeftArmRotation;
                    vertex.z -= ARM_PIVOT;
                } else { // right arm
                    mat4 matRightArmRotation = rotationAroundY(armRotations.y);
                    vertex.z += ARM_PIVOT;
                    vertex *= matRightArmRotation;
                    vertex.z -= ARM_PIVOT;
                }

                gl_Position = view_proj_matrix * vertex;
            }`;
        this.fragmentShaderCode = `#version 300 es
            precision mediump float;

            void main(void) {
            }`;
    }
    fillUniformsAttributes() {
        this.rm_Vertex = this.getAttrib("rm_Vertex");
        this.view_proj_matrix = this.getUniform("view_proj_matrix");
        this.headRotationZ = this.getUniform("headRotationZ");
        this.armRotations = this.getUniform("armRotations");
    }
    /** @inheritdoc */
    drawModel(renderer, model, tx, ty, tz, rx, ry, rz, sx, sy, sz) {
        if (this.rm_Vertex === undefined
            || this.view_proj_matrix === undefined) {
            return;
        }
        const gl = renderer.gl;
        model.bindBuffers(gl);
        gl.enableVertexAttribArray(this.rm_Vertex);
        gl.vertexAttribPointer(this.rm_Vertex, 3, gl.FLOAT, false, 4 * (3 + 2 + 3), 0);
        renderer.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);
        gl.uniformMatrix4fv(this.view_proj_matrix, false, renderer.getMVPMatrix());
        gl.drawElements(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0);
        renderer.checkGlError("VertexColorSmShader glDrawElements");
    }
}

/**
 * Procedurally animated eagle.
 */
class EagleAnimatedShader extends BaseShader {
    fillCode() {
        this.vertexShaderCode = `#version 300 es
            precision highp float;

            uniform vec4 lightDir;
            uniform mat4 view_matrix;
            uniform mat4 model_matrix;
            uniform mat4 view_proj_matrix;
            uniform float diffuseCoef;
            uniform float diffuseExponent;

            uniform vec3 colors[32];

            out float vLightCoeff;
            out vec2 vTexCoord;
            out vec3 vVertex;

            in vec4 rm_Vertex;
            in vec2 rm_TexCoord;
            in vec3 rm_Normal;

            const float ONE = 1.0;
            const float ZERO = 0.0;

            // Shadowmaps stuff
            ${UNIFORMS_VARYINGS_CONST_VS}

            // Fog stuff
            ${FOG_UNIFORMS_VS}

            // Animation
            ${ShaderCommonFunctions.ROTATION}
            ${EagleAnimatedShader.UNIFORMS_CONSTANTS}

            void main(void)
            {
                vTexCoord = rm_TexCoord;
                vVertex = rm_Vertex.xyz;

                vec4 vertex = rm_Vertex;
                vec4 normal = vec4(rm_Normal, ZERO);

                if (gl_VertexID > 44 && gl_VertexID < 81) { // left wing
                    mat4 matLeftRotation = rotationAroundX(-wingsRotation);
                    normal *= matLeftRotation;
                    vertex.y -= WING_PIVOT;
                    vertex *= matLeftRotation;
                    vertex.y += WING_PIVOT;
                } else if (gl_VertexID > 149 && gl_VertexID < 186) { // right wing
                    mat4 matRightRotation = rotationAroundX(wingsRotation);
                    normal *= matRightRotation;
                    vertex.y += WING_PIVOT;
                    vertex *= matRightRotation;
                    vertex.y -= WING_PIVOT;
                }

                gl_Position = view_proj_matrix * vertex;

                vec3 vLightVec = (view_matrix * lightDir).xyz;
                normal = model_matrix * normal;
                vec3 vNormal = normalize(view_matrix * normal).xyz; // w component of rm_Normal might be ignored, and implicitly converted to vec4 in uniform declaration
                float d = pow(max(ZERO, dot(vNormal, normalize(vLightVec))), diffuseExponent); // redundant normalize() ??

                float angle = rm_Normal.z;

                vLightCoeff = d * diffuseCoef;

                // Shadowmap stuff
                vec3 LightVec = normalize(lightVector);
                vec3 worldNormal = normalize(mat3(modelMatrix) * rm_Normal);
                float lamb = (dot(worldNormal, LightVec)); // range is -1...1 https://chortle.ccsu.edu/vectorlessons/vch09/vch09_6.html
                vertex.xyz += worldNormal * BIAS * (ONE - lamb);
                vPosition = ScaleMatrix * projectionMatrix * lightMatrix * modelMatrix * vertex;

                // Fog stuff
                ${FOG_CHUNK_VS}
            }`;
        this.fragmentShaderCode = `#version 300 es
            precision mediump float;

            in vec2 vTexCoord;
            in vec3 vVertex;
            in float vLightCoeff;
            out vec4 fragColor;

            uniform mediump vec4 diffuse;
            uniform mediump vec4 ambient;
            uniform sampler2D sTexture;

            // Shadowmaps stuff
            ${UNIFORMS_VARYINGS_CONST_FILTERED_FS}

            // Fog stuff
            ${FOG_UNIFORMS_FS}

            void main(void)
            {
                highp vec3 depth = vPosition.xyz / vPosition.w;
                ${shadowSmoothConditional5TapEs3("vFogAmount > 0.1")}
                colorCoeff = clamp(colorCoeff, shadowBrightnessFS, 1.); // clamp to limit shadow intensity
                float lightCoeff = min(colorCoeff, vLightCoeff); // this mixes Lambert and shadow coefficients
                fragColor = texture(sTexture, vTexCoord) * mix(ambient, diffuse, lightCoeff);

                // Fog stuff
                ${FOG_CHUNK_FS}
            }`;
    }
    fillUniformsAttributes() {
        this.rm_Vertex = this.getAttrib("rm_Vertex");
        this.rm_Normal = this.getAttrib("rm_Normal");
        this.rm_TexCoord = this.getAttrib("rm_TexCoord");
        this.view_matrix = this.getUniform("view_matrix");
        this.view_proj_matrix = this.getUniform("view_proj_matrix");
        this.model_matrix = this.getUniform("model_matrix");
        this.ambient = this.getUniform("ambient");
        this.diffuse = this.getUniform("diffuse");
        this.lightDir = this.getUniform("lightDir");
        this.diffuseCoef = this.getUniform("diffuseCoef");
        this.diffuseExponent = this.getUniform("diffuseExponent");
        this.sTexture = this.getUniform("sTexture");
        this.wingsRotation = this.getUniform("wingsRotation");
        this.sDepth = this.getUniform("sDepth");
        this.projectionMatrix = this.getUniform("projectionMatrix");
        // this.viewMatrix = this.getUniform("viewMatrix");
        this.modelMatrix = this.getUniform("modelMatrix");
        this.lightMatrix = this.getUniform("lightMatrix");
        this.texelSize = this.getUniform("texelSize");
        this.lightVector = this.getUniform("lightVector");
        // this.shadowBrightnessVS = this.getUniform("shadowBrightnessVS"); // because vLamb is not used in this lighting model
        this.shadowBrightnessFS = this.getUniform("shadowBrightnessFS");
        this.pcfBiasCorrection = this.getUniform("pcfBiasCorrection");
        // Fog stuff
        this.fogColor = this.getUniform("fogColor");
        this.fogStartDistance = this.getUniform("fogStartDistance");
        this.fogDistance = this.getUniform("fogDistance");
    }
    /** @inheritdoc */
    drawModel(renderer, model, tx, ty, tz, rx, ry, rz, sx, sy, sz) {
        if (this.rm_Vertex === undefined
            || this.rm_Normal === undefined
            || this.rm_TexCoord === undefined
            || this.view_proj_matrix === undefined
            || this.view_matrix === undefined
            || this.model_matrix === undefined) {
            return;
        }
        const gl = renderer.gl;
        model.bindBuffers(gl);
        gl.enableVertexAttribArray(this.rm_Vertex);
        gl.enableVertexAttribArray(this.rm_TexCoord);
        gl.enableVertexAttribArray(this.rm_Normal);
        gl.vertexAttribPointer(this.rm_Vertex, 3, gl.FLOAT, false, 4 * (3 + 2 + 3), 0);
        gl.vertexAttribPointer(this.rm_TexCoord, 2, gl.FLOAT, false, 4 * (3 + 2 + 3), 4 * (3));
        gl.vertexAttribPointer(this.rm_Normal, 3, gl.FLOAT, true, 4 * (3 + 2 + 3), 4 * (3 + 2));
        renderer.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);
        gl.uniformMatrix4fv(this.view_proj_matrix, false, renderer.getMVPMatrix());
        gl.uniformMatrix4fv(this.view_matrix, false, renderer.getViewMatrix());
        gl.uniformMatrix4fv(this.model_matrix, false, renderer.getModelMatrix());
        gl.drawElements(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0);
        renderer.checkGlError("VertexColorSmShader glDrawElements");
    }
}
EagleAnimatedShader.UNIFORMS_CONSTANTS = `
    uniform float wingsRotation;
    const float WING_PIVOT = 6.0;
    `;

/**
 * Procedurally animated knight character.
 */
class EagleDepthShader extends BaseShader {
    fillCode() {
        this.vertexShaderCode = `#version 300 es
            precision highp float;

            uniform mat4 view_proj_matrix;
            in vec4 rm_Vertex;

            // Animation
            ${ShaderCommonFunctions.ROTATION}
            ${EagleAnimatedShader.UNIFORMS_CONSTANTS}

            void main(void)
            {
                vec4 vertex = rm_Vertex;

                if (gl_VertexID > 44 && gl_VertexID < 81) { // left wing
                    mat4 matLeftRotation = rotationAroundX(-wingsRotation);
                    vertex.y -= WING_PIVOT;
                    vertex *= matLeftRotation;
                    vertex.y += WING_PIVOT;
                } else if (gl_VertexID > 149 && gl_VertexID < 186) { // right wing
                    mat4 matRightRotation = rotationAroundX(wingsRotation);
                    vertex.y += WING_PIVOT;
                    vertex *= matRightRotation;
                    vertex.y -= WING_PIVOT;
                }

                gl_Position = view_proj_matrix * vertex;
            }`;
        this.fragmentShaderCode = `#version 300 es
            precision mediump float;

            void main(void) {
            }`;
    }
    fillUniformsAttributes() {
        this.rm_Vertex = this.getAttrib("rm_Vertex");
        this.view_proj_matrix = this.getUniform("view_proj_matrix");
        this.wingsRotation = this.getUniform("wingsRotation");
    }
    /** @inheritdoc */
    drawModel(renderer, model, tx, ty, tz, rx, ry, rz, sx, sy, sz) {
        if (this.rm_Vertex === undefined
            || this.view_proj_matrix === undefined) {
            return;
        }
        const gl = renderer.gl;
        model.bindBuffers(gl);
        gl.enableVertexAttribArray(this.rm_Vertex);
        gl.vertexAttribPointer(this.rm_Vertex, 3, gl.FLOAT, false, 4 * (3 + 2 + 3), 0);
        renderer.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);
        gl.uniformMatrix4fv(this.view_proj_matrix, false, renderer.getMVPMatrix());
        gl.drawElements(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0);
        renderer.checkGlError("VertexColorSmShader glDrawElements");
    }
}

class CameraPositionInterpolator {
    constructor() {
        this._speed = 0;
        this.duration = 0;
        this._minDuration = 3000;
        this._timer = 0;
        this.lastTime = 0;
        this._reverse = false;
        this._cameraPosition = create();
        this._cameraRotation = create();
        this._matrix = create$1();
    }
    get cameraPosition() {
        return this._cameraPosition;
    }
    get cameraRotation() {
        return this._cameraRotation;
    }
    set reverse(value) {
        this._reverse = value;
    }
    set minDuration(value) {
        this._minDuration = value;
    }
    get matrix() {
        return this._matrix;
    }
    get speed() {
        return this._speed;
    }
    set speed(value) {
        this._speed = value;
    }
    get position() {
        return this._position;
    }
    set position(value) {
        this._position = value;
        this.duration = Math.max(this.getLength() / this.speed, this._minDuration);
    }
    get timer() {
        return this._timer;
    }
    getLength() {
        if (this.position === undefined) {
            return 0;
        }
        const start = this.position.start.position;
        const end = this.position.end.position;
        return Math.sqrt((end[0] - start[0]) ** 2 + (end[1] - start[1]) ** 2 + (end[2] - start[2]) ** 2);
    }
    iterate(timeNow) {
        if (this.lastTime != 0) {
            const elapsed = timeNow - this.lastTime;
            this._timer += elapsed / this.duration;
            if (this._timer > 1.0) {
                this._timer = 1.0;
            }
        }
        this.lastTime = timeNow;
        this.updateMatrix();
    }
    reset() {
        this._timer = 0;
        this.updateMatrix();
    }
    updateMatrix() {
        if (this._position === undefined) {
            return;
        }
        const start = this._reverse ? this._position.end : this._position.start;
        const end = this._reverse ? this._position.start : this._position.end;
        this._cameraPosition[0] = start.position[0] + this._timer * (end.position[0] - start.position[0]);
        this._cameraPosition[1] = start.position[1] + this._timer * (end.position[1] - start.position[1]);
        this._cameraPosition[2] = start.position[2] + this._timer * (end.position[2] - start.position[2]);
        this._cameraRotation[0] = start.rotation[0] + this._timer * (end.rotation[0] - start.rotation[0]);
        this._cameraRotation[1] = start.rotation[1] + this._timer * (end.rotation[1] - start.rotation[1]);
        this._cameraRotation[2] = start.rotation[2] + this._timer * (end.rotation[2] - start.rotation[2]);
        identity(this.matrix);
        rotateX(this.matrix, this.matrix, this._cameraRotation[0] - Math.PI / 2.0);
        rotateZ$1(this.matrix, this.matrix, this._cameraRotation[1]);
        rotateY$1(this.matrix, this.matrix, this._cameraRotation[2]);
        translate(this.matrix, this.matrix, [-this._cameraPosition[0], -this._cameraPosition[1], -this._cameraPosition[2]]);
    }
}

const GROUND_COLORS = new Float32Array([
    0.173, 0.847, 0.7220001
]);
const CASTLE_OUTER_COLORS = new Float32Array([
    0.816, 0.58, 0.42,
    0.84, 0.435, 0.305,
    0.169, 0.651, 0.667,
    0.571, 0.559, 0.736,
    0.878, 0.271, 0.271,
    0.58, 0.569, 0.769,
    0.949, 0.855, 0.631,
    0.173, 0.847, 0.722
]);
const CASTLE_INNER_COLORS = new Float32Array([
    0.571, 0.559, 0.736,
    0.403, 0.39, 0.594,
    1, 0.392, 0.306,
    0.58, 0.569, 0.769,
    1, 1, 1,
    0.698, 0.316, 0.194,
    0.71, 0.701, 0.84,
    0.816, 0.58, 0.42,
    0.84, 0.435, 0.305,
    0.485, 0.668, 0.962,
    0.376, 0.376, 0.376,
    0.961, 0.843, 0.733,
    0.878, 0.271, 0.271,
    1, 0.42, 0.51,
    0.949, 0.855, 0.631,
    0.173, 0.847, 0.722,
    0.169, 0.651, 0.667
]);
const BASE_COLORS = [
    [1, 1, 1],
    [0.1, 0.2, 0.7],
    [0.99, 0.42, 0.17],
    [0.99, 0.19, 0.61] // sunset
];
const AMBIENT = [
    0.45,
    0.25,
    0.35,
    0.35 // sunset
];

class WindShader extends BaseShader {
    fillCode() {
        this.vertexShaderCode = `#version 300 es
            precision highp float;

            uniform mat4 view_proj_matrix;
            uniform vec3 offset;
            uniform vec2 dimensions; // x = length; y = width coefficient
            uniform vec3 amplitudes; // x = 1st XY harmonic; y = 2nd XY harmonic; z = Z amplitude
            uniform vec3 frequencies; // x = 1st XY harmonic; y = 2nd XY harmonic; z = Z frequency

            out float vFogAmount;
            uniform float fogDistance;
            uniform float fogStartDistance;

            const vec2 VERTICES[6] = vec2[6](
                vec2(-1.0f, -1.0f),
                vec2( 1.0f, -1.0f),
                vec2(-1.0f, 1.0f),
                vec2( 1.0f, -1.0f),
                vec2( 1.0f, 1.0f),
                vec2(-1.0f, 1.0f)
            );

            void main() {
                vec4 vertex = vec4(VERTICES[gl_VertexID % 6], 0.0, 1.0);
                vertex.y += float(gl_VertexID / 6) * 2.0;

                float t = vertex.y / dimensions.x; // normalized length
                float w = smoothstep(0.0, 0.2, t) * (1.0 - smoothstep(0.8, 1.0, t)); // width coefficient for thin start+end

                vertex.x *= w;
                vertex.x *= dimensions.y;

                vertex.xyz += offset;

                // combine 2 sine waves for horizontal waves
                vec2 noise = sin(vertex.yz * frequencies.x) * amplitudes.x;
                noise += sin(vertex.yz * frequencies.y) * amplitudes.y;

                // vertical wave
                float noise2 = sin(vertex.y * frequencies.z) * amplitudes.z;

                vertex.xy += noise;
                vertex.z += noise2;

                gl_Position = view_proj_matrix * vertex;

                vFogAmount = 1.0 - clamp((length(gl_Position) - fogStartDistance) / fogDistance, 0.0, 1.0);
            }`;
        this.fragmentShaderCode = `#version 300 es
            precision mediump float;

            in float vFogAmount;
            uniform vec4 color;
            out vec4 fragColor;

            void main() {
                fragColor = color * vFogAmount;
            }`;
    }
    fillUniformsAttributes() {
        this.view_proj_matrix = this.getUniform("view_proj_matrix");
        this.color = this.getUniform("color");
        this.offset = this.getUniform("offset");
        this.dimensions = this.getUniform("dimensions");
        this.amplitudes = this.getUniform("amplitudes");
        this.frequencies = this.getUniform("frequencies");
        this.fogDistance = this.getUniform("fogDistance");
        this.fogStartDistance = this.getUniform("fogStartDistance");
    }
    draw(renderer, tx, ty, tz, rx, ry, rz, sx, sy, sz, segments) {
        const gl = renderer.gl;
        renderer.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);
        gl.uniformMatrix4fv(this.view_proj_matrix, false, renderer.getMVPMatrix());
        gl.drawArrays(gl.TRIANGLES, 0, 6 * segments);
        renderer.checkGlError("WindStripeShader drawArrays");
    }
}

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

class Spline3D {
    constructor(bPrepareEnds, x, y, z) {
        this.currentPoint = { x: 0, y: 0, z: 0 };
        this.currentRotation = { x: 0, y: 0, z: 0 };
        this.splineX = new Spline(x, bPrepareEnds);
        this.splineY = new Spline(y, bPrepareEnds);
        this.splineZ = new Spline(z, bPrepareEnds);
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

const SPLINE_WALL_INNER_1 = new Spline3D(true, [-0, -0, 102, 100, 108, 106, -0, -0], [-0, -0, 44, 60, 60, 44, -0, -0], [0, 0, 20, 20, 20, 20, 0, 0]);
const SPLINE_WALL_INNER_2 = new Spline3D(true, [-0, -0, 100, 100, 100, 100, 106, 106, 108, 106, -0, -0], [-0, -0, 20, -0, -20, -40, -40, -20, -0, 20, -0, -0], [0, 0, 20, 20, 20, 20, 20, 20, 20, 20, 0, 0]);
const SPLINE_WALL_INNER_3 = new Spline3D(true, [0, 0, 121.24000000000001, 138.56, 155.88, 173.2, 190.51999999999998, 207.83999999999997, 225.15999999999997, 242.48000000000002, 259.8, 242.48000000000002, 225.15999999999997, 207.83999999999997, 190.51999999999998, 173.2, 155.88, 138.56, 121.24000000000001, 0, 0], [0, 0, -70, -80, -90, -100, -90, -80, -70, -60, -50, -60, -70, -80, -90, -100, -90, -80, -70, 0, 0], [0, 0, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 0, 0]);
const SPLINE_WALL_INNER_4 = new Spline3D(true, [0, 0, 190.51999999999998, 207.83999999999997, 225.15999999999997, 242.48000000000002, 259.8, 259.8, 242.48000000000002, 225.15999999999997, 207.83999999999997, 190.51999999999998, 0, 0], [0, 0, 70, 80, 70, 60, 50, 50, 60, 70, 80, 70, 0, 0], [0, 0, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 0, 0]);
const SPLINE_WALL_INNER_5 = new Spline3D(true, [0, 0, 17.32, 86.6, 0, 0], [0, 0, -110, -70, 0, 0], [0, 0, 40, 40, 0, 0]);
const SPLINE_WALL_INNER_6 = new Spline3D(true, [0, 0, -51.959999999999994, -34.64, 17.32, 34.64, 34.64, 17.2, -17.32, -51.959999999999994, 0, 0], [0, 0, -30, -60, -70, -40, 0, 30, 30, 10, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

const CAMERAS = [
    {
        start: {
            position: new Float32Array([-180.70840454101562, 344.12786865234375, 464.48724365234375]),
            rotation: new Float32Array([1.0439989566802979, 2.0820043087005615, 0])
        },
        end: {
            position: new Float32Array([-112.06977844238281, -171.38133239746094, 366.0000305175781]),
            rotation: new Float32Array([1.031998872756958, 0.6360000967979431, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([-65.85258483886719, -533.7212524414062, 97.40440368652344]),
            rotation: new Float32Array([0.12599997222423553, 0.1620001345872879, 0])
        },
        end: {
            position: new Float32Array([33.180965423583984, 144.239501953125, 41.7051887512207]),
            rotation: new Float32Array([0.12599997222423553, 0.1620001345872879, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([372.5055236816406, 88.55387115478516, 69.73857879638672]),
            rotation: new Float32Array([0.06599999964237213, 4.801174163818359, 0])
        },
        end: {
            position: new Float32Array([-65.18380737304688, 126.53640747070312, 42.17599105834961]),
            rotation: new Float32Array([0.03599999472498894, 4.77117395401001, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([131.52081298828125, 301.15557861328125, 130.46836853027344]),
            rotation: new Float32Array([0.7680003643035889, 3.9600257873535156, 0])
        },
        end: {
            position: new Float32Array([206.39492797851562, -6.715636253356934, 139.7966766357422]),
            rotation: new Float32Array([1.0679999589920044, 4.710031032562256, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([202.11294555664062, -170.178466796875, 58.734954833984375]),
            rotation: new Float32Array([0.24599967896938324, 6.007182598114014, 0])
        },
        end: {
            position: new Float32Array([128.2172393798828, 107.47187805175781, 134.7461700439453]),
            rotation: new Float32Array([0.7979993224143982, 5.935182094573975, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([279.81304931640625, 664.1943359375, 275.15228271484375]),
            rotation: new Float32Array([0.3720014989376068, 3.6517090797424316, 0])
        },
        end: {
            position: new Float32Array([-17.399612426757812, 47.14397048950195, 86.219970703125]),
            rotation: new Float32Array([0.3240014612674713, 4.449714660644531, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([-195.9441680908203, 700.3867797851562, 418.3968811035156]),
            rotation: new Float32Array([0.6000023484230042, 2.7540125846862793, 0])
        },
        end: {
            position: new Float32Array([1.8704317808151245, 160.99075317382812, 147.00608825683594]),
            rotation: new Float32Array([0.26400214433670044, 2.994014263153076, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([-248.67987060546875, -320.5169982910156, 593.5792236328125]),
            rotation: new Float32Array([0.7679989337921143, 0.48600319027900696, 0])
        },
        end: {
            position: new Float32Array([-151.6046142578125, 290.5845947265625, 197.34095764160156]),
            rotation: new Float32Array([0.7859989404678345, 2.172008752822876, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([-90.51039123535156, 348.780517578125, 67.15997314453125]),
            rotation: new Float32Array([0.11399991810321808, 2.863162040710449, 0])
        },
        end: {
            position: new Float32Array([-27.74077606201172, 119.6170883178711, 377.1683654785156]),
            rotation: new Float32Array([1.169999599456787, 2.9051623344421387, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([82.28939056396484, 445.0611572265625, 93.37278747558594]),
            rotation: new Float32Array([0.17400018870830536, 3.3000097274780273, 0])
        },
        end: {
            position: new Float32Array([16.53315544128418, 33.45115661621094, 35.45589065551758]),
            rotation: new Float32Array([0.17400018870830536, 3.3000097274780273, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([78.29499816894531, -17.22335433959961, 70.7376480102539]),
            rotation: new Float32Array([0.6720003485679626, 3.480013608932495, 0])
        },
        end: {
            position: new Float32Array([78.29499816894531, -17.22335433959961, 70.7376480102539]),
            rotation: new Float32Array([0.3780005872249603, 5.832029819488525, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([-146.90318298339844, 142.15151977539062, 66.49613952636719]),
            rotation: new Float32Array([0.47400030493736267, 0.9359981417655945, 0])
        },
        end: {
            position: new Float32Array([-17.769685745239258, 261.3605651855469, 81.00308990478516]),
            rotation: new Float32Array([1.007999062538147, 3.918010950088501, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([156.03762817382812, 195.03221130371094, 66.18341827392578]),
            rotation: new Float32Array([0.3479999899864197, 4.95717716217041, 0])
        },
        end: {
            position: new Float32Array([14.030660629272461, 225.5084686279297, 24.763769149780273]),
            rotation: new Float32Array([0.22799980640411377, 4.735175609588623, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([33.84556579589844, 167.5606231689453, 66.10122680664062]),
            rotation: new Float32Array([1.0499999523162842, 2.8188557624816895, 0])
        },
        end: {
            position: new Float32Array([45.27586364746094, 158.3726348876953, 31.550251007080078]),
            rotation: new Float32Array([0.6780003309249878, 3.244858741760254, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([36.692195892333984, 120.5238265991211, 10.132575035095215]),
            rotation: new Float32Array([0.0299999937415123, 4.801177501678467, 0])
        },
        end: {
            position: new Float32Array([-41.80580520629883, 171.68023681640625, 30.876060485839844]),
            rotation: new Float32Array([0.5100004076957703, 3.319167137145996, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([7.791806697845459, 136.1355743408203, 41.7769889831543]),
            rotation: new Float32Array([0.6599994897842407, 4.5300211906433105, 0])
        },
        end: {
            position: new Float32Array([-62.04362106323242, 219.46224975585938, 69.3672866821289]),
            rotation: new Float32Array([0.7379992604255676, 3.2460103034973145, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([-212.7830047607422, 26.864469528198242, 47.52628707885742]),
            rotation: new Float32Array([0.4740002751350403, 1.2131590843200684, 0])
        },
        end: {
            position: new Float32Array([-106.01717376708984, 104.0726318359375, 52.95517349243164]),
            rotation: new Float32Array([0.6719997525215149, 5.924343585968018 - 6.28, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([-202.10008239746094, 240.60462951660156, 100.6684799194336]),
            rotation: new Float32Array([1.1399996280670166, 2.718008041381836, 0])
        },
        end: {
            position: new Float32Array([-47.3318977355957, 94.16532135009766, 91.72081756591797]),
            rotation: new Float32Array([0.6600000262260437, 1.4159926176071167, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([-298.9365539550781, 133.06166076660156, 16.645557403564453]),
            rotation: new Float32Array([0.0660000592470169, 1.5480033159255981, 0])
        },
        end: {
            position: new Float32Array([-249.6297149658203, -25.413482666015625, 51.728633880615234]),
            rotation: new Float32Array([0.3420001268386841, 0.7860006093978882, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([-541.5399169921875, -31.938264846801758, 14.510990142822266]),
            rotation: new Float32Array([0.01799987070262432, 1.2720028162002563, 0])
        },
        end: {
            position: new Float32Array([-168.18260192871094, 114.04676055908203, 50.46665954589844]),
            rotation: new Float32Array([0.5580002069473267, 1.368003487586975, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([-86.40751647949219, -398.1352233886719, 13.765576362609863]),
            rotation: new Float32Array([-0.2579997777938843, 0.030000174418091774, 0])
        },
        end: {
            position: new Float32Array([-124.21296691894531, 103.60616302490234, 182.36685180664062]),
            rotation: new Float32Array([0.893999457359314, 1.386001706123352, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([-112.36286163330078, -105.78300476074219, 156.2106170654297]),
            rotation: new Float32Array([0.9179993271827698, 1.4820020198822021, 0])
        },
        end: {
            position: new Float32Array([10.100805282592773, -152.53306579589844, 56.91889953613281]),
            rotation: new Float32Array([0.6060008406639099, 0.5040009617805481, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([91.12299346923828, -164.51905822753906, 40]),
            rotation: new Float32Array([0.4319993853569031, 5.587181568145752 - 6.28, 0])
        },
        end: {
            position: new Float32Array([-84.89698028564453, -186.57069396972656, 94.95513153076172]),
            rotation: new Float32Array([0.6240002512931824, 0.8039996027946472, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([46.48644256591797, -247.68185424804688, 136.48138427734375]),
            rotation: new Float32Array([0.49200037121772766, 5.911182880401611, 0])
        },
        end: {
            position: new Float32Array([135.65267944335938, 292.2001037597656, 66.20657348632812]),
            rotation: new Float32Array([0.1560002565383911, 3.877168655395508, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([-185.5640869140625, 275.6010437011719, 99.46765899658203]),
            rotation: new Float32Array([0.35999998450279236, 1.950005054473877, 0])
        },
        end: {
            position: new Float32Array([-187.9376983642578, -36.43680191040039, 91.44284057617188]),
            rotation: new Float32Array([0.2819998264312744, 0.8999989628791809, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([77.51092529296875, -15.743629455566406, 185.93775939941406]),
            rotation: new Float32Array([0.5579999685287476, 5.995182514190674, 0])
        },
        end: {
            position: new Float32Array([126.171142578125, 377.15887451171875, 139.98440551757812]),
            rotation: new Float32Array([0.504000186920166, 3.6491665840148926, 0])
        },
        speedMultiplier: 1.0
    }
];
const CAMERA_FOV_COEFFS = [
    1.0,
    1.0,
    1.0,
    0.5,
    0.8,
    1.0,
    1.0,
    1.0,
    0.9,
    0.8,
    0.5,
    0.4,
    0.5,
    0.3,
    0.3,
    0.3,
    0.5,
    0.6,
    0.7,
    0.7,
    1.0,
    0.6,
    0.6,
    1.0,
    0.9,
    1.0 // 25
];
const logCameras = () => {
    let result = "";
    for (const camera of CAMERAS) {
        result += `
        new CameraPositionPair() {{
            start = new CameraPosition() {{
                position = new Point3D(${camera.start.position});
                rotation = new Point3D(${camera.start.rotation});
            }};
            end = new CameraPosition() {{
                position = new Point3D(${camera.end.position});
                rotation = new Point3D(${camera.end.rotation});
            }};
            speedMultiplier = ${camera.speedMultiplier}f;
        }},
        `;
    }
    return result;
};
window.camerasString = logCameras();

/**
 * A map of various timers.
 */
class TimersMap {
    constructor() {
        this.map = new Map();
        this.lastTime = 0;
    }
    add(key, period, rotating = true) {
        this.map.set(key, [0, period, rotating]);
    }
    ;
    get(index) {
        const timer = this.map.get(index);
        if (timer !== undefined) {
            return timer[0];
        }
        else {
            throw new Error("Timer not found");
        }
    }
    set(index, value) {
        const timer = this.map.get(index);
        if (timer !== undefined) {
            timer[0] = value;
        }
    }
    iterate() {
        const timeNow = new Date().getTime();
        for (const timer of this.map.values()) {
            timer[0] += (timeNow - this.lastTime) / timer[1];
            if (timer[2]) {
                timer[0] %= 1.0;
            }
            else {
                if (timer[0] > 1.0) {
                    timer[0] = 1.0;
                }
            }
        }
        this.lastTime = timeNow;
    }
}

var Timers;
(function (Timers) {
    Timers[Timers["Flags"] = 0] = "Flags";
    Timers[Timers["HeadAnimation1"] = 1] = "HeadAnimation1";
    Timers[Timers["ArmsAnimation1"] = 2] = "ArmsAnimation1";
    Timers[Timers["ArmsAnimation2"] = 3] = "ArmsAnimation2";
    Timers[Timers["Step1"] = 4] = "Step1";
    Timers[Timers["Spline1"] = 5] = "Spline1";
    Timers[Timers["Spline2"] = 6] = "Spline2";
    Timers[Timers["Spline3"] = 7] = "Spline3";
    Timers[Timers["Wings"] = 8] = "Wings";
    Timers[Timers["BirdsFly"] = 9] = "BirdsFly";
    Timers[Timers["WindMove1"] = 10] = "WindMove1";
    Timers[Timers["WindMove2"] = 11] = "WindMove2";
    Timers[Timers["WindMove3"] = 12] = "WindMove3";
    Timers[Timers["Fade"] = 13] = "Fade";
    Timers[Timers["Camera"] = 14] = "Camera";
})(Timers || (Timers = {}));

const BUTTON_ROTATE = 0;
var OrbitState;
(function (OrbitState) {
    OrbitState[OrbitState["NONE"] = 0] = "NONE";
    OrbitState[OrbitState["MANUAL_ROTATING"] = 1] = "MANUAL_ROTATING";
    OrbitState[OrbitState["AUTO_ROTATING"] = 2] = "AUTO_ROTATING";
})(OrbitState || (OrbitState = {}));
class OrbitControls {
    constructor(renderer, options) {
        this.renderer = renderer;
        this.options = options;
        this.lastX = -1;
        this.lastY = -1;
        this.state = OrbitState.NONE;
        this.viewMatrix = create$1();
        this.position = fromValues(1, 0, 0);
        this.center = fromValues(0, 0, 0);
        this.enabled = false;
        this.autoRotate = true;
        this.yaw = options.yaw;
        this.pitch = options.pitch;
        this.radius = options.radius;
        this.speed = options.speed;
        this.zoomSpeed = options.zoomSpeed;
        this.autoRotateSpeed = options.autoRotateSpeed;
        this.minPitch = options.minPitch;
        this.maxPitch = options.maxPitch;
        this.minRadius = options.minRadius;
        this.maxRadius = options.maxRadius;
        this.origin = new Float32Array(options.origin);
        this.initialize();
    }
    enable() {
        this.enabled = true;
    }
    disable() {
        this.enabled = false;
        this.renderer.setCustomCamera(undefined);
    }
    initialize() {
        var _a, _b, _c, _d;
        (_a = this.renderer.getCanvas()) === null || _a === void 0 ? void 0 : _a.addEventListener("mousedown", (event) => {
            if (event.button === BUTTON_ROTATE) {
                this.state = OrbitState.MANUAL_ROTATING;
                const { clientX, clientY } = event;
                this.lastX = clientX;
                this.lastY = clientY;
                this.autoRotate = false;
            }
        });
        (_b = this.renderer.getCanvas()) === null || _b === void 0 ? void 0 : _b.addEventListener("mouseup", (event) => {
            this.state = OrbitState.NONE;
            clearTimeout(this.autoRotateTimeout);
            this.autoRotateTimeout = window.setTimeout(() => { this.autoRotate = true; }, 3000);
        });
        (_c = this.renderer.getCanvas()) === null || _c === void 0 ? void 0 : _c.addEventListener("mousemove", (event) => {
            if (this.state === OrbitState.MANUAL_ROTATING) {
                const { clientX, clientY } = event;
                const dx = this.lastX - event.clientX;
                const dy = this.lastY - event.clientY;
                this.updateRendererCamera(dx, dy);
                this.lastX = clientX;
                this.lastY = clientY;
            }
        });
        (_d = this.renderer.getCanvas()) === null || _d === void 0 ? void 0 : _d.addEventListener("wheel", (event) => {
            this.radius += event.deltaY * this.zoomSpeed;
            this.updateRendererCamera();
        });
        setInterval(() => {
            if (this.state === OrbitState.NONE && this.autoRotate) {
                this.yaw += this.autoRotateSpeed;
                this.updateRendererCamera();
            }
        }, 16); // approx. 60 fps
    }
    updateRendererCamera(dx = 0, dy = 0) {
        this.yaw += dx * this.speed;
        this.pitch += dy * this.speed;
        if (this.pitch > this.maxPitch) {
            this.pitch = this.maxPitch;
        }
        if (this.pitch < this.minPitch) {
            this.pitch = this.minPitch;
        }
        if (this.radius > this.maxRadius) {
            this.radius = this.maxRadius;
        }
        if (this.radius < this.minRadius) {
            this.radius = this.minRadius;
        }
        this.position[0] = 1;
        this.position[1] = 0;
        this.position[2] = 0;
        rotateY(this.position, this.position, this.center, -this.pitch);
        rotateZ(this.position, this.position, this.center, this.yaw);
        const eyeX = this.radius * this.position[0] + this.origin[0];
        const eyeY = this.radius * this.position[1] + this.origin[1];
        const eyeZ = this.radius * this.position[2] + this.origin[2];
        lookAt(this.viewMatrix, [eyeX, eyeY, eyeZ], // eye
        this.origin, // center
        [0, 0, 1] // up vector
        );
        if (this.enabled) {
            this.renderer.setCustomCamera(this.viewMatrix);
        }
    }
}

/**
 * A Flying Camera allows free motion around the scene using FPS style controls (WASD + mouselook)
 * This type of camera is good for displaying large scenes
 */
class FpsCamera {
    constructor(options) {
        var _a, _b;
        this.options = options;
        this._dirty = true;
        this._angles = create();
        this._position = create();
        this.speed = 100;
        this.rotationSpeed = 0.025;
        this._cameraMat = create$1();
        this._viewMat = create$1();
        this.projectionMat = create$1();
        this.pressedKeys = new Array();
        this.vec3Temp1 = create();
        this.vec3Temp2 = create();
        this.canvas = options.canvas;
        this.speed = (_a = options.movementSpeed) !== null && _a !== void 0 ? _a : 100;
        this.rotationSpeed = (_b = options.rotationSpeed) !== null && _b !== void 0 ? _b : 0.025;
        // Set up the appropriate event hooks
        let moving = false;
        let lastX, lastY;
        window.addEventListener("keydown", event => this.pressedKeys[event.keyCode] = true);
        window.addEventListener("keyup", event => this.pressedKeys[event.keyCode] = false);
        this.canvas.addEventListener('contextmenu', event => event.preventDefault());
        this.canvas.addEventListener('mousedown', event => {
            if (event.which === 3) {
                moving = true;
            }
            lastX = event.pageX;
            lastY = event.pageY;
        });
        this.canvas.addEventListener('mousemove', event => {
            if (moving) {
                let xDelta = event.pageX - lastX;
                let yDelta = event.pageY - lastY;
                lastX = event.pageX;
                lastY = event.pageY;
                this.angles[1] += xDelta * this.rotationSpeed;
                if (this.angles[1] < 0) {
                    this.angles[1] += Math.PI * 2;
                }
                if (this.angles[1] >= Math.PI * 2) {
                    this.angles[1] -= Math.PI * 2;
                }
                this.angles[0] += yDelta * this.rotationSpeed;
                if (this.angles[0] < -Math.PI * 0.5) {
                    this.angles[0] = -Math.PI * 0.5;
                }
                if (this.angles[0] > Math.PI * 0.5) {
                    this.angles[0] = Math.PI * 0.5;
                }
                this._dirty = true;
            }
        });
        this.canvas.addEventListener('mouseup', event => moving = false);
    }
    get angles() {
        return this._angles;
    }
    set angles(value) {
        this._angles = value;
        this._dirty = true;
    }
    get position() {
        return this._position;
    }
    set position(value) {
        this._position = value;
        this._dirty = true;
    }
    get dirty() {
        return this._dirty;
    }
    set dirty(value) {
        this._dirty = value;
    }
    get viewMat() {
        if (this._dirty) {
            var mv = this._viewMat;
            identity(mv);
            rotateX(mv, mv, this.angles[0] - Math.PI / 2.0);
            rotateZ$1(mv, mv, this.angles[1]);
            rotateY$1(mv, mv, this.angles[2]);
            translate(mv, mv, [-this.position[0], -this.position[1], -this.position[2]]);
            this._dirty = false;
        }
        return this._viewMat;
    }
    update(frameTime) {
        this.vec3Temp1[0] = 0;
        this.vec3Temp1[1] = 0;
        this.vec3Temp1[2] = 0;
        let speed = (this.speed / 1000) * frameTime;
        if (this.pressedKeys[16]) { // Shift, speed up
            speed *= 5;
        }
        // This is our first person movement code. It's not really pretty, but it works
        if (this.pressedKeys['W'.charCodeAt(0)]) {
            this.vec3Temp1[1] += speed;
        }
        if (this.pressedKeys['S'.charCodeAt(0)]) {
            this.vec3Temp1[1] -= speed;
        }
        if (this.pressedKeys['A'.charCodeAt(0)]) {
            this.vec3Temp1[0] -= speed;
        }
        if (this.pressedKeys['D'.charCodeAt(0)]) {
            this.vec3Temp1[0] += speed;
        }
        if (this.pressedKeys[32]) { // Space, moves up
            this.vec3Temp1[2] += speed;
        }
        if (this.pressedKeys['C'.charCodeAt(0)]) { // C, moves down
            this.vec3Temp1[2] -= speed;
        }
        if (this.vec3Temp1[0] !== 0 || this.vec3Temp1[1] !== 0 || this.vec3Temp1[2] !== 0) {
            let cam = this._cameraMat;
            identity(cam);
            rotateX(cam, cam, this.angles[0]);
            rotateZ$1(cam, cam, this.angles[1]);
            invert(cam, cam);
            transformMat4(this.vec3Temp1, this.vec3Temp1, cam);
            // Move the camera in the direction we are facing
            add(this.position, this.position, this.vec3Temp1);
            // Restrict movement to the bounding box
            if (this.options.boundingBox) {
                const { boundingBox } = this.options;
                if (this.position[0] < boundingBox.minX) {
                    this.position[0] = boundingBox.minX;
                }
                if (this.position[0] > boundingBox.maxX) {
                    this.position[0] = boundingBox.maxX;
                }
                if (this.position[1] < boundingBox.minY) {
                    this.position[1] = boundingBox.minY;
                }
                if (this.position[1] > boundingBox.maxY) {
                    this.position[1] = boundingBox.maxY;
                }
                if (this.position[2] < boundingBox.minZ) {
                    this.position[2] = boundingBox.minZ;
                }
                if (this.position[2] > boundingBox.maxZ) {
                    this.position[2] = boundingBox.maxZ;
                }
            }
            this._dirty = true;
        }
    }
}

var MovementMode;
(function (MovementMode) {
    MovementMode[MovementMode["Free"] = 0] = "Free";
    MovementMode[MovementMode["Predefined"] = 1] = "Predefined";
})(MovementMode || (MovementMode = {}));
class FreeMovement {
    constructor(renderer, options) {
        this.renderer = renderer;
        this.options = options;
        this.matCamera = create$1();
        this.matInvCamera = new Float32Array(16);
        this.vec3Eye = new Float32Array(3);
        this.vec3Rotation = new Float32Array(3);
        this.enabled = false;
        this.mode = MovementMode.Predefined;
        this.setupControls();
    }
    enable() {
        this.enabled = true;
    }
    disable() {
        this.enabled = false;
        this.renderer.setCustomCamera(undefined);
    }
    setupControls() {
        var _a;
        this.matCamera = clone(this.renderer.getViewMatrix());
        // this.renderer.setCustomCamera(this.matCamera);
        this.mode = MovementMode.Free;
        invert(this.matInvCamera, this.matCamera);
        getTranslation(this.vec3Eye, this.matInvCamera);
        normalize(this.vec3Rotation, this.vec3Eye);
        scale(this.vec3Rotation, this.vec3Rotation, -1);
        this.fpsCamera = (_a = this.fpsCamera) !== null && _a !== void 0 ? _a : new FpsCamera(this.options);
        this.fpsCamera.position = this.vec3Eye;
        const callback = (_time) => {
            if (this.mode !== MovementMode.Free) {
                return;
            }
            this.fpsCamera.update(16);
            this.matCamera = this.fpsCamera.viewMat;
            if (this.enabled) {
                this.renderer.setCustomCamera(this.matCamera, this.fpsCamera.position, this.fpsCamera.angles);
            }
            requestAnimationFrame(callback);
        };
        callback();
    }
    ;
    updatePosition(position) {
        if (this.fpsCamera) {
            this.fpsCamera.position[0] = position[0];
            this.fpsCamera.position[1] = position[1];
            this.fpsCamera.position[2] = position[2];
            this.fpsCamera.dirty = true;
            this.fpsCamera.update(0);
        }
    }
    updateRotation(rotation) {
        if (this.fpsCamera) {
            this.fpsCamera.angles[0] = rotation[0];
            this.fpsCamera.angles[1] = rotation[1];
            this.fpsCamera.angles[2] = rotation[2];
            this.fpsCamera.dirty = true;
            this.fpsCamera.update(0);
        }
    }
}

const FOV_LANDSCAPE = 35.0;
const FOV_PORTRAIT = 60.0;
const WIND_SEGMENTS = 50;
const WIND_WIDTH = 0.07;
const WIND_COLOR = 0.12;
class Renderer extends BaseRenderer {
    constructor() {
        super();
        this.lastTime = 0;
        this.loaded = false;
        this.fmCastleInner = new FullModel();
        this.fmCastleOuter = new FullModel();
        this.fmGround = new FullModel();
        this.fmFlag1 = new FullModel();
        this.fmFlag2 = new FullModel();
        this.fmFlag3 = new FullModel();
        this.fmKnight = new FullModel();
        this.fmEagle = new FullModel();
        this.Z_NEAR = 10.0;
        this.Z_FAR = 2000.0;
        this.FLAGS_PERIOD = 800;
        this.WALK_ANIM_SPEED = 2.0;
        this.HEAD1_PERIOD = 5000 / this.WALK_ANIM_SPEED;
        this.ARM1_PERIOD = 2100 / this.WALK_ANIM_SPEED;
        this.ARM2_PERIOD = 2000;
        this.STEP1_PERIOD = 2100 / this.WALK_ANIM_SPEED;
        this.SPLINE1_PERIOD = 37000;
        this.SPLINE2_PERIOD = 11000;
        this.SPLINE3_PERIOD = 18000;
        this.WINGS_PERIOD = 3000;
        this.BIRD_FLIGHT_PERIOD = 22000;
        this.WIND_MOVE_PERIOD1 = 2000 + 5000;
        this.WIND_MOVE_PERIOD2 = 2500 + 5000;
        this.WIND_MOVE_PERIOD3 = 3000 + 5000;
        this.FADE_PERIOD = 2500;
        this.CAMERA_PERIOD = 34000;
        this.timers = new TimersMap();
        this.randomWindCoeff1 = Math.random();
        this.randomWindCoeff2 = Math.random();
        this.randomWindCoeff3 = Math.random();
        this.cameraMode = CameraMode.Orbiting;
        this.cameraPosition = create();
        this.cameraRotation = create();
        this.BIRD_FLIGHT_RADIUS = 150;
        this.config = {
            ambient: 0.45,
            diffuse: 1.0,
            diffuseCoeff: 1.5,
            diffuseExponent: 1.0,
            shadowBrightness: 0.5,
            flagsAmplitude: 0.15,
            flagsWaves: 5,
            lightDistanceLow: 3300,
            lightHeightLow: 1700,
            lightDistance: 2200,
            lightHeight: 3800,
            lightNear: 3000,
            lightFar: 5000,
            lightFov: 18,
            fogColor: [0.41, 0.75, 0.92, 1],
            fogStartDistance: 500,
            fogDistance: 400,
            timeOfDay: 0,
            shadowResolution: 2
        };
        this.SHADOWMAP_SIZE = 1024 * 2.0; // can be reduced to 1.3 with still OK quality
        this.SHADOWMAP_TEXEL_OFFSET_SCALE = 0.666;
        this.PCF_BIAS_CORRECTION = 1.5 / this.SHADOWMAP_SIZE; // ~1.5 texels
        this.mViewMatrixLight = create$1();
        this.mProjMatrixLight = create$1();
        this.pointLight = create();
        this.cameraPositionInterpolator = new CameraPositionInterpolator();
        this.CAMERA_SPEED = 1;
        this.CAMERA_MIN_DURATION = 11000 / 1;
        this.currentRandomCamera = 0;
        this.currentLightDirection = 1;
        this.tempAmbient = [0, 0, 0, 1];
        this.tempDiffuse = [0, 0, 0, 1];
        this.tempFog = [0, 0, 0, 1];
        this.framesCount = 0;
        this.SCALE = 20;
        this.smallFlags2 = [
            [-6.0000, 2.9000, 0.0000],
            [3.0000, 4.5000, 5.1960],
            [-3.0000, 2.5000, 5.1960],
            [-3.0000, 2.9000, -8.6600]
        ];
        this.smallFlags3 = [
            [-2.0000, 2.9000, -13.856],
            [2.0000, 2.9000, -13.8560],
            [-0.9000, 3.8, -9.3260]
        ];
        this.cameraPositionInterpolator.speed = this.CAMERA_SPEED;
        this.cameraPositionInterpolator.minDuration = this.CAMERA_MIN_DURATION;
        this.randomizeCamera();
        this.setupTimers();
        document.addEventListener("keypress", event => {
            if (event.key === "1") {
                CAMERAS[0].start = {
                    position: new Float32Array([this.cameraPosition[0], this.cameraPosition[1], this.cameraPosition[2]]),
                    rotation: new Float32Array([this.cameraRotation[0], this.cameraRotation[1], this.cameraRotation[2]]),
                };
                this.logCamera();
            }
            else if (event.key === "2") {
                CAMERAS[0].end = {
                    position: new Float32Array([this.cameraPosition[0], this.cameraPosition[1], this.cameraPosition[2]]),
                    rotation: new Float32Array([this.cameraRotation[0], this.cameraRotation[1], this.cameraRotation[2]]),
                };
                this.logCamera();
            }
        });
    }
    setupTimers() {
        this.timers.add(Timers.Flags, this.FLAGS_PERIOD);
        this.timers.add(Timers.HeadAnimation1, this.HEAD1_PERIOD);
        this.timers.add(Timers.ArmsAnimation1, this.ARM1_PERIOD);
        this.timers.add(Timers.ArmsAnimation2, this.ARM2_PERIOD);
        this.timers.add(Timers.Step1, this.STEP1_PERIOD);
        this.timers.add(Timers.Spline1, this.SPLINE1_PERIOD);
        this.timers.add(Timers.Spline2, this.SPLINE2_PERIOD);
        this.timers.add(Timers.Spline3, this.SPLINE3_PERIOD);
        this.timers.add(Timers.Wings, this.WINGS_PERIOD);
        this.timers.add(Timers.BirdsFly, this.BIRD_FLIGHT_PERIOD);
        this.timers.add(Timers.WindMove1, this.WIND_MOVE_PERIOD1);
        this.timers.add(Timers.WindMove2, this.WIND_MOVE_PERIOD2);
        this.timers.add(Timers.WindMove3, this.WIND_MOVE_PERIOD3);
        this.timers.add(Timers.Fade, this.FADE_PERIOD, false);
        this.timers.add(Timers.Camera, this.CAMERA_PERIOD);
    }
    setCustomCamera(camera, position, rotation) {
        this.customCamera = camera;
        if (position !== undefined) {
            this.cameraPosition = position;
        }
        if (rotation !== undefined) {
            this.cameraRotation = rotation;
        }
    }
    resetCustomCamera() {
        this.customCamera = undefined;
    }
    onBeforeInit() {
    }
    onAfterInit() {
        this.orbitControls = new OrbitControls(this, {
            yaw: Math.random() * Math.PI * 2,
            pitch: 2.5,
            radius: 400,
            speed: 0.004,
            zoomSpeed: 0.3,
            autoRotateSpeed: 0.0008,
            minPitch: 1.7,
            maxPitch: 3.1,
            minRadius: 200,
            maxRadius: 700,
            origin: [0, 0, 50]
        });
        this.freeMovement = new FreeMovement(this, {
            canvas: this.canvas,
            movementSpeed: 35,
            rotationSpeed: 0.006,
            boundingBox: {
                minX: -500,
                maxX: 500,
                minY: -500,
                maxY: 500,
                minZ: 10,
                maxZ: 500
            }
        });
        this.setCameraMode(CameraMode.Orbiting);
    }
    onInitError() {
        var _a, _b;
        (_a = document.getElementById("canvasGL")) === null || _a === void 0 ? void 0 : _a.classList.add("hidden");
        (_b = document.getElementById("alertError")) === null || _b === void 0 ? void 0 : _b.classList.remove("hidden");
    }
    initShaders() {
        this.shaderDiffuse = new DiffuseShader(this.gl);
        this.shaderObjects = new VertexColorSmShader(this.gl);
        this.shaderObjectsDepth = new VertexColorDepthShader(this.gl);
        this.shaderFlag = new FlagSmShader(this.gl);
        this.shaderFlagDepth = new FlagDepthShader(this.gl);
        this.shaderKnight = new KnightAnimatedShader(this.gl);
        this.shaderKnightDepth = new KnightDepthShader(this.gl);
        this.shaderEagle = new EagleAnimatedShader(this.gl);
        this.shaderEagleDepth = new EagleDepthShader(this.gl);
        this.shaderWind = new WindShader(this.gl);
    }
    async loadData() {
        var _a;
        await Promise.all([
            this.fmCastleInner.load(`data/models/castle-inner`, this.gl),
            this.fmCastleOuter.load(`data/models/castle-outer`, this.gl),
            this.fmGround.load(`data/models/ground`, this.gl),
            this.fmFlag1.load(`data/models/flag1`, this.gl),
            this.fmFlag2.load(`data/models/flag2`, this.gl),
            this.fmFlag3.load(`data/models/flag3`, this.gl),
            this.fmKnight.load(`data/models/knightRed`, this.gl),
            this.fmEagle.load(`data/models/eagle`, this.gl)
        ]);
        const bufferKnight = new Uint16Array(144);
        for (let i = 0; i < 144; i++) {
            bufferKnight[i] = i;
        }
        this.fmKnight.bufferIndices = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.fmKnight.bufferIndices);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, bufferKnight, this.gl.STATIC_DRAW);
        this.fmKnight.numIndices = bufferKnight.byteLength / 3 / 2;
        const bufferEagle = new Uint16Array(210);
        for (let i = 0; i < 210; i++) {
            bufferEagle[i] = i;
        }
        this.fmEagle.bufferIndices = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.fmEagle.bufferIndices);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, bufferEagle, this.gl.STATIC_DRAW);
        this.fmEagle.numIndices = bufferEagle.byteLength / 3 / 2;
        [
            this.textureKnight,
            this.textureEagle
        ] = await Promise.all([
            UncompressedTextureLoader.load(`data/textures/knightRed.png`, this.gl, this.gl.LINEAR, this.gl.LINEAR, false),
            UncompressedTextureLoader.load(`data/textures/eagle.png`, this.gl, this.gl.LINEAR, this.gl.LINEAR, false)
        ]);
        this.generateMipmaps(this.textureKnight, this.textureEagle);
        this.loaded = true;
        this.timers.set(Timers.Fade, 0);
        console.log("Loaded all assets");
        this.initOffscreen();
        this.initVignette();
        (_a = this.readyCallback) === null || _a === void 0 ? void 0 : _a.call(this);
    }
    resizeCanvas() {
        if (this.canvas === undefined) {
            return;
        }
        super.resizeCanvas();
    }
    animate() {
        this.timers.iterate();
        const timeNow = new Date().getTime();
        if (this.lastTime != 0) {
            this.cameraPositionInterpolator.iterate(timeNow);
            if (this.cameraPositionInterpolator.timer === 1.0 && this.cameraMode === CameraMode.Random) {
                this.randomizeCamera();
            }
        }
        this.lastTime = timeNow;
    }
    /** Calculates projection matrix */
    setCameraFOV(multiplier) {
        var ratio;
        if (this.gl.canvas.height > 0) {
            ratio = this.gl.canvas.width / this.gl.canvas.height;
        }
        else {
            ratio = 1.0;
        }
        let fov = 0;
        if (this.gl.canvas.width >= this.gl.canvas.height) {
            fov = FOV_LANDSCAPE * multiplier;
        }
        else {
            fov = FOV_PORTRAIT * multiplier;
        }
        this.setFOV(this.mProjMatrix, fov, ratio, this.Z_NEAR, this.Z_FAR);
    }
    /**
     * Calculates camera matrix.
     *
     * @param a Position in [0...1] range
     */
    positionCamera(a) {
        if (this.customCamera !== undefined) {
            copy(this.mVMatrix, this.customCamera);
            return;
        }
        if (this.cameraMode === CameraMode.Random) {
            copy(this.mVMatrix, this.cameraPositionInterpolator.matrix);
            this.cameraPosition[0] = this.cameraPositionInterpolator.cameraPosition[0];
            this.cameraPosition[1] = this.cameraPositionInterpolator.cameraPosition[1];
            this.cameraPosition[2] = this.cameraPositionInterpolator.cameraPosition[2];
        }
    }
    positionCameraLight(a) {
        const lightDistance = (this.config.timeOfDay === 0 || this.config.timeOfDay === 1)
            ? this.config.lightDistance
            : this.config.lightDistanceLow;
        const lightHeight = (this.config.timeOfDay === 0 || this.config.timeOfDay === 1)
            ? this.config.lightHeight
            : this.config.lightHeightLow;
        const sina = Math.sin(a * Math.PI * 2);
        const cosa = Math.cos(a * Math.PI * 2);
        const x = sina * lightDistance;
        const y = cosa * lightDistance;
        const z = lightHeight;
        this.pointLight[0] = x;
        this.pointLight[1] = y;
        this.pointLight[2] = z;
        lookAt(this.mVMatrix, [x, y, z], // eye
        [0, 0, 0], // center
        [0, 0, 1] // up vector
        );
        copy(this.mViewMatrixLight, this.mVMatrix);
    }
    /** Issues actual draw calls */
    drawScene() {
        if (!this.loaded) {
            return;
        }
        const fogColor = this.getFogColor();
        this.gl.clearColor(fogColor[0], fogColor[1], fogColor[2], fogColor[3]);
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.cullFace(this.gl.BACK);
        this.gl.disable(this.gl.BLEND);
        // update shadows at half framerate but at full rate between camera changes
        const cameraTimer = this.cameraPositionInterpolator.timer;
        if (this.framesCount % 2 === 0 || cameraTimer < 0.02 || cameraTimer > 0.98) {
            this.gl.colorMask(false, false, false, false);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fboOffscreen.framebufferHandle);
            this.gl.viewport(0, 0, this.fboOffscreen.width, this.fboOffscreen.height);
            this.gl.depthMask(true);
            this.gl.enable(this.gl.DEPTH_TEST);
            this.gl.clear(this.gl.DEPTH_BUFFER_BIT);
            const lightFov = this.getLightFov();
            this.setFOV(this.mProjMatrix, lightFov, 1, this.config.lightNear, this.config.lightFar);
            this.setFOV(this.mProjMatrixLight, lightFov, 1, this.config.lightNear, this.config.lightFar);
            this.positionCameraLight(this.currentLightDirection);
            this.drawCastleModels(true);
        }
        this.gl.colorMask(true, true, true, true);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null); // This differs from OpenGL ES
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.setCameraFOV(1.0);
        this.positionCamera(this.timers.get(Timers.Camera));
        this.drawCastleModels(false);
        this.drawWind();
        // this.drawDepthMap();
        this.framesCount++;
    }
    getLightFov() {
        if (this.cameraMode === CameraMode.Random) {
            return this.config.lightFov * CAMERA_FOV_COEFFS[this.currentRandomCamera];
        }
        else {
            return this.config.lightFov;
        }
    }
    drawDepthMap() {
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.cullFace(this.gl.BACK);
        this.gl.disable(this.gl.BLEND);
        this.shaderDiffuse.use();
        this.setTexture2D(0, this.textureOffscreenDepth, this.shaderDiffuse.sTexture);
        this.drawVignette(this.shaderDiffuse);
    }
    drawVignette(shader) {
        this.unbindBuffers();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.mTriangleVerticesVignette);
        this.gl.enableVertexAttribArray(shader.rm_Vertex);
        this.gl.vertexAttribPointer(shader.rm_Vertex, 3, this.gl.FLOAT, false, 20, 0);
        this.gl.enableVertexAttribArray(shader.rm_TexCoord0);
        this.gl.vertexAttribPointer(shader.rm_TexCoord0, 2, this.gl.FLOAT, false, 20, 4 * 3);
        this.gl.uniformMatrix4fv(shader.view_proj_matrix, false, this.getOrthoMatrix());
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }
    drawCastleModels(drawToShadowMap) {
        if (this.shaderObjects === undefined
            || this.shaderObjectsDepth === undefined
            || this.shaderFlag === undefined
            || this.shaderFlagDepth === undefined) {
            return;
        }
        let shaderObjects;
        if (drawToShadowMap) {
            shaderObjects = this.shaderObjectsDepth;
            this.shaderObjectsDepth.use();
        }
        else {
            shaderObjects = this.shaderObjects;
            this.shaderObjects.use();
            const diffuseColor = this.getDiffuseColor();
            const ambientColor = this.getAmbientColor();
            this.gl.uniform4f(this.shaderObjects.lightDir, this.pointLight[0], this.pointLight[1], this.pointLight[2], 0);
            this.gl.uniform4fv(this.shaderObjects.ambient, ambientColor);
            this.gl.uniform4fv(this.shaderObjects.diffuse, diffuseColor);
            this.gl.uniform1f(this.shaderObjects.diffuseCoef, this.config.diffuseCoeff);
            this.gl.uniform1f(this.shaderObjects.diffuseExponent, this.config.diffuseExponent);
            this.setFogUniforms(this.shaderObjects);
            this.gl.uniform3f(this.shaderObjects.lightVector, this.pointLight[0], this.pointLight[1], this.pointLight[2]);
            this.setBaseShadowUniforms(this.shaderObjects, 0, 0, 0, 0, 0, 0, this.SCALE, this.SCALE, this.SCALE);
        }
        if (!drawToShadowMap) {
            this.gl.uniform3fv(this.shaderObjects.colors, CASTLE_INNER_COLORS);
        }
        shaderObjects.drawModel(this, this.fmCastleInner, 0, 0, 0, 0, 0, 0, this.SCALE, this.SCALE, this.SCALE);
        if (!drawToShadowMap) {
            this.gl.uniform3fv(this.shaderObjects.colors, CASTLE_OUTER_COLORS);
        }
        shaderObjects.drawModel(this, this.fmCastleOuter, 0, 0, 0, 0, 0, 0, this.SCALE, this.SCALE, this.SCALE);
        if (!drawToShadowMap) {
            this.gl.uniform3fv(this.shaderObjects.colors, GROUND_COLORS);
        }
        shaderObjects.drawModel(this, this.fmGround, 0, 0, 0, 0, 0, 0, this.SCALE, this.SCALE, this.SCALE);
        // flags
        this.drawFlag(drawToShadowMap, this.fmFlag1, -40, 0, 251, 0, 0, 0, 33, 33, 23, 0.4, 0.4, 1.0);
        this.drawFlag(drawToShadowMap, this.fmFlag1, -120, 0, 158, 0, 0, 0, 28, 28, 20, 0.4, 0.4, 1.0);
        for (const [x, y, z] of this.smallFlags2) {
            this.drawFlag(drawToShadowMap, this.fmFlag2, x * -20, z * -20, y * 20 + 14, 0, 0, 0, 18, 20, 10, 0.85, 0.85, 0.35);
        }
        for (const [x, y, z] of this.smallFlags3) {
            this.drawFlag(drawToShadowMap, this.fmFlag3, x * -20, z * -20, y * 20 + 14, 0, 0, 0, 18, 20, 10, 0.55, 0.2, 0.55);
        }
        this.drawEagles(drawToShadowMap);
        this.drawKnights(drawToShadowMap);
    }
    drawKnights(drawToShadowMap) {
        this.drawWalkingKnight(drawToShadowMap, SPLINE_WALL_INNER_1, this.timers.get(Timers.Spline2), 0);
        this.drawWalkingKnight(drawToShadowMap, SPLINE_WALL_INNER_2, this.timers.get(Timers.Spline3), 0);
        this.drawWalkingKnight(drawToShadowMap, SPLINE_WALL_INNER_3, this.timers.get(Timers.Spline1), 0);
        this.drawWalkingKnight(drawToShadowMap, SPLINE_WALL_INNER_4, this.timers.get(Timers.Spline3), 0);
        this.drawWalkingKnight(drawToShadowMap, SPLINE_WALL_INNER_5, this.timers.get(Timers.Spline3), 0);
        this.drawWalkingKnight(drawToShadowMap, SPLINE_WALL_INNER_6, this.timers.get(Timers.Spline1), 0);
        this.drawWalkingKnight(drawToShadowMap, SPLINE_WALL_INNER_6, this.timers.get(Timers.Spline1) + 0.5, 0);
        this.drawTalkingNearSwordsKnights(drawToShadowMap);
        this.drawKnightRepairingCart(drawToShadowMap);
        this.drawKnightsNearCannons(drawToShadowMap);
        this.drawKnightsAboveEntrance(drawToShadowMap);
    }
    drawWind() {
        var _a;
        if (this.shaderWind === undefined) {
            return;
        }
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.ONE, this.gl.ONE);
        this.gl.disable(this.gl.CULL_FACE);
        (_a = this.shaderWind) === null || _a === void 0 ? void 0 : _a.use();
        this.gl.uniform2f(this.shaderWind.dimensions, (WIND_SEGMENTS - 1) * 2, WIND_WIDTH);
        this.gl.uniform3f(this.shaderWind.amplitudes, 0.6, 0.4, 1.2);
        this.gl.uniform3f(this.shaderWind.frequencies, 0.032, 0.05, 0.02);
        this.gl.uniform1f(this.shaderWind.fogStartDistance, this.fogStartDistance);
        this.gl.uniform1f(this.shaderWind.fogDistance, this.fogDistance);
        this.drawWindBatch(this.timers.get(Timers.WindMove1), 0.36, this.randomWindCoeff1, 80);
        this.drawWindBatch(this.timers.get(Timers.WindMove2), 0.37, this.randomWindCoeff2, 100);
        this.drawWindBatch(this.timers.get(Timers.WindMove3), 0.38, this.randomWindCoeff3, 170);
        this.gl.disable(this.gl.BLEND);
        this.gl.enable(this.gl.CULL_FACE);
    }
    drawWindBatch(timerWindMove, timerPhase, randomWindCoeff, height) {
        if (this.shaderWind === undefined) {
            return;
        }
        for (let i = 0; i < 3; i++) {
            const timer = (timerWindMove + i * timerPhase) % 1.0;
            const a = Math.pow(Math.sin(timer * Math.PI), 2);
            const color = WIND_COLOR * a;
            const offsetX = -26 + i * 18 + 18 * randomWindCoeff;
            const offsetY = (timer * 4.4) * WIND_SEGMENTS * 4 / 10;
            this.gl.uniform4f(this.shaderWind.color, color, color, color, 1);
            this.gl.uniform3f(this.shaderWind.offset, offsetX, offsetY * 10, 0);
            this.shaderWind.draw(this, 0, -500, height, 0, 0, 0, 10, 1, 10, WIND_SEGMENTS);
        }
    }
    getTimeOfDayBaseColor() {
        return BASE_COLORS[this.config.timeOfDay];
    }
    getTimeOfDayAmbientCoeff() {
        return AMBIENT[this.config.timeOfDay];
    }
    getAmbientColor() {
        const baseColor = this.getTimeOfDayBaseColor();
        const ambient = this.getTimeOfDayAmbientCoeff();
        this.tempAmbient[0] = ambient * 0.5 + baseColor[0] * 0.5 * ambient;
        this.tempAmbient[1] = ambient * 0.5 + baseColor[1] * 0.5 * ambient;
        this.tempAmbient[2] = ambient * 0.5 + baseColor[2] * 0.5 * ambient;
        return this.tempAmbient;
    }
    getDiffuseColor() {
        const baseColor = this.getTimeOfDayBaseColor();
        const { diffuse } = this.config;
        this.tempDiffuse[0] = diffuse * 0.5 + baseColor[0] * 0.5;
        this.tempDiffuse[1] = diffuse * 0.5 + baseColor[1] * 0.5;
        this.tempDiffuse[2] = diffuse * 0.5 + baseColor[2] * 0.5;
        return this.tempDiffuse;
    }
    getFogColor() {
        const baseColor = this.getTimeOfDayBaseColor();
        const { fogColor } = this.config;
        this.tempFog[0] = fogColor[0] * 0.5 + baseColor[0] * 0.5;
        this.tempFog[1] = fogColor[1] * 0.5 + baseColor[1] * 0.5;
        this.tempFog[2] = fogColor[2] * 0.5 + baseColor[2] * 0.5;
        return this.tempFog;
    }
    drawEagles(drawToShadowMap) {
        const angle = this.timers.get(Timers.BirdsFly) * Math.PI * 2;
        const bird1 = this.getBirdPosition(angle, 80, -50);
        const bird2 = this.getBirdPosition(-angle - Math.PI, 0, 0);
        const bird3 = this.getBirdPosition(-angle - Math.PI, 0, 200);
        const bird4 = this.getBirdPosition(angle, 80, 170);
        const bird5 = this.getBirdPosition(-angle - Math.PI, 100, 180);
        const bird6 = this.getBirdPosition(angle, -100, 200);
        this.drawEagle(drawToShadowMap, 0, bird1.x, bird1.y, 140, 0, 0, -angle);
        this.drawEagle(drawToShadowMap, 1, bird2.x, bird2.y, 190, 0, 0, angle);
        this.drawEagle(drawToShadowMap, 2, bird3.x, bird3.y, 150, 0, 0, angle);
        this.drawEagle(drawToShadowMap, 3, bird4.x, bird4.y, 160, 0, 0, -angle);
        this.drawEagle(drawToShadowMap, 4, bird5.x, bird5.y, 180, 0, 0, angle);
        this.drawEagle(drawToShadowMap, 5, bird6.x, bird6.y, 170, 0, 0, -angle);
    }
    drawFlag(drawToShadowMap, model, tx, ty, tz, rx, ry, rz, sx, sy, sz, r, g, b) {
        if (this.shaderFlag === undefined || this.shaderFlagDepth === undefined) {
            return;
        }
        const diffuseColor = this.getDiffuseColor();
        const ambientColor = this.getAmbientColor();
        let shaderObjects;
        if (drawToShadowMap) {
            shaderObjects = this.shaderFlagDepth;
            this.shaderFlagDepth.use();
            this.gl.uniform1f(this.shaderFlagDepth.time, Math.PI * 2 * (1 - this.timers.get(Timers.Flags)));
            this.gl.uniform1f(this.shaderFlagDepth.amplitude, this.config.flagsAmplitude);
            this.gl.uniform1f(this.shaderFlagDepth.waves, this.config.flagsWaves);
        }
        else {
            shaderObjects = this.shaderFlag;
            this.shaderFlag.use();
            this.gl.uniform1f(this.shaderFlag.time, Math.PI * 2 * (1 - this.timers.get(Timers.Flags)));
            this.gl.uniform1f(this.shaderFlag.amplitude, this.config.flagsAmplitude);
            this.gl.uniform1f(this.shaderFlag.waves, this.config.flagsWaves);
            this.gl.uniform4f(this.shaderFlag.lightDir, this.pointLight[0], this.pointLight[1], this.pointLight[2], 0);
            this.gl.uniform4fv(this.shaderFlag.ambient, ambientColor);
            this.gl.uniform4fv(this.shaderFlag.diffuse, diffuseColor);
            this.gl.uniform1f(this.shaderFlag.diffuseCoef, this.config.diffuseCoeff);
            this.gl.uniform1f(this.shaderFlag.diffuseExponent, this.config.diffuseExponent);
            this.setFogUniforms(this.shaderFlag);
            this.gl.uniform3f(this.shaderFlag.lightVector, this.pointLight[0], this.pointLight[1], this.pointLight[2]);
            this.gl.uniform4fv(this.shaderFlag.color, [r, g, b, 1.0]);
            this.setBaseShadowUniforms(this.shaderFlag, tx, ty, tz, rx, ry, rz, sx, sy, sz);
        }
        shaderObjects.drawModel(this, model, tx, ty, tz, rx, ry, rz, sx, sy, sz);
    }
    drawTalkingNearSwordsKnights(drawToShadowMap) {
        const headAngle1 = Math.sin(this.timers.get(Timers.HeadAnimation1) * Math.PI * 2) * 0.1 - 0.5;
        const leftArmAngle1 = Math.sin(this.timers.get(Timers.ArmsAnimation2) * Math.PI * 2) * 0.1;
        const rightArmAngle1 = -Math.sin(this.timers.get(Timers.ArmsAnimation2) * Math.PI * 2) * 0.1 + 1.5;
        const headAngle2 = Math.sin(this.timers.get(Timers.HeadAnimation1) * Math.PI * 2 + 1) * 0.1 + 0.4;
        const leftArmAngle2 = Math.sin(this.timers.get(Timers.ArmsAnimation2) * Math.PI * 2) * 0.1;
        const rightArmAngle2 = -Math.sin(this.timers.get(Timers.ArmsAnimation2) * Math.PI * 2) * 0.1 + 1.45;
        this.drawKnight(drawToShadowMap, headAngle1, leftArmAngle1, rightArmAngle1, -35, 124, 0, 0, 0, 0.15);
        this.drawKnight(drawToShadowMap, headAngle2, leftArmAngle2, rightArmAngle2, -45, 137, 0, 0, 0, 1.7);
    }
    drawKnightsNearCannons(drawToShadowMap) {
        const headAngle1 = Math.sin(this.timers.get(Timers.ArmsAnimation2) * Math.PI * 2) * 0.07 + 0.9;
        const leftArmAngle1 = Math.sin(this.timers.get(Timers.ArmsAnimation2) * Math.PI * 2) * 0.05 + 0.4;
        const rightArmAngle1 = 1.8;
        const headAngle2 = Math.sin(this.timers.get(Timers.ArmsAnimation2) * Math.PI * 2) * 0.05 - 1.9;
        const leftArmAngle2 = Math.sin(this.timers.get(Timers.ArmsAnimation2) * Math.PI * 2) * 0.08 + 1.9;
        const rightArmAngle2 = Math.sin(this.timers.get(Timers.ArmsAnimation2) * Math.PI * 2 + 1) * 0.08 + 1.9;
        this.drawKnight(drawToShadowMap, headAngle1, leftArmAngle1, rightArmAngle1, 40, 123, 0, 0, 0, -3.3);
        this.drawKnight(drawToShadowMap, headAngle2, leftArmAngle2, rightArmAngle2, 49, 142, 0, 0, 0, -3);
    }
    drawKnightsAboveEntrance(drawToShadowMap) {
        const headAngle1 = Math.sin(this.timers.get(Timers.HeadAnimation1) * Math.PI * 2) * 0.04 + 0.1;
        const leftArmAngle1 = Math.sin(this.timers.get(Timers.ArmsAnimation2) * Math.PI * 2) * 0.09;
        const rightArmAngle1 = Math.sin(this.timers.get(Timers.ArmsAnimation2) * Math.PI * 2 + 1) * 0.09;
        const headAngle2 = Math.sin(this.timers.get(Timers.HeadAnimation1) * Math.PI * 2) * 0.04 - 0.1;
        const leftArmAngle2 = Math.sin(this.timers.get(Timers.ArmsAnimation2) * Math.PI * 2) * 0.09;
        const rightArmAngle2 = Math.sin(this.timers.get(Timers.ArmsAnimation2) * Math.PI * 2 + 1) * 0.09;
        const headAngle3 = Math.sin(this.timers.get(Timers.HeadAnimation1) * Math.PI * 2) * 0.04 - 0.1;
        const leftArmAngle3 = Math.sin(this.timers.get(Timers.ArmsAnimation2) * Math.PI * 2 + 1) * 0.1 + 0.5;
        const rightArmAngle3 = 2.0;
        this.drawKnight(drawToShadowMap, headAngle1, leftArmAngle1, rightArmAngle1, -30, -102, 20, 0, 0, 1.6);
        this.drawKnight(drawToShadowMap, headAngle2, leftArmAngle2, rightArmAngle2, 30, -102, 20, 0, 0, 0.6);
        this.drawKnight(drawToShadowMap, headAngle3, leftArmAngle3, rightArmAngle3, 83, -65, 20, 0, 0.13, 2.6);
        this.drawKnight(drawToShadowMap, headAngle3, rightArmAngle3, leftArmAngle3, 136, 0, 20, 0, 0.13, 3.6);
    }
    drawKnightRepairingCart(drawToShadowMap) {
        const headAngle1 = Math.sin(this.timers.get(Timers.HeadAnimation1) * Math.PI * 2 + 1.0) * 0.04 + 0.2;
        const leftArmAngle1 = Math.sin(this.timers.get(Timers.ArmsAnimation2) * Math.PI * 2 + 2.0) * 0.3 + 2;
        const rightArmAngle1 = -Math.sin(this.timers.get(Timers.ArmsAnimation2) * Math.PI * 2) * 0.3 + 2;
        this.drawKnight(drawToShadowMap, headAngle1, leftArmAngle1, rightArmAngle1, -41, 234, 0, 0.26, 0, 1.1);
    }
    drawWalkingKnight(drawToShadowMap, spline, timerSpline, phase) {
        if (timerSpline > 1) {
            timerSpline = timerSpline - 1;
        }
        const headAngle = Math.sin(this.timers.get(Timers.HeadAnimation1) * Math.PI * 2 + phase) * 0.2;
        const leftArmAngle = Math.sin(this.timers.get(Timers.ArmsAnimation1) * Math.PI * 2 + phase) * 0.5;
        const rightArmAngle = -Math.sin(this.timers.get(Timers.ArmsAnimation1) * Math.PI * 2 + phase) * 0.5;
        const step = Math.abs(Math.sin(this.timers.get(Timers.Step1) * Math.PI * 2 + phase)) * 1.2;
        const p = spline.getCurrentPoint(timerSpline);
        let r = spline.getRotation(timerSpline).z;
        r *= 0.0174533;
        this.drawKnight(drawToShadowMap, headAngle, leftArmAngle, rightArmAngle, p.y, p.x, p.z + step, 0, 0, r);
    }
    drawKnight(drawToShadowMap, headAngle, leftArmAngle, rightArmAngle, tx, ty, tz, rx, ry, rz) {
        if (this.shaderKnight === undefined || this.shaderKnightDepth === undefined) {
            return;
        }
        const diffuseColor = this.getDiffuseColor();
        const ambientColor = this.getAmbientColor();
        const scaleKnight = 2.0 * 0.8;
        let shaderObjects;
        if (drawToShadowMap) {
            shaderObjects = this.shaderKnightDepth;
            this.shaderKnightDepth.use();
            this.gl.uniform1f(this.shaderKnightDepth.headRotationZ, headAngle);
            this.gl.uniform2f(this.shaderKnightDepth.armRotations, leftArmAngle, rightArmAngle);
        }
        else {
            shaderObjects = this.shaderKnight;
            this.shaderKnight.use();
            this.gl.uniform4f(this.shaderKnight.lightDir, this.pointLight[0], this.pointLight[1], this.pointLight[2], 0);
            this.gl.uniform4fv(this.shaderKnight.ambient, ambientColor);
            this.gl.uniform4fv(this.shaderKnight.diffuse, diffuseColor);
            this.gl.uniform1f(this.shaderKnight.diffuseCoef, this.config.diffuseCoeff);
            this.gl.uniform1f(this.shaderKnight.diffuseExponent, this.config.diffuseExponent);
            this.setFogUniforms(this.shaderKnight);
            this.gl.uniform3f(this.shaderKnight.lightVector, this.pointLight[0], this.pointLight[1], this.pointLight[2]);
            this.setTexture2D(1, this.textureKnight, this.shaderKnight.sTexture);
            this.gl.uniform1f(this.shaderKnight.headRotationZ, headAngle);
            this.gl.uniform2f(this.shaderKnight.armRotations, leftArmAngle, rightArmAngle);
            this.setBaseShadowUniforms(this.shaderKnight, tx, ty, tz, rx, ry, rz, scaleKnight, scaleKnight, scaleKnight);
        }
        shaderObjects.drawModel(this, this.fmKnight, tx, ty, tz, rx, ry, rz, scaleKnight, scaleKnight, scaleKnight);
    }
    getBirdPosition(angle, centerX, centerY) {
        const x = Math.sin(angle) * this.BIRD_FLIGHT_RADIUS + centerX;
        const y = Math.cos(angle) * this.BIRD_FLIGHT_RADIUS + centerY;
        return { x, y };
    }
    drawEagle(drawToShadowMap, phase, tx, ty, tz, rx, ry, rz) {
        if (this.shaderEagle === undefined || this.shaderEagleDepth === undefined) {
            return;
        }
        const diffuseColor = this.getDiffuseColor();
        const ambientColor = this.getAmbientColor();
        const scaleEagle = 0.13;
        let shaderObjects;
        const wingsRotation = Math.sin(this.timers.get(Timers.Wings) * Math.PI * 2 + phase) * 0.4;
        if (drawToShadowMap) {
            shaderObjects = this.shaderEagleDepth;
            this.shaderEagleDepth.use();
            this.gl.uniform1f(this.shaderEagleDepth.wingsRotation, wingsRotation);
        }
        else {
            shaderObjects = this.shaderEagle;
            this.shaderEagle.use();
            this.gl.uniform4f(this.shaderEagle.lightDir, this.pointLight[0], this.pointLight[1], this.pointLight[2], 0);
            this.gl.uniform4fv(this.shaderEagle.ambient, ambientColor);
            this.gl.uniform4fv(this.shaderEagle.diffuse, diffuseColor);
            this.gl.uniform1f(this.shaderEagle.diffuseCoef, this.config.diffuseCoeff);
            this.gl.uniform1f(this.shaderEagle.diffuseExponent, this.config.diffuseExponent);
            this.setFogUniforms(this.shaderEagle);
            this.gl.uniform3f(this.shaderEagle.lightVector, this.pointLight[0], this.pointLight[1], this.pointLight[2]);
            this.gl.uniform1f(this.shaderEagle.wingsRotation, wingsRotation);
            this.setTexture2D(1, this.textureEagle, this.shaderEagle.sTexture);
            this.setBaseShadowUniforms(this.shaderEagle, tx, ty, tz, rx, ry, rz, scaleEagle, scaleEagle, scaleEagle);
        }
        shaderObjects.drawModel(this, this.fmEagle, tx, ty, tz, rx, ry, rz, scaleEagle, scaleEagle, scaleEagle);
    }
    get fogStartDistance() {
        return this.config.fogStartDistance * this.timers.get(Timers.Fade);
    }
    get fogDistance() {
        return this.config.fogDistance * this.timers.get(Timers.Fade);
    }
    setFogUniforms(shader) {
        const fogColor = this.getFogColor();
        this.gl.uniform4fv(shader.fogColor, fogColor);
        this.gl.uniform1f(shader.fogStartDistance, this.fogStartDistance);
        this.gl.uniform1f(shader.fogDistance, this.fogDistance);
    }
    setBaseShadowUniforms(shader, tx, ty, tz, rx, ry, rz, sx, sy, sz) {
        this.setTexture2D(0, this.textureOffscreenDepth, shader.sDepth);
        this.gl.uniform1f(shader.texelSize, 1.0 / this.SHADOWMAP_SIZE * this.SHADOWMAP_TEXEL_OFFSET_SCALE);
        this.gl.uniformMatrix4fv(shader.projectionMatrix, false, this.mProjMatrixLight);
        this.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);
        this.gl.uniformMatrix4fv(shader.modelMatrix, false, this.mMMatrix);
        this.gl.uniformMatrix4fv(shader.lightMatrix, false, this.mViewMatrixLight, 0);
        this.gl.uniform1f(shader.shadowBrightnessFS, this.config.shadowBrightness);
        this.gl.uniform1f(shader.pcfBiasCorrection, this.PCF_BIAS_CORRECTION);
    }
    setCameraMode(mode) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        if (mode === CameraMode.Orbiting) {
            (_a = this.orbitControls) === null || _a === void 0 ? void 0 : _a.enable();
            (_b = this.freeMovement) === null || _b === void 0 ? void 0 : _b.disable();
        }
        else if (mode === CameraMode.FPS) {
            (_c = this.freeMovement) === null || _c === void 0 ? void 0 : _c.updatePosition([0, -400, 150]);
            (_d = this.freeMovement) === null || _d === void 0 ? void 0 : _d.updateRotation([0.39, 0, 0]);
            (_e = this.orbitControls) === null || _e === void 0 ? void 0 : _e.disable();
            (_f = this.freeMovement) === null || _f === void 0 ? void 0 : _f.enable();
        }
        else {
            (_g = this.orbitControls) === null || _g === void 0 ? void 0 : _g.disable();
            (_h = this.freeMovement) === null || _h === void 0 ? void 0 : _h.disable();
        }
        this.cameraMode = mode;
    }
    get currentCameraMode() {
        return this.cameraMode;
    }
    checkGlError(operation) {
        // Do nothing in production build.
    }
    set ready(callback) {
        this.readyCallback = callback;
    }
    getProjMatrix() {
        return this.mProjMatrix;
    }
    getCameraPosition() {
        return this.cameraPosition;
    }
    getCanvas() {
        return this.canvas;
    }
    createDepthTexture(gl, texWidth, texHeight) {
        const textureID = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, textureID);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
        const version = gl.getParameter(gl.VERSION) || "";
        const glFormat = gl.DEPTH_COMPONENT;
        const glInternalFormat = version.includes("WebGL 2")
            ? gl.DEPTH_COMPONENT16
            : gl.DEPTH_COMPONENT;
        const type = gl.UNSIGNED_SHORT;
        // In WebGL, we cannot pass array to depth texture.
        gl.texImage2D(gl.TEXTURE_2D, 0, glInternalFormat, texWidth, texHeight, 0, glFormat, type, null);
        return textureID;
    }
    initOffscreen() {
        if (this.textureOffscreenDepth !== undefined) {
            this.gl.deleteTexture(this.textureOffscreenDepth);
        }
        if (this.textureOffscreenColor !== undefined) {
            this.gl.deleteTexture(this.textureOffscreenColor);
        }
        this.textureOffscreenColor = TextureUtils.createNpotTexture(this.gl, this.SHADOWMAP_SIZE, this.SHADOWMAP_SIZE, false);
        this.checkGlError("color");
        this.textureOffscreenDepth = this.createDepthTexture(this.gl, this.SHADOWMAP_SIZE, this.SHADOWMAP_SIZE);
        this.checkGlError("depth");
        this.fboOffscreen = new FrameBuffer(this.gl);
        this.fboOffscreen.textureHandle = this.textureOffscreenColor;
        this.fboOffscreen.depthTextureHandle = this.textureOffscreenDepth;
        this.fboOffscreen.width = this.SHADOWMAP_SIZE;
        this.fboOffscreen.height = this.SHADOWMAP_SIZE;
        this.fboOffscreen.createGLData(this.SHADOWMAP_SIZE, this.SHADOWMAP_SIZE);
        this.checkGlError("offscreen FBO");
        console.log("Initialized offscreen FBO.");
    }
    initVignette() {
        ortho(this.matOrtho, -1, 1, -1, 1, 2.0, 250);
        this.mQuadTriangles = new Float32Array([
            // X, Y, Z, U, V
            -1.0, -1.0, -5.0, 0.0, 0.0,
            1.0, -1.0, -5.0, 1.0, 0.0,
            -1.0, 1.0, -5.0, 0.0, 1.0,
            1.0, 1.0, -5.0, 1.0, 1.0, // 3. right-top
        ]);
        this.mTriangleVerticesVignette = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.mTriangleVerticesVignette);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.mQuadTriangles, this.gl.STATIC_DRAW);
    }
    logCamera() {
        const camera = CAMERAS[0];
        console.log(`
        {
            start: {
                position: new Float32Array([${camera.start.position.toString()}]),
                rotation: new Float32Array([${camera.start.rotation.toString()}])
            },
            end: {
                position: new Float32Array([${camera.end.position.toString()}]),
                rotation: new Float32Array([${camera.end.rotation.toString()}])
            },
            speedMultiplier: 1.0
        },
        `);
    }
    randomizeCamera() {
        this.currentRandomCamera = (this.currentRandomCamera + 1 + Math.trunc(Math.random() * (CAMERAS.length - 2))) % CAMERAS.length;
        this.cameraPositionInterpolator.speed = this.CAMERA_SPEED * CAMERAS[this.currentRandomCamera].speedMultiplier;
        this.cameraPositionInterpolator.position = CAMERAS[this.currentRandomCamera];
        this.cameraPositionInterpolator.reset();
        this.currentLightDirection = Math.random() * Math.PI * 2;
        this.randomWindCoeff1 = Math.random();
        this.randomWindCoeff2 = Math.random();
        this.randomWindCoeff3 = Math.random();
    }
    updateShadowResolution(scale) {
        this.SHADOWMAP_SIZE = 1024 * scale;
        this.PCF_BIAS_CORRECTION = 1.5 / this.SHADOWMAP_SIZE;
        this.initOffscreen();
    }
}

/**
 * dat-gui JavaScript Controller Library
 * https://github.com/dataarts/dat.gui
 *
 * Copyright 2011 Data Arts Team, Google Creative Lab
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */

function ___$insertStyle(css) {
  if (!css) {
    return;
  }
  if (typeof window === 'undefined') {
    return;
  }

  var style = document.createElement('style');

  style.setAttribute('type', 'text/css');
  style.innerHTML = css;
  document.head.appendChild(style);

  return css;
}

function colorToString (color, forceCSSHex) {
  var colorFormat = color.__state.conversionName.toString();
  var r = Math.round(color.r);
  var g = Math.round(color.g);
  var b = Math.round(color.b);
  var a = color.a;
  var h = Math.round(color.h);
  var s = color.s.toFixed(1);
  var v = color.v.toFixed(1);
  if (forceCSSHex || colorFormat === 'THREE_CHAR_HEX' || colorFormat === 'SIX_CHAR_HEX') {
    var str = color.hex.toString(16);
    while (str.length < 6) {
      str = '0' + str;
    }
    return '#' + str;
  } else if (colorFormat === 'CSS_RGB') {
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  } else if (colorFormat === 'CSS_RGBA') {
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  } else if (colorFormat === 'HEX') {
    return '0x' + color.hex.toString(16);
  } else if (colorFormat === 'RGB_ARRAY') {
    return '[' + r + ',' + g + ',' + b + ']';
  } else if (colorFormat === 'RGBA_ARRAY') {
    return '[' + r + ',' + g + ',' + b + ',' + a + ']';
  } else if (colorFormat === 'RGB_OBJ') {
    return '{r:' + r + ',g:' + g + ',b:' + b + '}';
  } else if (colorFormat === 'RGBA_OBJ') {
    return '{r:' + r + ',g:' + g + ',b:' + b + ',a:' + a + '}';
  } else if (colorFormat === 'HSV_OBJ') {
    return '{h:' + h + ',s:' + s + ',v:' + v + '}';
  } else if (colorFormat === 'HSVA_OBJ') {
    return '{h:' + h + ',s:' + s + ',v:' + v + ',a:' + a + '}';
  }
  return 'unknown format';
}

var ARR_EACH = Array.prototype.forEach;
var ARR_SLICE = Array.prototype.slice;
var Common = {
  BREAK: {},
  extend: function extend(target) {
    this.each(ARR_SLICE.call(arguments, 1), function (obj) {
      var keys = this.isObject(obj) ? Object.keys(obj) : [];
      keys.forEach(function (key) {
        if (!this.isUndefined(obj[key])) {
          target[key] = obj[key];
        }
      }.bind(this));
    }, this);
    return target;
  },
  defaults: function defaults(target) {
    this.each(ARR_SLICE.call(arguments, 1), function (obj) {
      var keys = this.isObject(obj) ? Object.keys(obj) : [];
      keys.forEach(function (key) {
        if (this.isUndefined(target[key])) {
          target[key] = obj[key];
        }
      }.bind(this));
    }, this);
    return target;
  },
  compose: function compose() {
    var toCall = ARR_SLICE.call(arguments);
    return function () {
      var args = ARR_SLICE.call(arguments);
      for (var i = toCall.length - 1; i >= 0; i--) {
        args = [toCall[i].apply(this, args)];
      }
      return args[0];
    };
  },
  each: function each(obj, itr, scope) {
    if (!obj) {
      return;
    }
    if (ARR_EACH && obj.forEach && obj.forEach === ARR_EACH) {
      obj.forEach(itr, scope);
    } else if (obj.length === obj.length + 0) {
      var key = void 0;
      var l = void 0;
      for (key = 0, l = obj.length; key < l; key++) {
        if (key in obj && itr.call(scope, obj[key], key) === this.BREAK) {
          return;
        }
      }
    } else {
      for (var _key in obj) {
        if (itr.call(scope, obj[_key], _key) === this.BREAK) {
          return;
        }
      }
    }
  },
  defer: function defer(fnc) {
    setTimeout(fnc, 0);
  },
  debounce: function debounce(func, threshold, callImmediately) {
    var timeout = void 0;
    return function () {
      var obj = this;
      var args = arguments;
      function delayed() {
        timeout = null;
        if (!callImmediately) func.apply(obj, args);
      }
      var callNow = callImmediately || !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(delayed, threshold);
      if (callNow) {
        func.apply(obj, args);
      }
    };
  },
  toArray: function toArray(obj) {
    if (obj.toArray) return obj.toArray();
    return ARR_SLICE.call(obj);
  },
  isUndefined: function isUndefined(obj) {
    return obj === undefined;
  },
  isNull: function isNull(obj) {
    return obj === null;
  },
  isNaN: function (_isNaN) {
    function isNaN(_x) {
      return _isNaN.apply(this, arguments);
    }
    isNaN.toString = function () {
      return _isNaN.toString();
    };
    return isNaN;
  }(function (obj) {
    return isNaN(obj);
  }),
  isArray: Array.isArray || function (obj) {
    return obj.constructor === Array;
  },
  isObject: function isObject(obj) {
    return obj === Object(obj);
  },
  isNumber: function isNumber(obj) {
    return obj === obj + 0;
  },
  isString: function isString(obj) {
    return obj === obj + '';
  },
  isBoolean: function isBoolean(obj) {
    return obj === false || obj === true;
  },
  isFunction: function isFunction(obj) {
    return obj instanceof Function;
  }
};

var INTERPRETATIONS = [
{
  litmus: Common.isString,
  conversions: {
    THREE_CHAR_HEX: {
      read: function read(original) {
        var test = original.match(/^#([A-F0-9])([A-F0-9])([A-F0-9])$/i);
        if (test === null) {
          return false;
        }
        return {
          space: 'HEX',
          hex: parseInt('0x' + test[1].toString() + test[1].toString() + test[2].toString() + test[2].toString() + test[3].toString() + test[3].toString(), 0)
        };
      },
      write: colorToString
    },
    SIX_CHAR_HEX: {
      read: function read(original) {
        var test = original.match(/^#([A-F0-9]{6})$/i);
        if (test === null) {
          return false;
        }
        return {
          space: 'HEX',
          hex: parseInt('0x' + test[1].toString(), 0)
        };
      },
      write: colorToString
    },
    CSS_RGB: {
      read: function read(original) {
        var test = original.match(/^rgb\(\s*(\S+)\s*,\s*(\S+)\s*,\s*(\S+)\s*\)/);
        if (test === null) {
          return false;
        }
        return {
          space: 'RGB',
          r: parseFloat(test[1]),
          g: parseFloat(test[2]),
          b: parseFloat(test[3])
        };
      },
      write: colorToString
    },
    CSS_RGBA: {
      read: function read(original) {
        var test = original.match(/^rgba\(\s*(\S+)\s*,\s*(\S+)\s*,\s*(\S+)\s*,\s*(\S+)\s*\)/);
        if (test === null) {
          return false;
        }
        return {
          space: 'RGB',
          r: parseFloat(test[1]),
          g: parseFloat(test[2]),
          b: parseFloat(test[3]),
          a: parseFloat(test[4])
        };
      },
      write: colorToString
    }
  }
},
{
  litmus: Common.isNumber,
  conversions: {
    HEX: {
      read: function read(original) {
        return {
          space: 'HEX',
          hex: original,
          conversionName: 'HEX'
        };
      },
      write: function write(color) {
        return color.hex;
      }
    }
  }
},
{
  litmus: Common.isArray,
  conversions: {
    RGB_ARRAY: {
      read: function read(original) {
        if (original.length !== 3) {
          return false;
        }
        return {
          space: 'RGB',
          r: original[0],
          g: original[1],
          b: original[2]
        };
      },
      write: function write(color) {
        return [color.r, color.g, color.b];
      }
    },
    RGBA_ARRAY: {
      read: function read(original) {
        if (original.length !== 4) return false;
        return {
          space: 'RGB',
          r: original[0],
          g: original[1],
          b: original[2],
          a: original[3]
        };
      },
      write: function write(color) {
        return [color.r, color.g, color.b, color.a];
      }
    }
  }
},
{
  litmus: Common.isObject,
  conversions: {
    RGBA_OBJ: {
      read: function read(original) {
        if (Common.isNumber(original.r) && Common.isNumber(original.g) && Common.isNumber(original.b) && Common.isNumber(original.a)) {
          return {
            space: 'RGB',
            r: original.r,
            g: original.g,
            b: original.b,
            a: original.a
          };
        }
        return false;
      },
      write: function write(color) {
        return {
          r: color.r,
          g: color.g,
          b: color.b,
          a: color.a
        };
      }
    },
    RGB_OBJ: {
      read: function read(original) {
        if (Common.isNumber(original.r) && Common.isNumber(original.g) && Common.isNumber(original.b)) {
          return {
            space: 'RGB',
            r: original.r,
            g: original.g,
            b: original.b
          };
        }
        return false;
      },
      write: function write(color) {
        return {
          r: color.r,
          g: color.g,
          b: color.b
        };
      }
    },
    HSVA_OBJ: {
      read: function read(original) {
        if (Common.isNumber(original.h) && Common.isNumber(original.s) && Common.isNumber(original.v) && Common.isNumber(original.a)) {
          return {
            space: 'HSV',
            h: original.h,
            s: original.s,
            v: original.v,
            a: original.a
          };
        }
        return false;
      },
      write: function write(color) {
        return {
          h: color.h,
          s: color.s,
          v: color.v,
          a: color.a
        };
      }
    },
    HSV_OBJ: {
      read: function read(original) {
        if (Common.isNumber(original.h) && Common.isNumber(original.s) && Common.isNumber(original.v)) {
          return {
            space: 'HSV',
            h: original.h,
            s: original.s,
            v: original.v
          };
        }
        return false;
      },
      write: function write(color) {
        return {
          h: color.h,
          s: color.s,
          v: color.v
        };
      }
    }
  }
}];
var result = void 0;
var toReturn = void 0;
var interpret = function interpret() {
  toReturn = false;
  var original = arguments.length > 1 ? Common.toArray(arguments) : arguments[0];
  Common.each(INTERPRETATIONS, function (family) {
    if (family.litmus(original)) {
      Common.each(family.conversions, function (conversion, conversionName) {
        result = conversion.read(original);
        if (toReturn === false && result !== false) {
          toReturn = result;
          result.conversionName = conversionName;
          result.conversion = conversion;
          return Common.BREAK;
        }
      });
      return Common.BREAK;
    }
  });
  return toReturn;
};

var tmpComponent = void 0;
var ColorMath = {
  hsv_to_rgb: function hsv_to_rgb(h, s, v) {
    var hi = Math.floor(h / 60) % 6;
    var f = h / 60 - Math.floor(h / 60);
    var p = v * (1.0 - s);
    var q = v * (1.0 - f * s);
    var t = v * (1.0 - (1.0 - f) * s);
    var c = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][hi];
    return {
      r: c[0] * 255,
      g: c[1] * 255,
      b: c[2] * 255
    };
  },
  rgb_to_hsv: function rgb_to_hsv(r, g, b) {
    var min = Math.min(r, g, b);
    var max = Math.max(r, g, b);
    var delta = max - min;
    var h = void 0;
    var s = void 0;
    if (max !== 0) {
      s = delta / max;
    } else {
      return {
        h: NaN,
        s: 0,
        v: 0
      };
    }
    if (r === max) {
      h = (g - b) / delta;
    } else if (g === max) {
      h = 2 + (b - r) / delta;
    } else {
      h = 4 + (r - g) / delta;
    }
    h /= 6;
    if (h < 0) {
      h += 1;
    }
    return {
      h: h * 360,
      s: s,
      v: max / 255
    };
  },
  rgb_to_hex: function rgb_to_hex(r, g, b) {
    var hex = this.hex_with_component(0, 2, r);
    hex = this.hex_with_component(hex, 1, g);
    hex = this.hex_with_component(hex, 0, b);
    return hex;
  },
  component_from_hex: function component_from_hex(hex, componentIndex) {
    return hex >> componentIndex * 8 & 0xFF;
  },
  hex_with_component: function hex_with_component(hex, componentIndex, value) {
    return value << (tmpComponent = componentIndex * 8) | hex & ~(0xFF << tmpComponent);
  }
};

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};











var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();







var get = function get(object, property, receiver) {
  if (object === null) object = Function.prototype;
  var desc = Object.getOwnPropertyDescriptor(object, property);

  if (desc === undefined) {
    var parent = Object.getPrototypeOf(object);

    if (parent === null) {
      return undefined;
    } else {
      return get(parent, property, receiver);
    }
  } else if ("value" in desc) {
    return desc.value;
  } else {
    var getter = desc.get;

    if (getter === undefined) {
      return undefined;
    }

    return getter.call(receiver);
  }
};

var inherits = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};











var possibleConstructorReturn = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
};

var Color = function () {
  function Color() {
    classCallCheck(this, Color);
    this.__state = interpret.apply(this, arguments);
    if (this.__state === false) {
      throw new Error('Failed to interpret color arguments');
    }
    this.__state.a = this.__state.a || 1;
  }
  createClass(Color, [{
    key: 'toString',
    value: function toString() {
      return colorToString(this);
    }
  }, {
    key: 'toHexString',
    value: function toHexString() {
      return colorToString(this, true);
    }
  }, {
    key: 'toOriginal',
    value: function toOriginal() {
      return this.__state.conversion.write(this);
    }
  }]);
  return Color;
}();
function defineRGBComponent(target, component, componentHexIndex) {
  Object.defineProperty(target, component, {
    get: function get$$1() {
      if (this.__state.space === 'RGB') {
        return this.__state[component];
      }
      Color.recalculateRGB(this, component, componentHexIndex);
      return this.__state[component];
    },
    set: function set$$1(v) {
      if (this.__state.space !== 'RGB') {
        Color.recalculateRGB(this, component, componentHexIndex);
        this.__state.space = 'RGB';
      }
      this.__state[component] = v;
    }
  });
}
function defineHSVComponent(target, component) {
  Object.defineProperty(target, component, {
    get: function get$$1() {
      if (this.__state.space === 'HSV') {
        return this.__state[component];
      }
      Color.recalculateHSV(this);
      return this.__state[component];
    },
    set: function set$$1(v) {
      if (this.__state.space !== 'HSV') {
        Color.recalculateHSV(this);
        this.__state.space = 'HSV';
      }
      this.__state[component] = v;
    }
  });
}
Color.recalculateRGB = function (color, component, componentHexIndex) {
  if (color.__state.space === 'HEX') {
    color.__state[component] = ColorMath.component_from_hex(color.__state.hex, componentHexIndex);
  } else if (color.__state.space === 'HSV') {
    Common.extend(color.__state, ColorMath.hsv_to_rgb(color.__state.h, color.__state.s, color.__state.v));
  } else {
    throw new Error('Corrupted color state');
  }
};
Color.recalculateHSV = function (color) {
  var result = ColorMath.rgb_to_hsv(color.r, color.g, color.b);
  Common.extend(color.__state, {
    s: result.s,
    v: result.v
  });
  if (!Common.isNaN(result.h)) {
    color.__state.h = result.h;
  } else if (Common.isUndefined(color.__state.h)) {
    color.__state.h = 0;
  }
};
Color.COMPONENTS = ['r', 'g', 'b', 'h', 's', 'v', 'hex', 'a'];
defineRGBComponent(Color.prototype, 'r', 2);
defineRGBComponent(Color.prototype, 'g', 1);
defineRGBComponent(Color.prototype, 'b', 0);
defineHSVComponent(Color.prototype, 'h');
defineHSVComponent(Color.prototype, 's');
defineHSVComponent(Color.prototype, 'v');
Object.defineProperty(Color.prototype, 'a', {
  get: function get$$1() {
    return this.__state.a;
  },
  set: function set$$1(v) {
    this.__state.a = v;
  }
});
Object.defineProperty(Color.prototype, 'hex', {
  get: function get$$1() {
    if (this.__state.space !== 'HEX') {
      this.__state.hex = ColorMath.rgb_to_hex(this.r, this.g, this.b);
      this.__state.space = 'HEX';
    }
    return this.__state.hex;
  },
  set: function set$$1(v) {
    this.__state.space = 'HEX';
    this.__state.hex = v;
  }
});

var Controller = function () {
  function Controller(object, property) {
    classCallCheck(this, Controller);
    this.initialValue = object[property];
    this.domElement = document.createElement('div');
    this.object = object;
    this.property = property;
    this.__onChange = undefined;
    this.__onFinishChange = undefined;
  }
  createClass(Controller, [{
    key: 'onChange',
    value: function onChange(fnc) {
      this.__onChange = fnc;
      return this;
    }
  }, {
    key: 'onFinishChange',
    value: function onFinishChange(fnc) {
      this.__onFinishChange = fnc;
      return this;
    }
  }, {
    key: 'setValue',
    value: function setValue(newValue) {
      this.object[this.property] = newValue;
      if (this.__onChange) {
        this.__onChange.call(this, newValue);
      }
      this.updateDisplay();
      return this;
    }
  }, {
    key: 'getValue',
    value: function getValue() {
      return this.object[this.property];
    }
  }, {
    key: 'updateDisplay',
    value: function updateDisplay() {
      return this;
    }
  }, {
    key: 'isModified',
    value: function isModified() {
      return this.initialValue !== this.getValue();
    }
  }]);
  return Controller;
}();

var EVENT_MAP = {
  HTMLEvents: ['change'],
  MouseEvents: ['click', 'mousemove', 'mousedown', 'mouseup', 'mouseover'],
  KeyboardEvents: ['keydown']
};
var EVENT_MAP_INV = {};
Common.each(EVENT_MAP, function (v, k) {
  Common.each(v, function (e) {
    EVENT_MAP_INV[e] = k;
  });
});
var CSS_VALUE_PIXELS = /(\d+(\.\d+)?)px/;
function cssValueToPixels(val) {
  if (val === '0' || Common.isUndefined(val)) {
    return 0;
  }
  var match = val.match(CSS_VALUE_PIXELS);
  if (!Common.isNull(match)) {
    return parseFloat(match[1]);
  }
  return 0;
}
var dom = {
  makeSelectable: function makeSelectable(elem, selectable) {
    if (elem === undefined || elem.style === undefined) return;
    elem.onselectstart = selectable ? function () {
      return false;
    } : function () {};
    elem.style.MozUserSelect = selectable ? 'auto' : 'none';
    elem.style.KhtmlUserSelect = selectable ? 'auto' : 'none';
    elem.unselectable = selectable ? 'on' : 'off';
  },
  makeFullscreen: function makeFullscreen(elem, hor, vert) {
    var vertical = vert;
    var horizontal = hor;
    if (Common.isUndefined(horizontal)) {
      horizontal = true;
    }
    if (Common.isUndefined(vertical)) {
      vertical = true;
    }
    elem.style.position = 'absolute';
    if (horizontal) {
      elem.style.left = 0;
      elem.style.right = 0;
    }
    if (vertical) {
      elem.style.top = 0;
      elem.style.bottom = 0;
    }
  },
  fakeEvent: function fakeEvent(elem, eventType, pars, aux) {
    var params = pars || {};
    var className = EVENT_MAP_INV[eventType];
    if (!className) {
      throw new Error('Event type ' + eventType + ' not supported.');
    }
    var evt = document.createEvent(className);
    switch (className) {
      case 'MouseEvents':
        {
          var clientX = params.x || params.clientX || 0;
          var clientY = params.y || params.clientY || 0;
          evt.initMouseEvent(eventType, params.bubbles || false, params.cancelable || true, window, params.clickCount || 1, 0,
          0,
          clientX,
          clientY,
          false, false, false, false, 0, null);
          break;
        }
      case 'KeyboardEvents':
        {
          var init = evt.initKeyboardEvent || evt.initKeyEvent;
          Common.defaults(params, {
            cancelable: true,
            ctrlKey: false,
            altKey: false,
            shiftKey: false,
            metaKey: false,
            keyCode: undefined,
            charCode: undefined
          });
          init(eventType, params.bubbles || false, params.cancelable, window, params.ctrlKey, params.altKey, params.shiftKey, params.metaKey, params.keyCode, params.charCode);
          break;
        }
      default:
        {
          evt.initEvent(eventType, params.bubbles || false, params.cancelable || true);
          break;
        }
    }
    Common.defaults(evt, aux);
    elem.dispatchEvent(evt);
  },
  bind: function bind(elem, event, func, newBool) {
    var bool = newBool || false;
    if (elem.addEventListener) {
      elem.addEventListener(event, func, bool);
    } else if (elem.attachEvent) {
      elem.attachEvent('on' + event, func);
    }
    return dom;
  },
  unbind: function unbind(elem, event, func, newBool) {
    var bool = newBool || false;
    if (elem.removeEventListener) {
      elem.removeEventListener(event, func, bool);
    } else if (elem.detachEvent) {
      elem.detachEvent('on' + event, func);
    }
    return dom;
  },
  addClass: function addClass(elem, className) {
    if (elem.className === undefined) {
      elem.className = className;
    } else if (elem.className !== className) {
      var classes = elem.className.split(/ +/);
      if (classes.indexOf(className) === -1) {
        classes.push(className);
        elem.className = classes.join(' ').replace(/^\s+/, '').replace(/\s+$/, '');
      }
    }
    return dom;
  },
  removeClass: function removeClass(elem, className) {
    if (className) {
      if (elem.className === className) {
        elem.removeAttribute('class');
      } else {
        var classes = elem.className.split(/ +/);
        var index = classes.indexOf(className);
        if (index !== -1) {
          classes.splice(index, 1);
          elem.className = classes.join(' ');
        }
      }
    } else {
      elem.className = undefined;
    }
    return dom;
  },
  hasClass: function hasClass(elem, className) {
    return new RegExp('(?:^|\\s+)' + className + '(?:\\s+|$)').test(elem.className) || false;
  },
  getWidth: function getWidth(elem) {
    var style = getComputedStyle(elem);
    return cssValueToPixels(style['border-left-width']) + cssValueToPixels(style['border-right-width']) + cssValueToPixels(style['padding-left']) + cssValueToPixels(style['padding-right']) + cssValueToPixels(style.width);
  },
  getHeight: function getHeight(elem) {
    var style = getComputedStyle(elem);
    return cssValueToPixels(style['border-top-width']) + cssValueToPixels(style['border-bottom-width']) + cssValueToPixels(style['padding-top']) + cssValueToPixels(style['padding-bottom']) + cssValueToPixels(style.height);
  },
  getOffset: function getOffset(el) {
    var elem = el;
    var offset = { left: 0, top: 0 };
    if (elem.offsetParent) {
      do {
        offset.left += elem.offsetLeft;
        offset.top += elem.offsetTop;
        elem = elem.offsetParent;
      } while (elem);
    }
    return offset;
  },
  isActive: function isActive(elem) {
    return elem === document.activeElement && (elem.type || elem.href);
  }
};

var BooleanController = function (_Controller) {
  inherits(BooleanController, _Controller);
  function BooleanController(object, property) {
    classCallCheck(this, BooleanController);
    var _this2 = possibleConstructorReturn(this, (BooleanController.__proto__ || Object.getPrototypeOf(BooleanController)).call(this, object, property));
    var _this = _this2;
    _this2.__prev = _this2.getValue();
    _this2.__checkbox = document.createElement('input');
    _this2.__checkbox.setAttribute('type', 'checkbox');
    function onChange() {
      _this.setValue(!_this.__prev);
    }
    dom.bind(_this2.__checkbox, 'change', onChange, false);
    _this2.domElement.appendChild(_this2.__checkbox);
    _this2.updateDisplay();
    return _this2;
  }
  createClass(BooleanController, [{
    key: 'setValue',
    value: function setValue(v) {
      var toReturn = get(BooleanController.prototype.__proto__ || Object.getPrototypeOf(BooleanController.prototype), 'setValue', this).call(this, v);
      if (this.__onFinishChange) {
        this.__onFinishChange.call(this, this.getValue());
      }
      this.__prev = this.getValue();
      return toReturn;
    }
  }, {
    key: 'updateDisplay',
    value: function updateDisplay() {
      if (this.getValue() === true) {
        this.__checkbox.setAttribute('checked', 'checked');
        this.__checkbox.checked = true;
        this.__prev = true;
      } else {
        this.__checkbox.checked = false;
        this.__prev = false;
      }
      return get(BooleanController.prototype.__proto__ || Object.getPrototypeOf(BooleanController.prototype), 'updateDisplay', this).call(this);
    }
  }]);
  return BooleanController;
}(Controller);

var OptionController = function (_Controller) {
  inherits(OptionController, _Controller);
  function OptionController(object, property, opts) {
    classCallCheck(this, OptionController);
    var _this2 = possibleConstructorReturn(this, (OptionController.__proto__ || Object.getPrototypeOf(OptionController)).call(this, object, property));
    var options = opts;
    var _this = _this2;
    _this2.__select = document.createElement('select');
    if (Common.isArray(options)) {
      var map = {};
      Common.each(options, function (element) {
        map[element] = element;
      });
      options = map;
    }
    Common.each(options, function (value, key) {
      var opt = document.createElement('option');
      opt.innerHTML = key;
      opt.setAttribute('value', value);
      _this.__select.appendChild(opt);
    });
    _this2.updateDisplay();
    dom.bind(_this2.__select, 'change', function () {
      var desiredValue = this.options[this.selectedIndex].value;
      _this.setValue(desiredValue);
    });
    _this2.domElement.appendChild(_this2.__select);
    return _this2;
  }
  createClass(OptionController, [{
    key: 'setValue',
    value: function setValue(v) {
      var toReturn = get(OptionController.prototype.__proto__ || Object.getPrototypeOf(OptionController.prototype), 'setValue', this).call(this, v);
      if (this.__onFinishChange) {
        this.__onFinishChange.call(this, this.getValue());
      }
      return toReturn;
    }
  }, {
    key: 'updateDisplay',
    value: function updateDisplay() {
      if (dom.isActive(this.__select)) return this;
      this.__select.value = this.getValue();
      return get(OptionController.prototype.__proto__ || Object.getPrototypeOf(OptionController.prototype), 'updateDisplay', this).call(this);
    }
  }]);
  return OptionController;
}(Controller);

var StringController = function (_Controller) {
  inherits(StringController, _Controller);
  function StringController(object, property) {
    classCallCheck(this, StringController);
    var _this2 = possibleConstructorReturn(this, (StringController.__proto__ || Object.getPrototypeOf(StringController)).call(this, object, property));
    var _this = _this2;
    function onChange() {
      _this.setValue(_this.__input.value);
    }
    function onBlur() {
      if (_this.__onFinishChange) {
        _this.__onFinishChange.call(_this, _this.getValue());
      }
    }
    _this2.__input = document.createElement('input');
    _this2.__input.setAttribute('type', 'text');
    dom.bind(_this2.__input, 'keyup', onChange);
    dom.bind(_this2.__input, 'change', onChange);
    dom.bind(_this2.__input, 'blur', onBlur);
    dom.bind(_this2.__input, 'keydown', function (e) {
      if (e.keyCode === 13) {
        this.blur();
      }
    });
    _this2.updateDisplay();
    _this2.domElement.appendChild(_this2.__input);
    return _this2;
  }
  createClass(StringController, [{
    key: 'updateDisplay',
    value: function updateDisplay() {
      if (!dom.isActive(this.__input)) {
        this.__input.value = this.getValue();
      }
      return get(StringController.prototype.__proto__ || Object.getPrototypeOf(StringController.prototype), 'updateDisplay', this).call(this);
    }
  }]);
  return StringController;
}(Controller);

function numDecimals(x) {
  var _x = x.toString();
  if (_x.indexOf('.') > -1) {
    return _x.length - _x.indexOf('.') - 1;
  }
  return 0;
}
var NumberController = function (_Controller) {
  inherits(NumberController, _Controller);
  function NumberController(object, property, params) {
    classCallCheck(this, NumberController);
    var _this = possibleConstructorReturn(this, (NumberController.__proto__ || Object.getPrototypeOf(NumberController)).call(this, object, property));
    var _params = params || {};
    _this.__min = _params.min;
    _this.__max = _params.max;
    _this.__step = _params.step;
    if (Common.isUndefined(_this.__step)) {
      if (_this.initialValue === 0) {
        _this.__impliedStep = 1;
      } else {
        _this.__impliedStep = Math.pow(10, Math.floor(Math.log(Math.abs(_this.initialValue)) / Math.LN10)) / 10;
      }
    } else {
      _this.__impliedStep = _this.__step;
    }
    _this.__precision = numDecimals(_this.__impliedStep);
    return _this;
  }
  createClass(NumberController, [{
    key: 'setValue',
    value: function setValue(v) {
      var _v = v;
      if (this.__min !== undefined && _v < this.__min) {
        _v = this.__min;
      } else if (this.__max !== undefined && _v > this.__max) {
        _v = this.__max;
      }
      if (this.__step !== undefined && _v % this.__step !== 0) {
        _v = Math.round(_v / this.__step) * this.__step;
      }
      return get(NumberController.prototype.__proto__ || Object.getPrototypeOf(NumberController.prototype), 'setValue', this).call(this, _v);
    }
  }, {
    key: 'min',
    value: function min(minValue) {
      this.__min = minValue;
      return this;
    }
  }, {
    key: 'max',
    value: function max(maxValue) {
      this.__max = maxValue;
      return this;
    }
  }, {
    key: 'step',
    value: function step(stepValue) {
      this.__step = stepValue;
      this.__impliedStep = stepValue;
      this.__precision = numDecimals(stepValue);
      return this;
    }
  }]);
  return NumberController;
}(Controller);

function roundToDecimal(value, decimals) {
  var tenTo = Math.pow(10, decimals);
  return Math.round(value * tenTo) / tenTo;
}
var NumberControllerBox = function (_NumberController) {
  inherits(NumberControllerBox, _NumberController);
  function NumberControllerBox(object, property, params) {
    classCallCheck(this, NumberControllerBox);
    var _this2 = possibleConstructorReturn(this, (NumberControllerBox.__proto__ || Object.getPrototypeOf(NumberControllerBox)).call(this, object, property, params));
    _this2.__truncationSuspended = false;
    var _this = _this2;
    var prevY = void 0;
    function onChange() {
      var attempted = parseFloat(_this.__input.value);
      if (!Common.isNaN(attempted)) {
        _this.setValue(attempted);
      }
    }
    function onFinish() {
      if (_this.__onFinishChange) {
        _this.__onFinishChange.call(_this, _this.getValue());
      }
    }
    function onBlur() {
      onFinish();
    }
    function onMouseDrag(e) {
      var diff = prevY - e.clientY;
      _this.setValue(_this.getValue() + diff * _this.__impliedStep);
      prevY = e.clientY;
    }
    function onMouseUp() {
      dom.unbind(window, 'mousemove', onMouseDrag);
      dom.unbind(window, 'mouseup', onMouseUp);
      onFinish();
    }
    function onMouseDown(e) {
      dom.bind(window, 'mousemove', onMouseDrag);
      dom.bind(window, 'mouseup', onMouseUp);
      prevY = e.clientY;
    }
    _this2.__input = document.createElement('input');
    _this2.__input.setAttribute('type', 'text');
    dom.bind(_this2.__input, 'change', onChange);
    dom.bind(_this2.__input, 'blur', onBlur);
    dom.bind(_this2.__input, 'mousedown', onMouseDown);
    dom.bind(_this2.__input, 'keydown', function (e) {
      if (e.keyCode === 13) {
        _this.__truncationSuspended = true;
        this.blur();
        _this.__truncationSuspended = false;
        onFinish();
      }
    });
    _this2.updateDisplay();
    _this2.domElement.appendChild(_this2.__input);
    return _this2;
  }
  createClass(NumberControllerBox, [{
    key: 'updateDisplay',
    value: function updateDisplay() {
      this.__input.value = this.__truncationSuspended ? this.getValue() : roundToDecimal(this.getValue(), this.__precision);
      return get(NumberControllerBox.prototype.__proto__ || Object.getPrototypeOf(NumberControllerBox.prototype), 'updateDisplay', this).call(this);
    }
  }]);
  return NumberControllerBox;
}(NumberController);

function map(v, i1, i2, o1, o2) {
  return o1 + (o2 - o1) * ((v - i1) / (i2 - i1));
}
var NumberControllerSlider = function (_NumberController) {
  inherits(NumberControllerSlider, _NumberController);
  function NumberControllerSlider(object, property, min, max, step) {
    classCallCheck(this, NumberControllerSlider);
    var _this2 = possibleConstructorReturn(this, (NumberControllerSlider.__proto__ || Object.getPrototypeOf(NumberControllerSlider)).call(this, object, property, { min: min, max: max, step: step }));
    var _this = _this2;
    _this2.__background = document.createElement('div');
    _this2.__foreground = document.createElement('div');
    dom.bind(_this2.__background, 'mousedown', onMouseDown);
    dom.bind(_this2.__background, 'touchstart', onTouchStart);
    dom.addClass(_this2.__background, 'slider');
    dom.addClass(_this2.__foreground, 'slider-fg');
    function onMouseDown(e) {
      document.activeElement.blur();
      dom.bind(window, 'mousemove', onMouseDrag);
      dom.bind(window, 'mouseup', onMouseUp);
      onMouseDrag(e);
    }
    function onMouseDrag(e) {
      e.preventDefault();
      var bgRect = _this.__background.getBoundingClientRect();
      _this.setValue(map(e.clientX, bgRect.left, bgRect.right, _this.__min, _this.__max));
      return false;
    }
    function onMouseUp() {
      dom.unbind(window, 'mousemove', onMouseDrag);
      dom.unbind(window, 'mouseup', onMouseUp);
      if (_this.__onFinishChange) {
        _this.__onFinishChange.call(_this, _this.getValue());
      }
    }
    function onTouchStart(e) {
      if (e.touches.length !== 1) {
        return;
      }
      dom.bind(window, 'touchmove', onTouchMove);
      dom.bind(window, 'touchend', onTouchEnd);
      onTouchMove(e);
    }
    function onTouchMove(e) {
      var clientX = e.touches[0].clientX;
      var bgRect = _this.__background.getBoundingClientRect();
      _this.setValue(map(clientX, bgRect.left, bgRect.right, _this.__min, _this.__max));
    }
    function onTouchEnd() {
      dom.unbind(window, 'touchmove', onTouchMove);
      dom.unbind(window, 'touchend', onTouchEnd);
      if (_this.__onFinishChange) {
        _this.__onFinishChange.call(_this, _this.getValue());
      }
    }
    _this2.updateDisplay();
    _this2.__background.appendChild(_this2.__foreground);
    _this2.domElement.appendChild(_this2.__background);
    return _this2;
  }
  createClass(NumberControllerSlider, [{
    key: 'updateDisplay',
    value: function updateDisplay() {
      var pct = (this.getValue() - this.__min) / (this.__max - this.__min);
      this.__foreground.style.width = pct * 100 + '%';
      return get(NumberControllerSlider.prototype.__proto__ || Object.getPrototypeOf(NumberControllerSlider.prototype), 'updateDisplay', this).call(this);
    }
  }]);
  return NumberControllerSlider;
}(NumberController);

var FunctionController = function (_Controller) {
  inherits(FunctionController, _Controller);
  function FunctionController(object, property, text) {
    classCallCheck(this, FunctionController);
    var _this2 = possibleConstructorReturn(this, (FunctionController.__proto__ || Object.getPrototypeOf(FunctionController)).call(this, object, property));
    var _this = _this2;
    _this2.__button = document.createElement('div');
    _this2.__button.innerHTML = text === undefined ? 'Fire' : text;
    dom.bind(_this2.__button, 'click', function (e) {
      e.preventDefault();
      _this.fire();
      return false;
    });
    dom.addClass(_this2.__button, 'button');
    _this2.domElement.appendChild(_this2.__button);
    return _this2;
  }
  createClass(FunctionController, [{
    key: 'fire',
    value: function fire() {
      if (this.__onChange) {
        this.__onChange.call(this);
      }
      this.getValue().call(this.object);
      if (this.__onFinishChange) {
        this.__onFinishChange.call(this, this.getValue());
      }
    }
  }]);
  return FunctionController;
}(Controller);

var ColorController = function (_Controller) {
  inherits(ColorController, _Controller);
  function ColorController(object, property) {
    classCallCheck(this, ColorController);
    var _this2 = possibleConstructorReturn(this, (ColorController.__proto__ || Object.getPrototypeOf(ColorController)).call(this, object, property));
    _this2.__color = new Color(_this2.getValue());
    _this2.__temp = new Color(0);
    var _this = _this2;
    _this2.domElement = document.createElement('div');
    dom.makeSelectable(_this2.domElement, false);
    _this2.__selector = document.createElement('div');
    _this2.__selector.className = 'selector';
    _this2.__saturation_field = document.createElement('div');
    _this2.__saturation_field.className = 'saturation-field';
    _this2.__field_knob = document.createElement('div');
    _this2.__field_knob.className = 'field-knob';
    _this2.__field_knob_border = '2px solid ';
    _this2.__hue_knob = document.createElement('div');
    _this2.__hue_knob.className = 'hue-knob';
    _this2.__hue_field = document.createElement('div');
    _this2.__hue_field.className = 'hue-field';
    _this2.__input = document.createElement('input');
    _this2.__input.type = 'text';
    _this2.__input_textShadow = '0 1px 1px ';
    dom.bind(_this2.__input, 'keydown', function (e) {
      if (e.keyCode === 13) {
        onBlur.call(this);
      }
    });
    dom.bind(_this2.__input, 'blur', onBlur);
    dom.bind(_this2.__selector, 'mousedown', function () {
      dom.addClass(this, 'drag').bind(window, 'mouseup', function () {
        dom.removeClass(_this.__selector, 'drag');
      });
    });
    dom.bind(_this2.__selector, 'touchstart', function () {
      dom.addClass(this, 'drag').bind(window, 'touchend', function () {
        dom.removeClass(_this.__selector, 'drag');
      });
    });
    var valueField = document.createElement('div');
    Common.extend(_this2.__selector.style, {
      width: '122px',
      height: '102px',
      padding: '3px',
      backgroundColor: '#222',
      boxShadow: '0px 1px 3px rgba(0,0,0,0.3)'
    });
    Common.extend(_this2.__field_knob.style, {
      position: 'absolute',
      width: '12px',
      height: '12px',
      border: _this2.__field_knob_border + (_this2.__color.v < 0.5 ? '#fff' : '#000'),
      boxShadow: '0px 1px 3px rgba(0,0,0,0.5)',
      borderRadius: '12px',
      zIndex: 1
    });
    Common.extend(_this2.__hue_knob.style, {
      position: 'absolute',
      width: '15px',
      height: '2px',
      borderRight: '4px solid #fff',
      zIndex: 1
    });
    Common.extend(_this2.__saturation_field.style, {
      width: '100px',
      height: '100px',
      border: '1px solid #555',
      marginRight: '3px',
      display: 'inline-block',
      cursor: 'pointer'
    });
    Common.extend(valueField.style, {
      width: '100%',
      height: '100%',
      background: 'none'
    });
    linearGradient(valueField, 'top', 'rgba(0,0,0,0)', '#000');
    Common.extend(_this2.__hue_field.style, {
      width: '15px',
      height: '100px',
      border: '1px solid #555',
      cursor: 'ns-resize',
      position: 'absolute',
      top: '3px',
      right: '3px'
    });
    hueGradient(_this2.__hue_field);
    Common.extend(_this2.__input.style, {
      outline: 'none',
      textAlign: 'center',
      color: '#fff',
      border: 0,
      fontWeight: 'bold',
      textShadow: _this2.__input_textShadow + 'rgba(0,0,0,0.7)'
    });
    dom.bind(_this2.__saturation_field, 'mousedown', fieldDown);
    dom.bind(_this2.__saturation_field, 'touchstart', fieldDown);
    dom.bind(_this2.__field_knob, 'mousedown', fieldDown);
    dom.bind(_this2.__field_knob, 'touchstart', fieldDown);
    dom.bind(_this2.__hue_field, 'mousedown', fieldDownH);
    dom.bind(_this2.__hue_field, 'touchstart', fieldDownH);
    function fieldDown(e) {
      setSV(e);
      dom.bind(window, 'mousemove', setSV);
      dom.bind(window, 'touchmove', setSV);
      dom.bind(window, 'mouseup', fieldUpSV);
      dom.bind(window, 'touchend', fieldUpSV);
    }
    function fieldDownH(e) {
      setH(e);
      dom.bind(window, 'mousemove', setH);
      dom.bind(window, 'touchmove', setH);
      dom.bind(window, 'mouseup', fieldUpH);
      dom.bind(window, 'touchend', fieldUpH);
    }
    function fieldUpSV() {
      dom.unbind(window, 'mousemove', setSV);
      dom.unbind(window, 'touchmove', setSV);
      dom.unbind(window, 'mouseup', fieldUpSV);
      dom.unbind(window, 'touchend', fieldUpSV);
      onFinish();
    }
    function fieldUpH() {
      dom.unbind(window, 'mousemove', setH);
      dom.unbind(window, 'touchmove', setH);
      dom.unbind(window, 'mouseup', fieldUpH);
      dom.unbind(window, 'touchend', fieldUpH);
      onFinish();
    }
    function onBlur() {
      var i = interpret(this.value);
      if (i !== false) {
        _this.__color.__state = i;
        _this.setValue(_this.__color.toOriginal());
      } else {
        this.value = _this.__color.toString();
      }
    }
    function onFinish() {
      if (_this.__onFinishChange) {
        _this.__onFinishChange.call(_this, _this.__color.toOriginal());
      }
    }
    _this2.__saturation_field.appendChild(valueField);
    _this2.__selector.appendChild(_this2.__field_knob);
    _this2.__selector.appendChild(_this2.__saturation_field);
    _this2.__selector.appendChild(_this2.__hue_field);
    _this2.__hue_field.appendChild(_this2.__hue_knob);
    _this2.domElement.appendChild(_this2.__input);
    _this2.domElement.appendChild(_this2.__selector);
    _this2.updateDisplay();
    function setSV(e) {
      if (e.type.indexOf('touch') === -1) {
        e.preventDefault();
      }
      var fieldRect = _this.__saturation_field.getBoundingClientRect();
      var _ref = e.touches && e.touches[0] || e,
          clientX = _ref.clientX,
          clientY = _ref.clientY;
      var s = (clientX - fieldRect.left) / (fieldRect.right - fieldRect.left);
      var v = 1 - (clientY - fieldRect.top) / (fieldRect.bottom - fieldRect.top);
      if (v > 1) {
        v = 1;
      } else if (v < 0) {
        v = 0;
      }
      if (s > 1) {
        s = 1;
      } else if (s < 0) {
        s = 0;
      }
      _this.__color.v = v;
      _this.__color.s = s;
      _this.setValue(_this.__color.toOriginal());
      return false;
    }
    function setH(e) {
      if (e.type.indexOf('touch') === -1) {
        e.preventDefault();
      }
      var fieldRect = _this.__hue_field.getBoundingClientRect();
      var _ref2 = e.touches && e.touches[0] || e,
          clientY = _ref2.clientY;
      var h = 1 - (clientY - fieldRect.top) / (fieldRect.bottom - fieldRect.top);
      if (h > 1) {
        h = 1;
      } else if (h < 0) {
        h = 0;
      }
      _this.__color.h = h * 360;
      _this.setValue(_this.__color.toOriginal());
      return false;
    }
    return _this2;
  }
  createClass(ColorController, [{
    key: 'updateDisplay',
    value: function updateDisplay() {
      var i = interpret(this.getValue());
      if (i !== false) {
        var mismatch = false;
        Common.each(Color.COMPONENTS, function (component) {
          if (!Common.isUndefined(i[component]) && !Common.isUndefined(this.__color.__state[component]) && i[component] !== this.__color.__state[component]) {
            mismatch = true;
            return {};
          }
        }, this);
        if (mismatch) {
          Common.extend(this.__color.__state, i);
        }
      }
      Common.extend(this.__temp.__state, this.__color.__state);
      this.__temp.a = 1;
      var flip = this.__color.v < 0.5 || this.__color.s > 0.5 ? 255 : 0;
      var _flip = 255 - flip;
      Common.extend(this.__field_knob.style, {
        marginLeft: 100 * this.__color.s - 7 + 'px',
        marginTop: 100 * (1 - this.__color.v) - 7 + 'px',
        backgroundColor: this.__temp.toHexString(),
        border: this.__field_knob_border + 'rgb(' + flip + ',' + flip + ',' + flip + ')'
      });
      this.__hue_knob.style.marginTop = (1 - this.__color.h / 360) * 100 + 'px';
      this.__temp.s = 1;
      this.__temp.v = 1;
      linearGradient(this.__saturation_field, 'left', '#fff', this.__temp.toHexString());
      this.__input.value = this.__color.toString();
      Common.extend(this.__input.style, {
        backgroundColor: this.__color.toHexString(),
        color: 'rgb(' + flip + ',' + flip + ',' + flip + ')',
        textShadow: this.__input_textShadow + 'rgba(' + _flip + ',' + _flip + ',' + _flip + ',.7)'
      });
    }
  }]);
  return ColorController;
}(Controller);
var vendors = ['-moz-', '-o-', '-webkit-', '-ms-', ''];
function linearGradient(elem, x, a, b) {
  elem.style.background = '';
  Common.each(vendors, function (vendor) {
    elem.style.cssText += 'background: ' + vendor + 'linear-gradient(' + x + ', ' + a + ' 0%, ' + b + ' 100%); ';
  });
}
function hueGradient(elem) {
  elem.style.background = '';
  elem.style.cssText += 'background: -moz-linear-gradient(top,  #ff0000 0%, #ff00ff 17%, #0000ff 34%, #00ffff 50%, #00ff00 67%, #ffff00 84%, #ff0000 100%);';
  elem.style.cssText += 'background: -webkit-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);';
  elem.style.cssText += 'background: -o-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);';
  elem.style.cssText += 'background: -ms-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);';
  elem.style.cssText += 'background: linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);';
}

var css = {
  load: function load(url, indoc) {
    var doc = indoc || document;
    var link = doc.createElement('link');
    link.type = 'text/css';
    link.rel = 'stylesheet';
    link.href = url;
    doc.getElementsByTagName('head')[0].appendChild(link);
  },
  inject: function inject(cssContent, indoc) {
    var doc = indoc || document;
    var injected = document.createElement('style');
    injected.type = 'text/css';
    injected.innerHTML = cssContent;
    var head = doc.getElementsByTagName('head')[0];
    try {
      head.appendChild(injected);
    } catch (e) {
    }
  }
};

var saveDialogContents = "<div id=\"dg-save\" class=\"dg dialogue\">\n\n  Here's the new load parameter for your <code>GUI</code>'s constructor:\n\n  <textarea id=\"dg-new-constructor\"></textarea>\n\n  <div id=\"dg-save-locally\">\n\n    <input id=\"dg-local-storage\" type=\"checkbox\"/> Automatically save\n    values to <code>localStorage</code> on exit.\n\n    <div id=\"dg-local-explain\">The values saved to <code>localStorage</code> will\n      override those passed to <code>dat.GUI</code>'s constructor. This makes it\n      easier to work incrementally, but <code>localStorage</code> is fragile,\n      and your friends may not see the same values you do.\n\n    </div>\n\n  </div>\n\n</div>";

var ControllerFactory = function ControllerFactory(object, property) {
  var initialValue = object[property];
  if (Common.isArray(arguments[2]) || Common.isObject(arguments[2])) {
    return new OptionController(object, property, arguments[2]);
  }
  if (Common.isNumber(initialValue)) {
    if (Common.isNumber(arguments[2]) && Common.isNumber(arguments[3])) {
      if (Common.isNumber(arguments[4])) {
        return new NumberControllerSlider(object, property, arguments[2], arguments[3], arguments[4]);
      }
      return new NumberControllerSlider(object, property, arguments[2], arguments[3]);
    }
    if (Common.isNumber(arguments[4])) {
      return new NumberControllerBox(object, property, { min: arguments[2], max: arguments[3], step: arguments[4] });
    }
    return new NumberControllerBox(object, property, { min: arguments[2], max: arguments[3] });
  }
  if (Common.isString(initialValue)) {
    return new StringController(object, property);
  }
  if (Common.isFunction(initialValue)) {
    return new FunctionController(object, property, '');
  }
  if (Common.isBoolean(initialValue)) {
    return new BooleanController(object, property);
  }
  return null;
};

function requestAnimationFrame$1(callback) {
  setTimeout(callback, 1000 / 60);
}
var requestAnimationFrame$1$1 = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || requestAnimationFrame$1;

var CenteredDiv = function () {
  function CenteredDiv() {
    classCallCheck(this, CenteredDiv);
    this.backgroundElement = document.createElement('div');
    Common.extend(this.backgroundElement.style, {
      backgroundColor: 'rgba(0,0,0,0.8)',
      top: 0,
      left: 0,
      display: 'none',
      zIndex: '1000',
      opacity: 0,
      WebkitTransition: 'opacity 0.2s linear',
      transition: 'opacity 0.2s linear'
    });
    dom.makeFullscreen(this.backgroundElement);
    this.backgroundElement.style.position = 'fixed';
    this.domElement = document.createElement('div');
    Common.extend(this.domElement.style, {
      position: 'fixed',
      display: 'none',
      zIndex: '1001',
      opacity: 0,
      WebkitTransition: '-webkit-transform 0.2s ease-out, opacity 0.2s linear',
      transition: 'transform 0.2s ease-out, opacity 0.2s linear'
    });
    document.body.appendChild(this.backgroundElement);
    document.body.appendChild(this.domElement);
    var _this = this;
    dom.bind(this.backgroundElement, 'click', function () {
      _this.hide();
    });
  }
  createClass(CenteredDiv, [{
    key: 'show',
    value: function show() {
      var _this = this;
      this.backgroundElement.style.display = 'block';
      this.domElement.style.display = 'block';
      this.domElement.style.opacity = 0;
      this.domElement.style.webkitTransform = 'scale(1.1)';
      this.layout();
      Common.defer(function () {
        _this.backgroundElement.style.opacity = 1;
        _this.domElement.style.opacity = 1;
        _this.domElement.style.webkitTransform = 'scale(1)';
      });
    }
  }, {
    key: 'hide',
    value: function hide() {
      var _this = this;
      var hide = function hide() {
        _this.domElement.style.display = 'none';
        _this.backgroundElement.style.display = 'none';
        dom.unbind(_this.domElement, 'webkitTransitionEnd', hide);
        dom.unbind(_this.domElement, 'transitionend', hide);
        dom.unbind(_this.domElement, 'oTransitionEnd', hide);
      };
      dom.bind(this.domElement, 'webkitTransitionEnd', hide);
      dom.bind(this.domElement, 'transitionend', hide);
      dom.bind(this.domElement, 'oTransitionEnd', hide);
      this.backgroundElement.style.opacity = 0;
      this.domElement.style.opacity = 0;
      this.domElement.style.webkitTransform = 'scale(1.1)';
    }
  }, {
    key: 'layout',
    value: function layout() {
      this.domElement.style.left = window.innerWidth / 2 - dom.getWidth(this.domElement) / 2 + 'px';
      this.domElement.style.top = window.innerHeight / 2 - dom.getHeight(this.domElement) / 2 + 'px';
    }
  }]);
  return CenteredDiv;
}();

var styleSheet = ___$insertStyle(".dg ul{list-style:none;margin:0;padding:0;width:100%;clear:both}.dg.ac{position:fixed;top:0;left:0;right:0;height:0;z-index:0}.dg:not(.ac) .main{overflow:hidden}.dg.main{-webkit-transition:opacity .1s linear;-o-transition:opacity .1s linear;-moz-transition:opacity .1s linear;transition:opacity .1s linear}.dg.main.taller-than-window{overflow-y:auto}.dg.main.taller-than-window .close-button{opacity:1;margin-top:-1px;border-top:1px solid #2c2c2c}.dg.main ul.closed .close-button{opacity:1 !important}.dg.main:hover .close-button,.dg.main .close-button.drag{opacity:1}.dg.main .close-button{-webkit-transition:opacity .1s linear;-o-transition:opacity .1s linear;-moz-transition:opacity .1s linear;transition:opacity .1s linear;border:0;line-height:19px;height:20px;cursor:pointer;text-align:center;background-color:#000}.dg.main .close-button.close-top{position:relative}.dg.main .close-button.close-bottom{position:absolute}.dg.main .close-button:hover{background-color:#111}.dg.a{float:right;margin-right:15px;overflow-y:visible}.dg.a.has-save>ul.close-top{margin-top:0}.dg.a.has-save>ul.close-bottom{margin-top:27px}.dg.a.has-save>ul.closed{margin-top:0}.dg.a .save-row{top:0;z-index:1002}.dg.a .save-row.close-top{position:relative}.dg.a .save-row.close-bottom{position:fixed}.dg li{-webkit-transition:height .1s ease-out;-o-transition:height .1s ease-out;-moz-transition:height .1s ease-out;transition:height .1s ease-out;-webkit-transition:overflow .1s linear;-o-transition:overflow .1s linear;-moz-transition:overflow .1s linear;transition:overflow .1s linear}.dg li:not(.folder){cursor:auto;height:27px;line-height:27px;padding:0 4px 0 5px}.dg li.folder{padding:0;border-left:4px solid rgba(0,0,0,0)}.dg li.title{cursor:pointer;margin-left:-4px}.dg .closed li:not(.title),.dg .closed ul li,.dg .closed ul li>*{height:0;overflow:hidden;border:0}.dg .cr{clear:both;padding-left:3px;height:27px;overflow:hidden}.dg .property-name{cursor:default;float:left;clear:left;width:40%;overflow:hidden;text-overflow:ellipsis}.dg .cr.function .property-name{width:100%}.dg .c{float:left;width:60%;position:relative}.dg .c input[type=text]{border:0;margin-top:4px;padding:3px;width:100%;float:right}.dg .has-slider input[type=text]{width:30%;margin-left:0}.dg .slider{float:left;width:66%;margin-left:-5px;margin-right:0;height:19px;margin-top:4px}.dg .slider-fg{height:100%}.dg .c input[type=checkbox]{margin-top:7px}.dg .c select{margin-top:5px}.dg .cr.function,.dg .cr.function .property-name,.dg .cr.function *,.dg .cr.boolean,.dg .cr.boolean *{cursor:pointer}.dg .cr.color{overflow:visible}.dg .selector{display:none;position:absolute;margin-left:-9px;margin-top:23px;z-index:10}.dg .c:hover .selector,.dg .selector.drag{display:block}.dg li.save-row{padding:0}.dg li.save-row .button{display:inline-block;padding:0px 6px}.dg.dialogue{background-color:#222;width:460px;padding:15px;font-size:13px;line-height:15px}#dg-new-constructor{padding:10px;color:#222;font-family:Monaco, monospace;font-size:10px;border:0;resize:none;box-shadow:inset 1px 1px 1px #888;word-wrap:break-word;margin:12px 0;display:block;width:440px;overflow-y:scroll;height:100px;position:relative}#dg-local-explain{display:none;font-size:11px;line-height:17px;border-radius:3px;background-color:#333;padding:8px;margin-top:10px}#dg-local-explain code{font-size:10px}#dat-gui-save-locally{display:none}.dg{color:#eee;font:11px 'Lucida Grande', sans-serif;text-shadow:0 -1px 0 #111}.dg.main::-webkit-scrollbar{width:5px;background:#1a1a1a}.dg.main::-webkit-scrollbar-corner{height:0;display:none}.dg.main::-webkit-scrollbar-thumb{border-radius:5px;background:#676767}.dg li:not(.folder){background:#1a1a1a;border-bottom:1px solid #2c2c2c}.dg li.save-row{line-height:25px;background:#dad5cb;border:0}.dg li.save-row select{margin-left:5px;width:108px}.dg li.save-row .button{margin-left:5px;margin-top:1px;border-radius:2px;font-size:9px;line-height:7px;padding:4px 4px 5px 4px;background:#c5bdad;color:#fff;text-shadow:0 1px 0 #b0a58f;box-shadow:0 -1px 0 #b0a58f;cursor:pointer}.dg li.save-row .button.gears{background:#c5bdad url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAANCAYAAAB/9ZQ7AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAQJJREFUeNpiYKAU/P//PwGIC/ApCABiBSAW+I8AClAcgKxQ4T9hoMAEUrxx2QSGN6+egDX+/vWT4e7N82AMYoPAx/evwWoYoSYbACX2s7KxCxzcsezDh3evFoDEBYTEEqycggWAzA9AuUSQQgeYPa9fPv6/YWm/Acx5IPb7ty/fw+QZblw67vDs8R0YHyQhgObx+yAJkBqmG5dPPDh1aPOGR/eugW0G4vlIoTIfyFcA+QekhhHJhPdQxbiAIguMBTQZrPD7108M6roWYDFQiIAAv6Aow/1bFwXgis+f2LUAynwoIaNcz8XNx3Dl7MEJUDGQpx9gtQ8YCueB+D26OECAAQDadt7e46D42QAAAABJRU5ErkJggg==) 2px 1px no-repeat;height:7px;width:8px}.dg li.save-row .button:hover{background-color:#bab19e;box-shadow:0 -1px 0 #b0a58f}.dg li.folder{border-bottom:0}.dg li.title{padding-left:16px;background:#000 url(data:image/gif;base64,R0lGODlhBQAFAJEAAP////Pz8////////yH5BAEAAAIALAAAAAAFAAUAAAIIlI+hKgFxoCgAOw==) 6px 10px no-repeat;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.2)}.dg .closed li.title{background-image:url(data:image/gif;base64,R0lGODlhBQAFAJEAAP////Pz8////////yH5BAEAAAIALAAAAAAFAAUAAAIIlGIWqMCbWAEAOw==)}.dg .cr.boolean{border-left:3px solid #806787}.dg .cr.color{border-left:3px solid}.dg .cr.function{border-left:3px solid #e61d5f}.dg .cr.number{border-left:3px solid #2FA1D6}.dg .cr.number input[type=text]{color:#2FA1D6}.dg .cr.string{border-left:3px solid #1ed36f}.dg .cr.string input[type=text]{color:#1ed36f}.dg .cr.function:hover,.dg .cr.boolean:hover{background:#111}.dg .c input[type=text]{background:#303030;outline:none}.dg .c input[type=text]:hover{background:#3c3c3c}.dg .c input[type=text]:focus{background:#494949;color:#fff}.dg .c .slider{background:#303030;cursor:ew-resize}.dg .c .slider-fg{background:#2FA1D6;max-width:100%}.dg .c .slider:hover{background:#3c3c3c}.dg .c .slider:hover .slider-fg{background:#44abda}\n");

css.inject(styleSheet);
var CSS_NAMESPACE = 'dg';
var HIDE_KEY_CODE = 72;
var CLOSE_BUTTON_HEIGHT = 20;
var DEFAULT_DEFAULT_PRESET_NAME = 'Default';
var SUPPORTS_LOCAL_STORAGE = function () {
  try {
    return !!window.localStorage;
  } catch (e) {
    return false;
  }
}();
var SAVE_DIALOGUE = void 0;
var autoPlaceVirgin = true;
var autoPlaceContainer = void 0;
var hide = false;
var hideableGuis = [];
var GUI = function GUI(pars) {
  var _this = this;
  var params = pars || {};
  this.domElement = document.createElement('div');
  this.__ul = document.createElement('ul');
  this.domElement.appendChild(this.__ul);
  dom.addClass(this.domElement, CSS_NAMESPACE);
  this.__folders = {};
  this.__controllers = [];
  this.__rememberedObjects = [];
  this.__rememberedObjectIndecesToControllers = [];
  this.__listening = [];
  params = Common.defaults(params, {
    closeOnTop: false,
    autoPlace: true,
    width: GUI.DEFAULT_WIDTH
  });
  params = Common.defaults(params, {
    resizable: params.autoPlace,
    hideable: params.autoPlace
  });
  if (!Common.isUndefined(params.load)) {
    if (params.preset) {
      params.load.preset = params.preset;
    }
  } else {
    params.load = { preset: DEFAULT_DEFAULT_PRESET_NAME };
  }
  if (Common.isUndefined(params.parent) && params.hideable) {
    hideableGuis.push(this);
  }
  params.resizable = Common.isUndefined(params.parent) && params.resizable;
  if (params.autoPlace && Common.isUndefined(params.scrollable)) {
    params.scrollable = true;
  }
  var useLocalStorage = SUPPORTS_LOCAL_STORAGE && localStorage.getItem(getLocalStorageHash(this, 'isLocal')) === 'true';
  var saveToLocalStorage = void 0;
  var titleRow = void 0;
  Object.defineProperties(this,
  {
    parent: {
      get: function get$$1() {
        return params.parent;
      }
    },
    scrollable: {
      get: function get$$1() {
        return params.scrollable;
      }
    },
    autoPlace: {
      get: function get$$1() {
        return params.autoPlace;
      }
    },
    closeOnTop: {
      get: function get$$1() {
        return params.closeOnTop;
      }
    },
    preset: {
      get: function get$$1() {
        if (_this.parent) {
          return _this.getRoot().preset;
        }
        return params.load.preset;
      },
      set: function set$$1(v) {
        if (_this.parent) {
          _this.getRoot().preset = v;
        } else {
          params.load.preset = v;
        }
        setPresetSelectIndex(this);
        _this.revert();
      }
    },
    width: {
      get: function get$$1() {
        return params.width;
      },
      set: function set$$1(v) {
        params.width = v;
        setWidth(_this, v);
      }
    },
    name: {
      get: function get$$1() {
        return params.name;
      },
      set: function set$$1(v) {
        params.name = v;
        if (titleRow) {
          titleRow.innerHTML = params.name;
        }
      }
    },
    closed: {
      get: function get$$1() {
        return params.closed;
      },
      set: function set$$1(v) {
        params.closed = v;
        if (params.closed) {
          dom.addClass(_this.__ul, GUI.CLASS_CLOSED);
        } else {
          dom.removeClass(_this.__ul, GUI.CLASS_CLOSED);
        }
        this.onResize();
        if (_this.__closeButton) {
          _this.__closeButton.innerHTML = v ? GUI.TEXT_OPEN : GUI.TEXT_CLOSED;
        }
      }
    },
    load: {
      get: function get$$1() {
        return params.load;
      }
    },
    useLocalStorage: {
      get: function get$$1() {
        return useLocalStorage;
      },
      set: function set$$1(bool) {
        if (SUPPORTS_LOCAL_STORAGE) {
          useLocalStorage = bool;
          if (bool) {
            dom.bind(window, 'unload', saveToLocalStorage);
          } else {
            dom.unbind(window, 'unload', saveToLocalStorage);
          }
          localStorage.setItem(getLocalStorageHash(_this, 'isLocal'), bool);
        }
      }
    }
  });
  if (Common.isUndefined(params.parent)) {
    this.closed = params.closed || false;
    dom.addClass(this.domElement, GUI.CLASS_MAIN);
    dom.makeSelectable(this.domElement, false);
    if (SUPPORTS_LOCAL_STORAGE) {
      if (useLocalStorage) {
        _this.useLocalStorage = true;
        var savedGui = localStorage.getItem(getLocalStorageHash(this, 'gui'));
        if (savedGui) {
          params.load = JSON.parse(savedGui);
        }
      }
    }
    this.__closeButton = document.createElement('div');
    this.__closeButton.innerHTML = GUI.TEXT_CLOSED;
    dom.addClass(this.__closeButton, GUI.CLASS_CLOSE_BUTTON);
    if (params.closeOnTop) {
      dom.addClass(this.__closeButton, GUI.CLASS_CLOSE_TOP);
      this.domElement.insertBefore(this.__closeButton, this.domElement.childNodes[0]);
    } else {
      dom.addClass(this.__closeButton, GUI.CLASS_CLOSE_BOTTOM);
      this.domElement.appendChild(this.__closeButton);
    }
    dom.bind(this.__closeButton, 'click', function () {
      _this.closed = !_this.closed;
    });
  } else {
    if (params.closed === undefined) {
      params.closed = true;
    }
    var titleRowName = document.createTextNode(params.name);
    dom.addClass(titleRowName, 'controller-name');
    titleRow = addRow(_this, titleRowName);
    var onClickTitle = function onClickTitle(e) {
      e.preventDefault();
      _this.closed = !_this.closed;
      return false;
    };
    dom.addClass(this.__ul, GUI.CLASS_CLOSED);
    dom.addClass(titleRow, 'title');
    dom.bind(titleRow, 'click', onClickTitle);
    if (!params.closed) {
      this.closed = false;
    }
  }
  if (params.autoPlace) {
    if (Common.isUndefined(params.parent)) {
      if (autoPlaceVirgin) {
        autoPlaceContainer = document.createElement('div');
        dom.addClass(autoPlaceContainer, CSS_NAMESPACE);
        dom.addClass(autoPlaceContainer, GUI.CLASS_AUTO_PLACE_CONTAINER);
        document.body.appendChild(autoPlaceContainer);
        autoPlaceVirgin = false;
      }
      autoPlaceContainer.appendChild(this.domElement);
      dom.addClass(this.domElement, GUI.CLASS_AUTO_PLACE);
    }
    if (!this.parent) {
      setWidth(_this, params.width);
    }
  }
  this.__resizeHandler = function () {
    _this.onResizeDebounced();
  };
  dom.bind(window, 'resize', this.__resizeHandler);
  dom.bind(this.__ul, 'webkitTransitionEnd', this.__resizeHandler);
  dom.bind(this.__ul, 'transitionend', this.__resizeHandler);
  dom.bind(this.__ul, 'oTransitionEnd', this.__resizeHandler);
  this.onResize();
  if (params.resizable) {
    addResizeHandle(this);
  }
  saveToLocalStorage = function saveToLocalStorage() {
    if (SUPPORTS_LOCAL_STORAGE && localStorage.getItem(getLocalStorageHash(_this, 'isLocal')) === 'true') {
      localStorage.setItem(getLocalStorageHash(_this, 'gui'), JSON.stringify(_this.getSaveObject()));
    }
  };
  this.saveToLocalStorageIfPossible = saveToLocalStorage;
  function resetWidth() {
    var root = _this.getRoot();
    root.width += 1;
    Common.defer(function () {
      root.width -= 1;
    });
  }
  if (!params.parent) {
    resetWidth();
  }
};
GUI.toggleHide = function () {
  hide = !hide;
  Common.each(hideableGuis, function (gui) {
    gui.domElement.style.display = hide ? 'none' : '';
  });
};
GUI.CLASS_AUTO_PLACE = 'a';
GUI.CLASS_AUTO_PLACE_CONTAINER = 'ac';
GUI.CLASS_MAIN = 'main';
GUI.CLASS_CONTROLLER_ROW = 'cr';
GUI.CLASS_TOO_TALL = 'taller-than-window';
GUI.CLASS_CLOSED = 'closed';
GUI.CLASS_CLOSE_BUTTON = 'close-button';
GUI.CLASS_CLOSE_TOP = 'close-top';
GUI.CLASS_CLOSE_BOTTOM = 'close-bottom';
GUI.CLASS_DRAG = 'drag';
GUI.DEFAULT_WIDTH = 245;
GUI.TEXT_CLOSED = 'Close Controls';
GUI.TEXT_OPEN = 'Open Controls';
GUI._keydownHandler = function (e) {
  if (document.activeElement.type !== 'text' && (e.which === HIDE_KEY_CODE || e.keyCode === HIDE_KEY_CODE)) {
    GUI.toggleHide();
  }
};
dom.bind(window, 'keydown', GUI._keydownHandler, false);
Common.extend(GUI.prototype,
{
  add: function add(object, property) {
    return _add(this, object, property, {
      factoryArgs: Array.prototype.slice.call(arguments, 2)
    });
  },
  addColor: function addColor(object, property) {
    return _add(this, object, property, {
      color: true
    });
  },
  remove: function remove(controller) {
    this.__ul.removeChild(controller.__li);
    this.__controllers.splice(this.__controllers.indexOf(controller), 1);
    var _this = this;
    Common.defer(function () {
      _this.onResize();
    });
  },
  destroy: function destroy() {
    if (this.parent) {
      throw new Error('Only the root GUI should be removed with .destroy(). ' + 'For subfolders, use gui.removeFolder(folder) instead.');
    }
    if (this.autoPlace) {
      autoPlaceContainer.removeChild(this.domElement);
    }
    var _this = this;
    Common.each(this.__folders, function (subfolder) {
      _this.removeFolder(subfolder);
    });
    dom.unbind(window, 'keydown', GUI._keydownHandler, false);
    removeListeners(this);
  },
  addFolder: function addFolder(name) {
    if (this.__folders[name] !== undefined) {
      throw new Error('You already have a folder in this GUI by the' + ' name "' + name + '"');
    }
    var newGuiParams = { name: name, parent: this };
    newGuiParams.autoPlace = this.autoPlace;
    if (this.load &&
    this.load.folders &&
    this.load.folders[name]) {
      newGuiParams.closed = this.load.folders[name].closed;
      newGuiParams.load = this.load.folders[name];
    }
    var gui = new GUI(newGuiParams);
    this.__folders[name] = gui;
    var li = addRow(this, gui.domElement);
    dom.addClass(li, 'folder');
    return gui;
  },
  removeFolder: function removeFolder(folder) {
    this.__ul.removeChild(folder.domElement.parentElement);
    delete this.__folders[folder.name];
    if (this.load &&
    this.load.folders &&
    this.load.folders[folder.name]) {
      delete this.load.folders[folder.name];
    }
    removeListeners(folder);
    var _this = this;
    Common.each(folder.__folders, function (subfolder) {
      folder.removeFolder(subfolder);
    });
    Common.defer(function () {
      _this.onResize();
    });
  },
  open: function open() {
    this.closed = false;
  },
  close: function close() {
    this.closed = true;
  },
  hide: function hide() {
    this.domElement.style.display = 'none';
  },
  show: function show() {
    this.domElement.style.display = '';
  },
  onResize: function onResize() {
    var root = this.getRoot();
    if (root.scrollable) {
      var top = dom.getOffset(root.__ul).top;
      var h = 0;
      Common.each(root.__ul.childNodes, function (node) {
        if (!(root.autoPlace && node === root.__save_row)) {
          h += dom.getHeight(node);
        }
      });
      if (window.innerHeight - top - CLOSE_BUTTON_HEIGHT < h) {
        dom.addClass(root.domElement, GUI.CLASS_TOO_TALL);
        root.__ul.style.height = window.innerHeight - top - CLOSE_BUTTON_HEIGHT + 'px';
      } else {
        dom.removeClass(root.domElement, GUI.CLASS_TOO_TALL);
        root.__ul.style.height = 'auto';
      }
    }
    if (root.__resize_handle) {
      Common.defer(function () {
        root.__resize_handle.style.height = root.__ul.offsetHeight + 'px';
      });
    }
    if (root.__closeButton) {
      root.__closeButton.style.width = root.width + 'px';
    }
  },
  onResizeDebounced: Common.debounce(function () {
    this.onResize();
  }, 50),
  remember: function remember() {
    if (Common.isUndefined(SAVE_DIALOGUE)) {
      SAVE_DIALOGUE = new CenteredDiv();
      SAVE_DIALOGUE.domElement.innerHTML = saveDialogContents;
    }
    if (this.parent) {
      throw new Error('You can only call remember on a top level GUI.');
    }
    var _this = this;
    Common.each(Array.prototype.slice.call(arguments), function (object) {
      if (_this.__rememberedObjects.length === 0) {
        addSaveMenu(_this);
      }
      if (_this.__rememberedObjects.indexOf(object) === -1) {
        _this.__rememberedObjects.push(object);
      }
    });
    if (this.autoPlace) {
      setWidth(this, this.width);
    }
  },
  getRoot: function getRoot() {
    var gui = this;
    while (gui.parent) {
      gui = gui.parent;
    }
    return gui;
  },
  getSaveObject: function getSaveObject() {
    var toReturn = this.load;
    toReturn.closed = this.closed;
    if (this.__rememberedObjects.length > 0) {
      toReturn.preset = this.preset;
      if (!toReturn.remembered) {
        toReturn.remembered = {};
      }
      toReturn.remembered[this.preset] = getCurrentPreset(this);
    }
    toReturn.folders = {};
    Common.each(this.__folders, function (element, key) {
      toReturn.folders[key] = element.getSaveObject();
    });
    return toReturn;
  },
  save: function save() {
    if (!this.load.remembered) {
      this.load.remembered = {};
    }
    this.load.remembered[this.preset] = getCurrentPreset(this);
    markPresetModified(this, false);
    this.saveToLocalStorageIfPossible();
  },
  saveAs: function saveAs(presetName) {
    if (!this.load.remembered) {
      this.load.remembered = {};
      this.load.remembered[DEFAULT_DEFAULT_PRESET_NAME] = getCurrentPreset(this, true);
    }
    this.load.remembered[presetName] = getCurrentPreset(this);
    this.preset = presetName;
    addPresetOption(this, presetName, true);
    this.saveToLocalStorageIfPossible();
  },
  revert: function revert(gui) {
    Common.each(this.__controllers, function (controller) {
      if (!this.getRoot().load.remembered) {
        controller.setValue(controller.initialValue);
      } else {
        recallSavedValue(gui || this.getRoot(), controller);
      }
      if (controller.__onFinishChange) {
        controller.__onFinishChange.call(controller, controller.getValue());
      }
    }, this);
    Common.each(this.__folders, function (folder) {
      folder.revert(folder);
    });
    if (!gui) {
      markPresetModified(this.getRoot(), false);
    }
  },
  listen: function listen(controller) {
    var init = this.__listening.length === 0;
    this.__listening.push(controller);
    if (init) {
      updateDisplays(this.__listening);
    }
  },
  updateDisplay: function updateDisplay() {
    Common.each(this.__controllers, function (controller) {
      controller.updateDisplay();
    });
    Common.each(this.__folders, function (folder) {
      folder.updateDisplay();
    });
  }
});
function addRow(gui, newDom, liBefore) {
  var li = document.createElement('li');
  if (newDom) {
    li.appendChild(newDom);
  }
  if (liBefore) {
    gui.__ul.insertBefore(li, liBefore);
  } else {
    gui.__ul.appendChild(li);
  }
  gui.onResize();
  return li;
}
function removeListeners(gui) {
  dom.unbind(window, 'resize', gui.__resizeHandler);
  if (gui.saveToLocalStorageIfPossible) {
    dom.unbind(window, 'unload', gui.saveToLocalStorageIfPossible);
  }
}
function markPresetModified(gui, modified) {
  var opt = gui.__preset_select[gui.__preset_select.selectedIndex];
  if (modified) {
    opt.innerHTML = opt.value + '*';
  } else {
    opt.innerHTML = opt.value;
  }
}
function augmentController(gui, li, controller) {
  controller.__li = li;
  controller.__gui = gui;
  Common.extend(controller, {
    options: function options(_options) {
      if (arguments.length > 1) {
        var nextSibling = controller.__li.nextElementSibling;
        controller.remove();
        return _add(gui, controller.object, controller.property, {
          before: nextSibling,
          factoryArgs: [Common.toArray(arguments)]
        });
      }
      if (Common.isArray(_options) || Common.isObject(_options)) {
        var _nextSibling = controller.__li.nextElementSibling;
        controller.remove();
        return _add(gui, controller.object, controller.property, {
          before: _nextSibling,
          factoryArgs: [_options]
        });
      }
    },
    name: function name(_name) {
      controller.__li.firstElementChild.firstElementChild.innerHTML = _name;
      return controller;
    },
    listen: function listen() {
      controller.__gui.listen(controller);
      return controller;
    },
    remove: function remove() {
      controller.__gui.remove(controller);
      return controller;
    }
  });
  if (controller instanceof NumberControllerSlider) {
    var box = new NumberControllerBox(controller.object, controller.property, { min: controller.__min, max: controller.__max, step: controller.__step });
    Common.each(['updateDisplay', 'onChange', 'onFinishChange', 'step', 'min', 'max'], function (method) {
      var pc = controller[method];
      var pb = box[method];
      controller[method] = box[method] = function () {
        var args = Array.prototype.slice.call(arguments);
        pb.apply(box, args);
        return pc.apply(controller, args);
      };
    });
    dom.addClass(li, 'has-slider');
    controller.domElement.insertBefore(box.domElement, controller.domElement.firstElementChild);
  } else if (controller instanceof NumberControllerBox) {
    var r = function r(returned) {
      if (Common.isNumber(controller.__min) && Common.isNumber(controller.__max)) {
        var oldName = controller.__li.firstElementChild.firstElementChild.innerHTML;
        var wasListening = controller.__gui.__listening.indexOf(controller) > -1;
        controller.remove();
        var newController = _add(gui, controller.object, controller.property, {
          before: controller.__li.nextElementSibling,
          factoryArgs: [controller.__min, controller.__max, controller.__step]
        });
        newController.name(oldName);
        if (wasListening) newController.listen();
        return newController;
      }
      return returned;
    };
    controller.min = Common.compose(r, controller.min);
    controller.max = Common.compose(r, controller.max);
  } else if (controller instanceof BooleanController) {
    dom.bind(li, 'click', function () {
      dom.fakeEvent(controller.__checkbox, 'click');
    });
    dom.bind(controller.__checkbox, 'click', function (e) {
      e.stopPropagation();
    });
  } else if (controller instanceof FunctionController) {
    dom.bind(li, 'click', function () {
      dom.fakeEvent(controller.__button, 'click');
    });
    dom.bind(li, 'mouseover', function () {
      dom.addClass(controller.__button, 'hover');
    });
    dom.bind(li, 'mouseout', function () {
      dom.removeClass(controller.__button, 'hover');
    });
  } else if (controller instanceof ColorController) {
    dom.addClass(li, 'color');
    controller.updateDisplay = Common.compose(function (val) {
      li.style.borderLeftColor = controller.__color.toString();
      return val;
    }, controller.updateDisplay);
    controller.updateDisplay();
  }
  controller.setValue = Common.compose(function (val) {
    if (gui.getRoot().__preset_select && controller.isModified()) {
      markPresetModified(gui.getRoot(), true);
    }
    return val;
  }, controller.setValue);
}
function recallSavedValue(gui, controller) {
  var root = gui.getRoot();
  var matchedIndex = root.__rememberedObjects.indexOf(controller.object);
  if (matchedIndex !== -1) {
    var controllerMap = root.__rememberedObjectIndecesToControllers[matchedIndex];
    if (controllerMap === undefined) {
      controllerMap = {};
      root.__rememberedObjectIndecesToControllers[matchedIndex] = controllerMap;
    }
    controllerMap[controller.property] = controller;
    if (root.load && root.load.remembered) {
      var presetMap = root.load.remembered;
      var preset = void 0;
      if (presetMap[gui.preset]) {
        preset = presetMap[gui.preset];
      } else if (presetMap[DEFAULT_DEFAULT_PRESET_NAME]) {
        preset = presetMap[DEFAULT_DEFAULT_PRESET_NAME];
      } else {
        return;
      }
      if (preset[matchedIndex] && preset[matchedIndex][controller.property] !== undefined) {
        var value = preset[matchedIndex][controller.property];
        controller.initialValue = value;
        controller.setValue(value);
      }
    }
  }
}
function _add(gui, object, property, params) {
  if (object[property] === undefined) {
    throw new Error('Object "' + object + '" has no property "' + property + '"');
  }
  var controller = void 0;
  if (params.color) {
    controller = new ColorController(object, property);
  } else {
    var factoryArgs = [object, property].concat(params.factoryArgs);
    controller = ControllerFactory.apply(gui, factoryArgs);
  }
  if (params.before instanceof Controller) {
    params.before = params.before.__li;
  }
  recallSavedValue(gui, controller);
  dom.addClass(controller.domElement, 'c');
  var name = document.createElement('span');
  dom.addClass(name, 'property-name');
  name.innerHTML = controller.property;
  var container = document.createElement('div');
  container.appendChild(name);
  container.appendChild(controller.domElement);
  var li = addRow(gui, container, params.before);
  dom.addClass(li, GUI.CLASS_CONTROLLER_ROW);
  if (controller instanceof ColorController) {
    dom.addClass(li, 'color');
  } else {
    dom.addClass(li, _typeof(controller.getValue()));
  }
  augmentController(gui, li, controller);
  gui.__controllers.push(controller);
  return controller;
}
function getLocalStorageHash(gui, key) {
  return document.location.href + '.' + key;
}
function addPresetOption(gui, name, setSelected) {
  var opt = document.createElement('option');
  opt.innerHTML = name;
  opt.value = name;
  gui.__preset_select.appendChild(opt);
  if (setSelected) {
    gui.__preset_select.selectedIndex = gui.__preset_select.length - 1;
  }
}
function showHideExplain(gui, explain) {
  explain.style.display = gui.useLocalStorage ? 'block' : 'none';
}
function addSaveMenu(gui) {
  var div = gui.__save_row = document.createElement('li');
  dom.addClass(gui.domElement, 'has-save');
  gui.__ul.insertBefore(div, gui.__ul.firstChild);
  dom.addClass(div, 'save-row');
  var gears = document.createElement('span');
  gears.innerHTML = '&nbsp;';
  dom.addClass(gears, 'button gears');
  var button = document.createElement('span');
  button.innerHTML = 'Save';
  dom.addClass(button, 'button');
  dom.addClass(button, 'save');
  var button2 = document.createElement('span');
  button2.innerHTML = 'New';
  dom.addClass(button2, 'button');
  dom.addClass(button2, 'save-as');
  var button3 = document.createElement('span');
  button3.innerHTML = 'Revert';
  dom.addClass(button3, 'button');
  dom.addClass(button3, 'revert');
  var select = gui.__preset_select = document.createElement('select');
  if (gui.load && gui.load.remembered) {
    Common.each(gui.load.remembered, function (value, key) {
      addPresetOption(gui, key, key === gui.preset);
    });
  } else {
    addPresetOption(gui, DEFAULT_DEFAULT_PRESET_NAME, false);
  }
  dom.bind(select, 'change', function () {
    for (var index = 0; index < gui.__preset_select.length; index++) {
      gui.__preset_select[index].innerHTML = gui.__preset_select[index].value;
    }
    gui.preset = this.value;
  });
  div.appendChild(select);
  div.appendChild(gears);
  div.appendChild(button);
  div.appendChild(button2);
  div.appendChild(button3);
  if (SUPPORTS_LOCAL_STORAGE) {
    var explain = document.getElementById('dg-local-explain');
    var localStorageCheckBox = document.getElementById('dg-local-storage');
    var saveLocally = document.getElementById('dg-save-locally');
    saveLocally.style.display = 'block';
    if (localStorage.getItem(getLocalStorageHash(gui, 'isLocal')) === 'true') {
      localStorageCheckBox.setAttribute('checked', 'checked');
    }
    showHideExplain(gui, explain);
    dom.bind(localStorageCheckBox, 'change', function () {
      gui.useLocalStorage = !gui.useLocalStorage;
      showHideExplain(gui, explain);
    });
  }
  var newConstructorTextArea = document.getElementById('dg-new-constructor');
  dom.bind(newConstructorTextArea, 'keydown', function (e) {
    if (e.metaKey && (e.which === 67 || e.keyCode === 67)) {
      SAVE_DIALOGUE.hide();
    }
  });
  dom.bind(gears, 'click', function () {
    newConstructorTextArea.innerHTML = JSON.stringify(gui.getSaveObject(), undefined, 2);
    SAVE_DIALOGUE.show();
    newConstructorTextArea.focus();
    newConstructorTextArea.select();
  });
  dom.bind(button, 'click', function () {
    gui.save();
  });
  dom.bind(button2, 'click', function () {
    var presetName = prompt('Enter a new preset name.');
    if (presetName) {
      gui.saveAs(presetName);
    }
  });
  dom.bind(button3, 'click', function () {
    gui.revert();
  });
}
function addResizeHandle(gui) {
  var pmouseX = void 0;
  gui.__resize_handle = document.createElement('div');
  Common.extend(gui.__resize_handle.style, {
    width: '6px',
    marginLeft: '-3px',
    height: '200px',
    cursor: 'ew-resize',
    position: 'absolute'
  });
  function drag(e) {
    e.preventDefault();
    gui.width += pmouseX - e.clientX;
    gui.onResize();
    pmouseX = e.clientX;
    return false;
  }
  function dragStop() {
    dom.removeClass(gui.__closeButton, GUI.CLASS_DRAG);
    dom.unbind(window, 'mousemove', drag);
    dom.unbind(window, 'mouseup', dragStop);
  }
  function dragStart(e) {
    e.preventDefault();
    pmouseX = e.clientX;
    dom.addClass(gui.__closeButton, GUI.CLASS_DRAG);
    dom.bind(window, 'mousemove', drag);
    dom.bind(window, 'mouseup', dragStop);
    return false;
  }
  dom.bind(gui.__resize_handle, 'mousedown', dragStart);
  dom.bind(gui.__closeButton, 'mousedown', dragStart);
  gui.domElement.insertBefore(gui.__resize_handle, gui.domElement.firstElementChild);
}
function setWidth(gui, w) {
  gui.domElement.style.width = w + 'px';
  if (gui.__save_row && gui.autoPlace) {
    gui.__save_row.style.width = w + 'px';
  }
  if (gui.__closeButton) {
    gui.__closeButton.style.width = w + 'px';
  }
}
function getCurrentPreset(gui, useInitialValues) {
  var toReturn = {};
  Common.each(gui.__rememberedObjects, function (val, index) {
    var savedValues = {};
    var controllerMap = gui.__rememberedObjectIndecesToControllers[index];
    Common.each(controllerMap, function (controller, property) {
      savedValues[property] = useInitialValues ? controller.initialValue : controller.getValue();
    });
    toReturn[index] = savedValues;
  });
  return toReturn;
}
function setPresetSelectIndex(gui) {
  for (var index = 0; index < gui.__preset_select.length; index++) {
    if (gui.__preset_select[index].value === gui.preset) {
      gui.__preset_select.selectedIndex = index;
    }
  }
}
function updateDisplays(controllerArray) {
  if (controllerArray.length !== 0) {
    requestAnimationFrame$1$1.call(window, function () {
      updateDisplays(controllerArray);
    });
  }
  Common.each(controllerArray, function (c) {
    c.updateDisplay();
  });
}
var GUI$1 = GUI;

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
    renderer = new Renderer();
    renderer.ready = () => {
        initUI();
    };
    renderer.init("canvasGL", true);
    const fullScreenUtils = new FullScreenUtils();
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
    const gui = new GUI$1();
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
        "Orbit": CameraMode.Orbiting,
        "Cinematic": CameraMode.Random,
        "Free": CameraMode.FPS
    })
        .name("Camera")
        .onChange(value => renderer.setCameraMode(+value));
    gui.add(dummyConfig, "github").name("Source at Github");
}
//# sourceMappingURL=index.js.map
