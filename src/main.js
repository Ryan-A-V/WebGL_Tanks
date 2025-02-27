var state = {};
var game;
var sceneFile = "scene.json"; // can change this to be the name of your scene

// This function loads on window load, uses async functions to load the scene then try to render it
window.onload = async () => {
    try {
        console.log("Starting to load scene file");
        await parseSceneFile(`./statefiles/${sceneFile}`, state);
        main();
    } catch (err) {
        console.error(err);
        alert(err);
    }
}

/**
 * 
 * @param {object - contains vertex, normal, uv information for the mesh to be made} mesh 
 * @param {object - the game object that will use the mesh information} object 
 * @purpose - Helper function called as a callback function when the mesh is done loading for the object
 */
async function createMesh(mesh, object, vertShader, fragShader) {
    let testModel = new Model(state.gl, object, mesh);
    testModel.vertShader = vertShader ? vertShader : state.vertShaderSample;
    testModel.fragShader = fragShader ? fragShader : state.fragShaderSample;
    await testModel.setup();
    addObjectToScene(state, testModel);
    return testModel;
}

/**
 * Main function that gets called when the DOM loads
 */
async function main() {
    //document.body.appendChild( stats.dom );
    const canvas = document.querySelector("#glCanvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Initialize the WebGL2 context
    var gl = canvas.getContext("webgl2");

    // Only continue if WebGL2 is available and working
    if (gl === null) {
        printError('WebGL 2 not supported by your browser',
            'Check to see you are using a <a href="https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API#WebGL_2_2" class="alert-link">modern browser</a>.');
        return;
    }

    /**
     * Sample vertex and fragment shader here that simply applies MVP matrix 
     * and diffuse colour of each object
     */
    const vertShaderSample =
        `#version 300 es
        in vec3 aPosition;
        in vec3 aNormal;
        in vec2 aUV;

        uniform mat4 uProjectionMatrix;
        uniform mat4 uViewMatrix;
        uniform mat4 uModelMatrix;
        uniform vec3 uCameraPosition;
        uniform mat4 normalMatrix;

        out vec2 oUV;
        out vec3 oFragPosition;
        out vec3 oNormal;
        out vec3 oCameraPosition;

        void main() {
            // Postion of the fragment in world space
            gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);

            oUV = aUV;
            // Simply use this normal so no error is thrown
            oFragPosition = (uModelMatrix * vec4(aPosition, 1.0)).xyz;
            oNormal = normalize((normalMatrix * vec4(aNormal, 0.0)).xyz);
            oCameraPosition = uCameraPosition;
        }
        `;

    const fragShaderSample =
        `#version 300 es
        #define MAX_LIGHTS 20
        precision highp float;

        struct PointLight {
            vec3 position;
            vec3 colour;
            float strength;
            float linear;
            float quadratic;
        };

        in vec2 oUV;
        in vec3 oNormal;
        in vec3 oFragPosition;
        in vec3 oCameraPosition;

        uniform PointLight mainLight;
        uniform vec3 diffuseVal;
        uniform vec3 ambientVal;
        uniform vec3 specularVal;
        uniform float nVal;
        uniform float alphaVal;
        uniform int samplerExists;
        uniform sampler2D uTexture;

        uniform PointLight[2] pointLights;

        uniform PointLight exitLight;
        uniform PointLight tankLight;

        out vec4 fragColor;
        void main() {
            PointLight exit = pointLights[0];
            PointLight tank = pointLights[1];

            vec3 normal = oNormal;
            vec3 light1Direction = normalize(tank.position - oFragPosition);
            vec3 light2Direction = normalize(exit.position - oFragPosition);
            
            //ambient
            vec3 ambient = (tank.colour * tank.strength);
            //ambient = mix(ambient, (exit.colour * exit.strength), 0.9);

            //diffuse
            float diffT = max(dot(light1Direction,normal),0.0);
            vec3 diffuseT = (tank.colour * diffT);
            float diffE = max(dot(light2Direction,normal),0.0);
            vec3 diffuseE = (exit.colour * diffE);
            
            //specular
            vec3 v = oCameraPosition - oFragPosition;
            vec3 nv = normalize(v);
            vec3 HT = normalize(nv + light1Direction);
            vec3 HE = normalize(nv + light2Direction);
            float diff2T = max(dot(HT,normal),0.0);
            float diff2E = max(dot(HE,normal),0.0);
            float n = nVal;
            float diff2nT = pow(diff2T, n);
            float diff2nE = pow(diff2E, n);
            vec3 specularT = diff2nT * tank.colour;
            vec3 specularE = diff2nE * exit.colour;
            
            //light attenuation
            float distT = length(tank.position - oFragPosition);
            float attenT = tank.strength / (1.0 + tank.linear * distT + tank.quadratic * (distT * distT));
            diffuseT *= attenT;
            specularT *= attenT;

            float distE = length(exit.position - oFragPosition);
            float attenE = exit.strength / (1.0 + exit.linear * distE + exit.quadratic * (distE * distE));
            diffuseE *= attenE;
            specularE *= attenE;

            vec3 diffuse = diffuseT + diffuseE;
            vec3 specular = specularT + specularE;

            if (samplerExists == 1){
                vec3 textureColour = texture(uTexture, oUV).rgb;
                
                //vec3 diffColor = mix(textureColour, diffuseVal, 0.7);
                //vec3 ambColor = mix(textureColour, ambientVal, 0.7);
                //vec3 specColor = mix(textureColour, specularVal, 0.7);
                
                fragColor = vec4((ambient * textureColour) + (diffuse * textureColour) + (specular * textureColour), alphaVal);
            } else {
                //fragColor = vec4(diffuseVal, 1.0);
                fragColor = vec4((ambient * ambientVal) + (diffuse * diffuseVal) + (specular * specularVal), alphaVal);
            }

        }
        `;

    /**
     * Initialize state with new values (some of these you can replace/change)
     */
    state = {
        ...state, // this just takes what was already in state and applies it here again
        gl,
        vertShaderSample,
        fragShaderSample,
        canvas: canvas,
        objectCount: 0,
        lightIndices: [],
        keyboard: {},
        mouse: { sensitivity: 0.2 },
        meshCache: {},
        samplerExists: 0,
        samplerNormExists: 0,
    };

    state.numLights = state.pointLights.length;

    const now = new Date();
    for (let i = 0; i < state.loadObjects.length; i++) {
        const object = state.loadObjects[i];

        if (object.type === "mesh") {
            await addMesh(object);
        } else if (object.type === "cube") {
            addCube(object, state);
        } else if (object.type === "plane") {
            addPlane(object, state);
        } else if (object.type.includes("Custom")) {
            addCustom(object, state);
        }
    }

    const then = new Date();
    const loadingTime = (then.getTime() - now.getTime()) / 1000;
    console.log(`Scene file loaded in ${loadingTime} seconds.`);

    game = new Game(state);
    await game.onStart();
    loadingPage.remove();
    startRendering(gl, state); // now that scene is setup, start rendering it
}

/**
 * 
 * @param {object - object containing scene values} state 
 * @param {object - the object to be added to the scene} object 
 * @purpose - Helper function for adding a new object to the scene and refreshing the GUI
 */
function addObjectToScene(state, object) {
    object.name = object.name;
    state.objects.push(object);
}

/**
 * 
 * @param {gl context} gl 
 * @param {object - object containing scene values} state 
 * @purpose - Calls the drawscene per frame
 */
function startRendering(gl, state) {
    // A variable for keeping track of time between frames
    var then = 0.0;

    // This function is called when we want to render a frame to the canvas
    function render(now) {
        now *= 0.001; // convert to seconds
        const deltaTime = now - then;
        then = now;

        state.deltaTime = deltaTime;
        drawScene(gl, deltaTime, state);
        game.onUpdate(deltaTime); //constantly call our game loop

        // Request another frame when this one is done
        requestAnimationFrame(render);
    }
    // Draw the scene
    requestAnimationFrame(render);
}

/**
 * 
 * @param {gl context} gl 
 * @param {float - time from now-last} deltaTime 
 * @param {object - contains the state for the scene} state 
 * @purpose Iterate through game objects and render the objects aswell as update uniforms
 */
function drawScene(gl, deltaTime, state) {
    gl.clearColor(state.settings.backgroundColor[0], state.settings.backgroundColor[1], state.settings.backgroundColor[2], 1.0); // Here we are drawing the background color that is saved in our state
    gl.enable(gl.DEPTH_TEST); // Enable depth testing
    gl.depthFunc(gl.LEQUAL); // Near things obscure far things
    gl.disable(gl.CULL_FACE); // Cull the backface of our objects to be more efficient
    gl.cullFace(gl.BACK);
    // gl.frontFace(gl.CCW);
    gl.clearDepth(1.0); // Clear everything
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // sort objects by nearness to camera
    let sorted = state.objects.sort((a, b) => {

        // Render opaque objects first
        if (a.material.alpha === 1.0 && b.material.alpha !== 1.0){
            return -1;
        }
        else if(a.material.alpha !== 1.0 && b.material.alpha === 1.0){
            return 1;
        }

        let aCentroidFour = vec4.fromValues(a.centroid[0], a.centroid[1], a.centroid[2], 1.0);
        vec4.transformMat4(aCentroidFour, aCentroidFour, a.modelMatrix);

        let bCentroidFour = vec4.fromValues(b.centroid[0], b.centroid[1], b.centroid[2], 1.0);
        vec4.transformMat4(bCentroidFour, bCentroidFour, b.modelMatrix);

        return vec3.distance(state.camera.position, vec3.fromValues(aCentroidFour[0], aCentroidFour[1], aCentroidFour[2]))
            >= vec3.distance(state.camera.position, vec3.fromValues(bCentroidFour[0], bCentroidFour[1], bCentroidFour[2])) ? -1 : 1;
    });

    // iterate over each object and render them
    sorted.map((object) => {
        gl.useProgram(object.programInfo.program);
        {
            // Adjust rendering for transparency
            if (object.material.alpha < 1.0) {
                gl.depthMask(false);
                gl.enable(gl.BLEND);
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            }
            else {
                gl.disable(gl.BLEND);
                gl.depthMask(true);
                gl.enable(gl.DEPTH_TEST);
                gl.depthFunc(gl.LEQUAL);
            }

            // Projection Matrix ....
            let projectionMatrix = mat4.create();
            let fovy = 90.0 * Math.PI / 180.0; // Vertical field of view in radians
            let aspect = state.canvas.clientWidth / state.canvas.clientHeight; // Aspect ratio of the canvas
            let near = 0.1; // Near clipping plane
            let far = 1000000.0; // Far clipping plane

            mat4.perspective(projectionMatrix, fovy, aspect, near, far);
            gl.uniformMatrix4fv(object.programInfo.uniformLocations.projection, false, projectionMatrix);
            state.projectionMatrix = projectionMatrix;

            // View Matrix & Camera ....
            let viewMatrix = mat4.create();
            let camFront = vec3.fromValues(0, 0, 0);
            vec3.add(camFront, state.camera.position, state.camera.front);
            mat4.lookAt(
                viewMatrix,
                state.camera.position,
                camFront,
                state.camera.up,
            );
            gl.uniformMatrix4fv(object.programInfo.uniformLocations.view, false, viewMatrix);
            gl.uniform3fv(object.programInfo.uniformLocations.cameraPosition, state.camera.position);
            state.viewMatrix = viewMatrix;

            // Model Matrix ....
            let modelMatrix = mat4.create();
            let negCentroid = vec3.fromValues(0.0, 0.0, 0.0);
            vec3.negate(negCentroid, object.centroid);
            mat4.translate(modelMatrix, modelMatrix, object.model.position);
            mat4.translate(modelMatrix, modelMatrix, object.centroid);
            mat4.mul(modelMatrix, modelMatrix, object.model.rotation);
            mat4.scale(modelMatrix, modelMatrix, object.model.scale);
            mat4.translate(modelMatrix, modelMatrix, negCentroid);

            if (object.parent) {
                let parent = getObject(state, object.parent);
                if (parent && parent.model && parent.model.modelMatrix) {
                    mat4.multiply(modelMatrix, parent.model.modelMatrix, modelMatrix);
                }
            }
            
            /*if(pointLights.parent){
                let parent = getObject(state, pointLights.parent);
                if(parent.model && parent.model.modelMatrix){
                    mat4.multiply(modelMatrix, parent.model.modelMatrix, modelMatrix);
                }
            }*/

            object.model.modelMatrix = modelMatrix;
            gl.uniformMatrix4fv(object.programInfo.uniformLocations.model, false, modelMatrix);

            // Normal Matrix ....
            let normalMatrix = mat4.create();
            mat4.invert(normalMatrix, modelMatrix);
            mat4.transpose(normalMatrix, normalMatrix);
            gl.uniformMatrix4fv(object.programInfo.uniformLocations.normalMatrix, false, normalMatrix);

            // Object material
            gl.uniform3fv(object.programInfo.uniformLocations.diffuseVal, object.material.diffuse);
            gl.uniform3fv(object.programInfo.uniformLocations.ambientVal, object.material.ambient);
            gl.uniform3fv(object.programInfo.uniformLocations.specularVal, object.material.specular);
            gl.uniform1f(object.programInfo.uniformLocations.nVal, object.material.n);
            gl.uniform1f(object.programInfo.uniformLocations.alpha, object.material.alpha);

            let exitLight = state.pointLights[0]
            gl.uniform3fv(gl.getUniformLocation(object.programInfo.program, "tankLight.position"), exitLight.position);
            gl.uniform3fv(gl.getUniformLocation(object.programInfo.program, "tankLight.colour"), exitLight.colour);
            gl.uniform1f(gl.getUniformLocation(object.programInfo.program, "tankLight.strength"), exitLight.strength);


            let tankLight = state.pointLights[1]
            gl.uniform3fv(gl.getUniformLocation(object.programInfo.program, "tankLight.position"), tankLight.position);
            gl.uniform3fv(gl.getUniformLocation(object.programInfo.program, "tankLight.colour"), tankLight.colour);
            gl.uniform1f(gl.getUniformLocation(object.programInfo.program, "tankLight.strength"), tankLight.strength);


            gl.uniform1i(object.programInfo.uniformLocations.numLights, state.numLights);
            if (state.pointLights.length > 0) {
                for (let i = 0; i < state.pointLights.length; i++) {
                    gl.uniform3fv(gl.getUniformLocation(object.programInfo.program, 'pointLights[' + i + '].position'), state.pointLights[i].position);
                    gl.uniform3fv(gl.getUniformLocation(object.programInfo.program, 'pointLights[' + i + '].colour'), state.pointLights[i].colour);
                    gl.uniform1f(gl.getUniformLocation(object.programInfo.program, 'pointLights[' + i + '].strength'), state.pointLights[i].strength);
                    gl.uniform1f(gl.getUniformLocation(object.programInfo.program, 'pointLights[' + i + '].linear'), state.pointLights[i].linear);
                    gl.uniform1f(gl.getUniformLocation(object.programInfo.program, 'pointLights[' + i + '].quadratic'), state.pointLights[i].quadratic);
                }
            }


            {
                // Bind the buffer we want to draw
                gl.bindVertexArray(object.buffers.vao);

                //check for diffuse texture and apply it
                if (object.material.shaderType === 3) {
                    state.samplerExists = 1;
                    gl.activeTexture(gl.TEXTURE0);
                    gl.uniform1i(object.programInfo.uniformLocations.samplerExists, state.samplerExists);
                    gl.uniform1i(object.programInfo.uniformLocations.sampler, 0);
                    gl.bindTexture(gl.TEXTURE_2D, object.model.texture);
                } else {
                    gl.activeTexture(gl.TEXTURE0);
                    state.samplerExists = 0;
                    gl.uniform1i(object.programInfo.uniformLocations.samplerExists, state.samplerExists);
                }

                //check for normal texture and apply it
                if (object.material.shaderType === 4) {
                    state.samplerNormExists = 1;
                    gl.activeTexture(gl.TEXTURE1);
                    gl.uniform1i(object.programInfo.uniformLocations.normalSamplerExists, state.samplerNormExists);
                    gl.uniform1i(object.programInfo.uniformLocations.normalSampler, 1);
                    gl.bindTexture(gl.TEXTURE_2D, object.model.textureNorm);
                } else {
                    gl.activeTexture(gl.TEXTURE1);
                    state.samplerNormExists = 0;
                    gl.uniform1i(object.programInfo.uniformLocations.normalSamplerExists, state.samplerNormExists);
                }

                // Draw the object
                const offset = 0; // Number of elements to skip before starting

                //if its a mesh then we don't use an index buffer and use drawArrays instead of drawElements
                if (object.type === "mesh" || object.type === "meshCustom") {
                    gl.drawArrays(gl.TRIANGLES, offset, object.buffers.numVertices / 3);
                } else {
                    gl.drawElements(gl.TRIANGLES, object.buffers.numVertices, gl.UNSIGNED_SHORT, offset);
                }
            }
        }
    });
}
