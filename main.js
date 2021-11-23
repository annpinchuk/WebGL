'use strict';

let gl;                         // The webgl context.

let iAttribVertex;              // Location of the attribute variable in the shader program.
let iAttribTexture;             // Location of the attribute variable in the shader program.

let iColor;                     // Location of the uniform specifying a color for the primitive.
let iColorCoef;                 // Location of the uniform specifying a color for the primitive.
let iModelViewProjectionMatrix; // Location of the uniform matrix representing the combined transformation.
let iTextureMappingUnit;

let iVertexBuffer;              // Buffer to hold the values.
let iTexBuffer;                 // Buffer to hold the values.

let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.

let flag = false
let separation = 30;

let rMatrix = getRotationMatrix();

/* Draws a WebGL primitive.  The first parameter must be one of the constants
 * that specify primitives:  gl.POINTS, gl.LINES, gl.LINE_LOOP, gl.LINE_STRIP,
 * gl.TRIANGLES, gl.TRIANGLE_STRIP, gl.TRIANGLE_FAN.  The second parameter must
 * be an array of 4 numbers in the range 0.0 to 1.0, giving the RGBA color of
 * the color of the primitive.  The third parameter must be an array of numbers.
 * The length of the array must be a multiple of 3.  Each triple of numbers provides
 * xyz-coords for one vertex for the primitive.  This assumes that u_color is the
 * location of a color uniform in the shader program, a_coords_loc is the location of
 * the coords attribute, and a_coords_buffer is a VBO for the coords attribute.
 */
function drawPrimitive(primitiveType, color, vertices, texCoords) {
    gl.uniform4fv(iColor, color);
    gl.uniform1f(iColorCoef, 0.0);

    gl.enableVertexAttribArray(iAttribVertex);
    gl.bindBuffer(gl.ARRAY_BUFFER, iVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
    gl.vertexAttribPointer(iAttribVertex, 3, gl.FLOAT, false, 0, 0);

    if (texCoords) {
        gl.enableVertexAttribArray(iAttribTexture);
        gl.bindBuffer(gl.ARRAY_BUFFER, iTexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STREAM_DRAW);
        gl.vertexAttribPointer(iAttribTexture, 2, gl.FLOAT, false, 0, 0);
    } else {
        gl.disableVertexAttribArray(iAttribTexture);
        gl.vertexAttrib2f(iAttribTexture, 0.0, 0.0);
        gl.uniform1f(iColorCoef, 1.0);
    }

    gl.drawArrays(primitiveType, 0, vertices.length / 3);
}


function getTransposeArray(coordsArray) {
    return coordsArray[0].map((_, colIndex) => coordsArray.map(row => row[colIndex]));
}

function drawLines(coordsArray) {
    coordsArray.forEach((coords) => drawPrimitive(gl.LINE_STRIP, [1, 0, 1, 1], coords.flat()))
}

function leftRightFrustum(mConvergence, mAspectRatio, mFOV, mNearClippingDistance, mFarClippingDistance) {
    const top = mNearClippingDistance * Math.tan(mFOV * Math.PI / 180.0 / 2);
    const bottom = -top;

    const a = mAspectRatio * Math.tan(mFOV * Math.PI / 180.0 / 2) * mConvergence;
    const b = a - separation / 2;
    const c = a + separation / 2;

    function leftFrustum() {
        const left = -b * mNearClippingDistance / mConvergence;
        const right = c * mNearClippingDistance / mConvergence;

        return m4.frustum(left, right, bottom, top, mNearClippingDistance, mFarClippingDistance)
    }

    function rightFrustum() {
        const left = -c * mNearClippingDistance / mConvergence;
        const right = b * mNearClippingDistance / mConvergence;

        return m4.frustum(left, right, bottom, top, mNearClippingDistance, mFarClippingDistance)
    }

    return {rightFrustum: rightFrustum(), leftFrustum: leftFrustum()}

}

function drawSurface() {
    const a = 0.5
    const b = 1

    function getX(u, v) {
        return a * (b - Math.cos(u)) * Math.sin(u) * Math.cos(v)
    }

    function getY(u, v) {
        return a * (b - Math.cos(u)) * Math.sin(u) * Math.sin(v)
    }

    function getZ(u) {
        return Math.cos(u)
    }

    let coordsArray = []

    for (let u = 0; u <= Math.PI; u += Math.PI / 15) {
        let coords = []
        for (let v = 0; v <= 2 * Math.PI; v += Math.PI / 13) {
            const X = getX(u, v)
            const Y = getY(u, v)
            const Z = getZ(u)

            coords.push([X, Y, Z])
        }
        coordsArray.push(coords)
    }

    drawLines(coordsArray)

    const transposeArray = getTransposeArray(coordsArray)
    drawLines(transposeArray)

    if (flag) {
        for (let i = 0; i < coordsArray.length - 1; i++) {
            let pointsArray = []
            for (let j = 0; j < coordsArray[i].length; j++) {
                pointsArray.push(coordsArray[i][j])
                pointsArray.push(coordsArray[i + 1][j])
            }
            drawPrimitive(gl.TRIANGLE_STRIP, [1, 0, 1, 1], pointsArray.flat())
        }
    }


}

const degtorad = Math.PI / 180; // Degree-to-Radian conversion

function getRotationMatrix( alpha, beta, gamma ) {

    const _x = beta  ? beta  * degtorad : 0; // beta value
    const _y = gamma ? gamma * degtorad : 0; // gamma value
    const _z = alpha ? alpha * degtorad : 0; // alpha value

    const cX = Math.cos( _x );
    const cY = Math.cos( _y );
    const cZ = Math.cos( _z );
    const sX = Math.sin( _x );
    const sY = Math.sin( _y );
    const sZ = Math.sin( _z );

    //
    // ZXY rotation matrix construction.
    //

    const m11 = cZ * cY - sZ * sX * sY;
    const m12 = - cX * sZ;
    const m13 = cY * sZ * sX + cZ * sY;

    const m21 = cY * sZ + cZ * sX * sY;
    const m22 = cZ * cX;
    const m23 = sZ * sY - cZ * cY * sX;

    const m31 = - cX * sY;
    const m32 = sX;
    const m33 = cX * cY;

    return [
        m11, m12, m13, 0,
        m21, m22, m23, 0,
        m31, m32, m33, 0,
        0, 0, 0, 1
    ];

}

window.addEventListener('deviceorientation', function(event) {
    rMatrix = getRotationMatrix(event.alpha, event.beta, event.gamma);
    draw();
});


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);
    let matAccum2 = m4.multiply(matAccum1, rMatrix);

    const cam = leftRightFrustum(
        2000.0,
        1,
        20.0,
        1.0,
        200000.0
    );

    const modelViewProjectionL = m4.multiply(cam.leftFrustum, matAccum2);
    const modelViewProjectionR = m4.multiply(cam.rightFrustum, matAccum2);

    gl.uniformMatrix4fv(iModelViewProjectionMatrix, false, modelViewProjectionL);
    gl.uniform1i(iTextureMappingUnit, 0);
    gl.colorMask(true, false, false, false);
    drawSurface();

    gl.clear(gl.DEPTH_BUFFER_BIT);

    gl.uniformMatrix4fv(iModelViewProjectionMatrix, false, modelViewProjectionR);
    gl.uniform1i(iTextureMappingUnit, 0);
    gl.colorMask(false, true, true, false);
    drawSurface();

    gl.colorMask(true, true, true, true);

    /* Draw coordinate axes as thick colored lines that extend through the cube. */
    // gl.lineWidth(4);
    // drawPrimitive(gl.LINES, [1, 0, 0, 1], [-2, 0, 0, 2, 0, 0]);
    // drawPrimitive(gl.LINES, [0, 1, 0, 1], [0, -2, 0, 0, 2, 0]);
    // drawPrimitive(gl.LINES, [0, 0, 1, 1], [0, 0, -2, 0, 0, 2]);
    // gl.lineWidth(1);

}

function changeSeparationHandler() {
    let sepRange = document.getElementById('range');
    separation = sepRange.value;
    draw();
}

/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    gl.useProgram(prog);

    iAttribVertex = gl.getAttribLocation(prog, "vertex");
    iAttribTexture = gl.getAttribLocation(prog, "texCoord");

    iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    iColor = gl.getUniformLocation(prog, "color");
    iColorCoef = gl.getUniformLocation(prog, "fColorCoef");
    iTextureMappingUnit = gl.getUniformLocation(prog, "u_texture");

    iVertexBuffer = gl.createBuffer();
    iTexBuffer = gl.createBuffer();

    gl.enable(gl.DEPTH_TEST);
}

/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    draw();
}


document.addEventListener('keyup', event => {
    if (event.code === 'Space') {
        flag = !flag
        draw();
    }
})