class Game {
    constructor(state) {
        this.state = state;
        this.spawnedObjects = [];
        this.collidableObjects = [];
        this.lastmove = vec3.fromValues(0, 0, 0);
        this.defaultCameraPosition = vec3.fromValues(0, 4.75, 0);
        this.defaultCameraFront = vec3.fromValues(-0.011857885689760707, -0.9998476951577961, 0.01280535179569429);
        this.tankCamera = vec3.fromValues(0,0,0);
        this.cameraPosition = 0;
        this.tankForward = 1;
        this.bulletCount = 0;
        this.gameover = 0;
        this.gamewin = 0;
        this.lock = 0;
        this.enemy_count = 4;
    }

    // example - we can add our own custom method to our game and call it using 'this.customMethod()'
    customMethod() {
        console.log("Custom method!");
    }

    spawnBullet(position, direction) {
        spawnObject ({
            name: "bullet" + this.bulletCount,
            type: "cube",
            bullet: true,
            material: {
                ambient: vec3.fromValues(0.3, 0.3, 0.3),
                diffuse: randomVec3(0, 1),
                specular: vec3.fromValues(0.5, 0.5, 0.5),
                n: 5,
                alpha: "0",
                shaderType: 1,
            },
            position: position,
            scale: vec3.fromValues(1, 1, 1),

        }, this.state).then(async (tempObj) => {
            tempObj.direction = direction;
            tempObj.child = "bullet_model" + this.bulletCount;
            this.spawnedObjects.push(tempObj);
            this.createBulletCollider(tempObj); 


    });
        spawnObject ({
            name: "bullet_model" + this.bulletCount,
            type: "cube",
            bullet: true,
            material: {
                ambient: vec3.fromValues(1, 1, 0),
                diffuse: vec3.fromValues(1, 1, 0),
                specular: vec3.fromValues(1, 1, 0),
                n: 5,
                alpha: 1.0,
                shaderType: 1,
            },
            position: vec3.fromValues(0,0,0),
            scale: vec3.fromValues(0.25, 0.25, 0.25),
            parent: "bullet" + this.bulletCount,

        }, this.state).then(async (tempObj) => {
            this.spawnedObjects.push(tempObj);
    });
    }

    deleteBullet(bullet){
        let child = getObject(this.state, bullet.child);
        let index = this.state.objects.indexOf(bullet);
        if (index !== -1) {
            this.state.objects.splice(index, 1);
        }
        let index_c = this.state.objects.indexOf(child);
        if(index_c !== -1){
            this.state.objects.splice(index_c, 1);
        }
        //console.log(child);
    }

    // example - create a collider on our object with various fields we might need (you will likely need to add/remove/edit how this works)
    // createSphereCollider(object, radius, onCollide = null) {
    //     object.collider = {
    //         type: "SPHERE",
    //         radius: radius,
    //         flag: 0,
    //         onCollide: onCollide ? onCollide : (otherObject) => {
    //             console.log(`Collided with ${otherObject.name}`);
    //             console.log('last move was: ' + this.lastmove);
    //             this.cube.translate(vec3.fromValues(-this.lastmove[0], 0, -this.lastmove[2]));
    //             object.collider.flag = 1;
    //         }
    //     };
    //     this.collidableObjects.push(object);
    // }
    createBulletCollider(object, onCollide = null) {
        object.collider = {
            type: "BULLET",
            flag: 1,
            onCollide: onCollide ? onCollide : (otherObject) => {
                //console.log('BONK! ' + object.name +  ' collided with ' + otherObject.name);
                object.collider.flag = 0;
                console.log(otherObject.collider.type);
                this.deleteBullet(object);
                if (otherObject.collider.type == "ENEMY" && otherObject.collider.flag == 1) {
                    otherObject.collider.flag = 0;
                    this.enemy_count -= 1;
                    console.log("hit");
                }
                
            }
    }

}

createEnemyCollider(object, onCollide = null) {

    object.collider = {
        type: "ENEMY",
        flag: 1,
        onCollide: onCollide ? onCollide : (otherObject) => {
            object.collider.flag = 0;
            if(otherObject.collider.type == "CUBE" && this.lock == 0){
                this.gameover = 1;
                console.log("dead");
            }

        }
    };
    this.collidableObjects.push(object);
}

    createCubeCollider(object, onCollide = null) {
        object.collider = {
            type: "CUBE",
            flag: 1,
            onCollide: onCollide ? onCollide : (otherObject) => {
                console.log(`BONK! Collided with ${otherObject.name} @ ${otherObject.model.position}!`);
                // console.log('last move was: ' + this.lastmove);
                // console.log(this.collidableObjects);
                // console.log(otherObject);
                this.cube.translate(vec3.fromValues(-this.lastmove[0], 0, -this.lastmove[2]));
                if (this.cameraPosition == 1){
                    vec3.add(this.state.camera.position, this.state.camera.position, vec3.fromValues(-this.lastmove[0], 0, -this.lastmove[2]));
                }
                otherObject.material.diffuse = vec3.fromValues(1.0, 0, 0);
                //this.spawnedObjects.push(tempObj);
                //this.spawnedObjects.push(tempObj2);
                
            }
        };
        this.collidableObjects.push(object);
    }

    // example - function to check if an object is colliding with collidable objects
    // checkCollision(object) {
    //     // loop over all the other collidable objects 
    //     this.collidableObjects.forEach(otherObject => {
    //         // do a check to see if we have collided, if we have we can call object.onCollide(otherObject) which will
    //         // call the onCollide we define for that specific object. This way we can handle collisions identically for all
    //         // objects that can collide but they can do different things (ie. player colliding vs projectile colliding)
    //         // use the modeling transformation for object and otherObject to transform position into current location
    //         if(object != otherObject){
    //             if (((otherObject.model.position[0] - object.model.position[0])**2 + (otherObject.model.position[0] - object.model.position[0])**2)**(1/2) < object.collider.radius + otherObject.collider.radius){
    //                 object.collider.onCollide(otherObject)
    //             }
    //         }
    //     });
    // }
    
    checkBulletCollision(object) {
        this.collidableObjects.forEach(otherObject => {
            if (object != otherObject){
                var aSquare = vec3.create();
                var bSquare = vec3.create();
                vec3.transformMat4(aSquare, object.model.position, object.model.modelMatrix);
                vec3.transformMat4(bSquare, otherObject.model.position, otherObject.model.modelMatrix);
                var aXmax = aSquare[0] + 0.5;
                var aXmin = aSquare[0] - 0.5;
                var aZmax = aSquare[2] + 0.5;
                var aZmin = aSquare[2] - 0.5;
                var bXmax = bSquare[0] + 0.5;
                var bXmin = bSquare[0] - 0.5;
                var bZmax = bSquare[2] + 0.5;
                var bZmin = bSquare[2] - 0.5;
                //console.log(aSquare);
                if (aXmin < bXmax &&
                    aXmax > bXmin &&
                    aZmin < bZmax &&
                    aZmax > bZmin){
                    console.log("SOMETHING IS HAPPENING");
                    object.collider.onCollide(otherObject);
                }
            }
    });
    }

    checkEnemyCollision(object) {
        this.collidableObjects.forEach(otherObject => {
            if (object != otherObject) {
                var aSquare = vec3.create();
                var bSquare = vec3.create();
                vec3.transformMat4(aSquare, object.model.position, object.model.modelMatrix);
                vec3.transformMat4(bSquare, otherObject.model.position, otherObject.model.modelMatrix);
                var aXmax = aSquare[0] + 0.5 //(object.scale * object.size);
                var aXmin = aSquare[0] - 0.5 //(object.scale * object.size);
                var aZmax = aSquare[2] + 0.5 //(object.scale * object.size);
                var aZmin = aSquare[2] - 0.5 //(object.scale * object.size);
                var bXmax = bSquare[0] + 0.5 //(object.scale * object.size);
                var bXmin = bSquare[0] - 0.5 //(object.scale * object.size);
                var bZmax = bSquare[2] + 0.5 //(object.scale * object.size);
                var bZmin = bSquare[2] - 0.5 //(object.scale * object.size);
                //console.log(aSquare);
                if (aXmin < bXmax &&
                    aXmax > bXmin &&
                    aZmin < bZmax &&
                    aZmax > bZmin){
                    console.log("TANK IS HAPPENING");
                    object.collider.onCollide(otherObject);
                }
            }
        })
    }

    checkCubeCollision(object) {
        // loop over all the other collidable objects 
        this.collidableObjects.forEach(otherObject => {
            // do a check to see if we have collided, if we have we can call object.onCollide(otherObject) which will
            // call the onCollide we define for that specific object. This way we can handle collisions identically for all
            // objects that can collide but they can do different things (ie. player colliding vs projectile colliding)
            // use the modeling transformation for object and otherObject to transform position into current location
            
            if(object != otherObject){
                
                var aSquare = vec3.create();
                var bSquare = vec3.create();
                vec3.transformMat4(aSquare, object.model.position, object.model.modelMatrix);
                vec3.transformMat4(bSquare, otherObject.model.position, otherObject.model.modelMatrix);
                var aXmax = aSquare[0] + object.model.scale[0]/2;
                var aXmin = aSquare[0] - object.model.scale[0]/2;
                var aZmax = aSquare[2] + object.model.scale[2]/2;
                var aZmin = aSquare[2] - object.model.scale[2]/2;
                var bXmax = bSquare[0] + otherObject.model.scale[0]/2;
                var bXmin = bSquare[0] - otherObject.model.scale[0]/2;
                var bZmax = bSquare[2] + otherObject.model.scale[2]/2;
                var bZmin = bSquare[2] - otherObject.model.scale[2]/2;
                //console.log(aSquare + " aXmax: " + aXmax);
                if (aXmax-bXmax == 0 && aZmax-bZmax == 0){
                    //console.log(otherObject.model.position);
                    object.collider.onCollide(otherObject);
                }
            }
        });
    }
    /*
    // within bounds function is just to play around with the perimeter wall
    isWithinBounds(position) {
        // playing around with the perimeter wall to see if I can find an x and z bound
        const minX = -10;
        const maxX = 10;
        const minY = -10;
        const maxY = 10;
    
        return position[0] >= minX && position[0] <= maxX && position[2] >= minY && position[2] <= maxY;
    }
    */
    // runs once on startup after the scene loads the objects
    async onStart() {
        console.log("On start");

        // this just prevents the context menu from popping up when you right click
        document.addEventListener("contextmenu", (e) => {
            e.preventDefault();
        }, false);
        

        // example - set an object in onStart before starting our render loop!
        this.camera = getObject(this.state, "camera");
        // THIS IS YOU
        this.cube = getObject(this.state, "tank");
        this.tank = getObject(this.state, "tank2");
        this.tankCamera = vec3.fromValues(this.cube.model.position[0], this.cube.model.position[1] + 2, this.cube.model.position[2]);
        this.light = getObject(this.state, "pointLight1");

        // Initialize the walls as they are just walls lining up the map
        // SOUTH wall
        this.sWall = getObject(this.state, "wall1-copy-copy");
        this.sWall2 = getObject(this.state, "wall1");
        this.sWall3 = getObject(this.state, "wall1-copy-copy-copy");
        this.sWall4 = getObject(this.state, "wall1-copy-copy-copy-copy");
        
        // CENTRAL WALLS
        this.cWall = getObject(this.state, "wall2");
        this.cWall2 = getObject(this.state, "wall2-copy");
        this.cWall3 = getObject(this.state, "wall2-copy-copy");
        this.cWall4 = getObject(this.state, "wall2-copy-copy-copy");
        this.cWall5 = getObject(this.state, "wall2-copy-copy-copy-copy");
        this.cWall6 = getObject(this.state, "wall2-copy-copy-copy-copy-copy");
        this.cWall7 = getObject(this.state, "wall2-copy-copy-copy-cop");
        this.cWall8 = getObject(this.state, "wall2-copy-copy-copy-copy-copy-copy-copy");

        // EASTERN WALLS
        this.eWall = getObject(this.state, "wall3");
        this.eWall2 = getObject(this.state, "wall3-copy");
        this.eWall3 = getObject(this.state, "wall3-copy-copy");
        this.eWall4 = getObject(this.state, "wall3-copy-copy-copy");

        // WESTERN WALLS
        this.wWall = getObject(this.state, "wall4");
        this.wWall2 = getObject(this.state, "wall4-copy");
        this.wWall3 = getObject(this.state, "wall4-copy-copy");

        // ENEMY TANKS
        this.enemy1 = getObject(this.state, "enemy 1");
        this.enemy2 = getObject(this.state, "enemy 2");
        this.enemy3 = getObject(this.state, "enemy 3");
        this.enemy4 = getObject(this.state, "enemy 4");

        // some fun things to do with the tanks
        this.enemy1.direction = vec3.fromValues(0.01,0,0);
        this.enemy1.steps = 0;
        this.enemy2.direction = vec3.fromValues(0,0,0.01);
        this.enemy2.steps = 0;
        this.enemy3.direction = vec3.fromValues(0.01,0,0);
        this.enemy3.steps = 0;
        this.enemy4.direction = vec3.fromValues(0.01,0,0.01);
        this.enemy4.steps = 0;


        this.outerwall = getObject(this.state, "Cube");


        //TANK LIGHT
        this.tankLight = getObject(this.state, "tank light");



        this.createCubeCollider(this.cube);
        //this.createCubeCollider(this.exit);
        

        // colliders for ALL of the walls
        // South wall
        this.createCubeCollider(this.sWall);
        this.createCubeCollider(this.sWall2);
        this.createCubeCollider(this.sWall3);
        this.createCubeCollider(this.sWall4);

        // Central walls
        this.createCubeCollider(this.cWall);
        this.createCubeCollider(this.cWall2);
        this.createCubeCollider(this.cWall3);
        this.createCubeCollider(this.cWall4);
        this.createCubeCollider(this.cWall5);
        this.createCubeCollider(this.cWall6);
        this.createCubeCollider(this.cWall7);
        this.createCubeCollider(this.cWall8);

        // Eastern walls
        this.createCubeCollider(this.eWall);
        this.createCubeCollider(this.eWall2);
        this.createCubeCollider(this.eWall3);
        this.createCubeCollider(this.eWall4);

        // Western walls
        this.createCubeCollider(this.wWall);
        this.createCubeCollider(this.wWall2);
        this.createCubeCollider(this.wWall3);

        //Enemy tanks
        this.createEnemyCollider(this.enemy1);
        this.createEnemyCollider(this.enemy2);
        this.createEnemyCollider(this.enemy3);
        this.createEnemyCollider(this.enemy4);

        this.createCubeCollider(this.outerwall);



        // example - setting up a key press event to move an object in the scene
        document.addEventListener("keypress", (e) => {
            e.preventDefault();
            switch (e.key) {
                case "a":
                    this.tankForward += 1;
                    if (this.tankForward == 5){
                        this.tankForward = 1;
                    }
                    this.tank.rotate("z", (Math.PI/2));
                    if(this.tankForward == 1){
                        if(this.cameraPosition == 1){
                            this.state.camera.front = vec3.fromValues(0,0,1);
                        }
                        this.state.pointLights[1].position[2] = this.cube.model.position[2] + 0.1 + 1/Math.abs(this.cube.model.position[2] + 0.4)**(1/20);
                        this.state.pointLights[1].position[0] = this.cube.model.position[0];
                    }
                    if(this.tankForward == 2){
                        if(this.cameraPosition == 1){
                            this.state.camera.front = vec3.fromValues(1,0,0);
                        }
                        this.state.pointLights[1].position[2] = this.cube.model.position[2];
                        this.state.pointLights[1].position[0] = this.cube.model.position[0] + 0.1 + 1/Math.abs(this.cube.model.position[2] + 0.4)**(1/20);
                    }
                    if(this.tankForward == 3){
                        if(this.cameraPosition == 1){
                            this.state.camera.front = vec3.fromValues(0,0,-1);
                        }
                        this.state.pointLights[1].position[2] = this.cube.model.position[2] - 0.1 - 1/Math.abs(this.cube.model.position[2] + 0.4)**(1/20);
                        this.state.pointLights[1].position[0] = this.cube.model.position[0];
                    }
                    if(this.tankForward == 4){
                        if(this.cameraPosition == 1){
                            this.state.camera.front = vec3.fromValues(-1,0,0);
                        }
                        this.state.pointLights[1].position[2] = this.cube.model.position[2];
                        this.state.pointLights[1].position[0] = this.cube.model.position[0] - 0.1 - 1/Math.abs(this.cube.model.position[2] + 0.4)**(1/20);
                    }
                    console.log(this.tankForward);
                    break;
                    
                    case "d":
                        this.tankForward -= 1;
                        if (this.tankForward == 0){
                            this.tankForward = 4;
                        }
                        this.tank.rotate("z", (Math.PI/-2));
                        if(this.tankForward == 1){
                            if(this.cameraPosition == 1){
                                this.state.camera.front = vec3.fromValues(0,0,1);
                            }
                            this.state.pointLights[1].position[2] = this.cube.model.position[2] + 0.1 + 1/Math.abs(this.cube.model.position[2] + 0.4)**(1/20);
                            this.state.pointLights[1].position[0] = this.cube.model.position[0];
                        }
                        if(this.tankForward == 2){
                            if(this.cameraPosition == 1){
                            this.state.camera.front = vec3.fromValues(1,0,0);
                            }
                            this.state.pointLights[1].position[2] = this.cube.model.position[2];
                            this.state.pointLights[1].position[0] = this.cube.model.position[0] + 0.1 + 1/Math.abs(this.cube.model.position[2] + 0.4)**(1/20);
                        }
                        if(this.tankForward == 3){
                            if(this.cameraPosition == 1){
                            this.state.camera.front = vec3.fromValues(0,0,-1);
                            }
                            this.state.pointLights[1].position[2] = this.cube.model.position[2] + 0.1 - 1/Math.abs(this.cube.model.position[2] + 0.4)**(1/20);
                            this.state.pointLights[1].position[0] = this.cube.model.position[0];
                        }
                        if(this.tankForward == 4){
                        if(this.cameraPosition == 1){
                        this.state.camera.front = vec3.fromValues(-1,0,0);
                        }
                        this.state.pointLights[1].position[2] = this.cube.model.position[2];
                        this.state.pointLights[1].position[0] = this.cube.model.position[0] + 0.1 - 1/Math.abs(this.cube.model.position[2] + 0.4)**(1/20);
                    }
                    console.log(this.tankForward);
                    break;

                case "w":
                    if(this.lock == 0){
                    if (this.tankForward == 1){
                        this.cube.translate(vec3.fromValues(0, 0, 0.5));
                        console.log(this.cube.model.position[2]);
                        this.state.pointLights[1].position[2] = this.cube.model.position[2] + 0.1 + 1/Math.abs(this.cube.model.position[2] + 0.4)**(1/20);
                        this.lastmove = vec3.fromValues(0, 0, 0.5);

                        /*const newPosition = vec3.fromValues(this.cube.model.position[0], this.cube.model.position[1], this.cube.model.position[2] + 0.5);
                        if (this.isWithinBounds(newPosition)) {
                            this.cube.translate(newPosition);
                            console.log(this.cube.model.position[2]);
                            this.state.pointLights[1].position[2] = this.cube.model.position[2] + 0.1 + 1/Math.abs(this.cube.model.position[2] + 0.4)**(1/20);
                            this.lastmove = vec3.fromValues(0, 0, 0.5);
                            this.moveCount++;
                        }*/
                    }
                    if (this.tankForward == 3){
                        this.cube.translate(vec3.fromValues(0, 0, -0.5));
                        this.state.pointLights[1].position[2] = this.cube.model.position[2] - 0.1 - 1/Math.abs(this.cube.model.position[2] + 0.4)**(1/20);
                        this.lastmove = vec3.fromValues(0, 0, -0.5);
                    }
                    if (this.tankForward == 2){
                        this.cube.translate(vec3.fromValues(0.5, 0, 0));
                        this.state.pointLights[1].position[0] = this.cube.model.position[0] + 0.1 + 1/Math.abs(this.cube.model.position[2] + 0.4)**(1/20);
                        this.lastmove = vec3.fromValues(0.5, 0, 0);
                    }
                    if (this.tankForward == 4){
                        this.cube.translate(vec3.fromValues(-0.5, 0, 0));
                        this.state.pointLights[1].position[0] = this.cube.model.position[0] - 0.1 - 1/Math.abs(this.cube.model.position[2] + 0.4)**(1/20);
                        this.lastmove = vec3.fromValues(-0.5, 0, 0);
                    }
                    if (this.cameraPosition == 1){
                        vec3.add(this.state.camera.position, this.state.camera.position, vec3.fromValues(this.lastmove[0], this.lastmove[1], this.lastmove[2]));
                    }}
                    break;

                case "s":
                    if(this.lock == 0){
                    if (this.tankForward == 1){
                        this.cube.translate(vec3.fromValues(0, 0, -0.5));
                        this.state.pointLights[1].position[2] = this.cube.model.position[2] + 0.1 + 1/Math.abs(this.cube.model.position[2] + 0.4)**(1/20);
                        this.lastmove = vec3.fromValues(0, 0, -0.5);
                    }
                    if (this.tankForward == 3){
                        this.cube.translate(vec3.fromValues(0, 0, 0.5));
                        this.state.pointLights[1].position[2] = this.cube.model.position[2] - 0.1 - 1/Math.abs(this.cube.model.position[2] + 0.4)**(1/20);
                        this.lastmove = vec3.fromValues(0, 0, 0.5);
                    }
                    if (this.tankForward == 2){
                        this.cube.translate(vec3.fromValues(-0.5, 0, 0));
                        this.state.pointLights[1].position[0] = this.cube.model.position[0] + 0.1 + 1/Math.abs(this.cube.model.position[2] + 0.4)**(1/20);
                        this.lastmove = vec3.fromValues(-0.5, 0, 0);
                    }
                    if (this.tankForward == 4){
                        this.cube.translate(vec3.fromValues(0.5, 0, 0));
                        this.state.pointLights[1].position[0] = this.cube.model.position[0] - 0.1 - 1/Math.abs(this.cube.model.position[2] + 0.4)**(1/20);
                        this.lastmove = vec3.fromValues(0.5, 0, 0);
                    }
                    if (this.cameraPosition == 1){
                        vec3.add(this.state.camera.position, this.state.camera.position, vec3.fromValues(this.lastmove[0], this.lastmove[1], this.lastmove[2]));
                    }}
                    break;
                // case "b":
                //     vec3.add(this.state.camera.position, this.state.camera.position, vec3.fromValues(0, 0, 1));
                //     console.log(this.defaultCameraPosition);
                //     //console.log(this.state.settings.camera);
                //     break;
                case "r":
                    // Reset camera position to default
                    if(this.cameraPosition === 1){
                        this.state.camera.position[0] = this.defaultCameraPosition[0];
                        this.state.camera.position[1] = this.defaultCameraPosition[1];
                        this.state.camera.position[2] = this.defaultCameraPosition[2];
                        this.state.camera.front = vec3.fromValues(this.defaultCameraFront[0], this.defaultCameraFront[1], this.defaultCameraFront[2]);
                        this.cameraPosition = 0;
                        console.log('position reset');
                    }
                    else{
                        this.state.camera.position[0] = this.cube.model.position[0]+0.25;
                        this.state.camera.position[1] = this.cube.model.position[1]+1;
                        this.state.camera.position[2] = this.cube.model.position[2]+0.25;
                        if (this.tankForward == 1){
                            this.state.camera.front = vec3.fromValues(0, 0, 1);
                        }
                        if (this.tankForward == 2){
                            this.state.camera.front = vec3.fromValues(1, 0, 0);
                        }
                        if (this.tankForward == 3){
                            this.state.camera.front = vec3.fromValues(0, 0, -1);
                        }
                        if (this.tankForward == 4){
                            this.state.camera.front = vec3.fromValues(-1, 0, 0);
                        }
                        this.cameraPosition = 1;
                        console.log('tank view');
                    }
                    break;
                // case "q":
                //     // Checking camera stats
                //     console.log(this.state.camera);
                //     break;
                // case "z":
                //     // Checking tank stats
                //     console.log(this.cube);
                //     window.alert("Number of moves: " + this.moveCount + "\n" +
                //                  "Health: " + this.health) + "\n" +
                //                  "";
                //     break;
                case " ":
                    // Spawn a bullet
                    if(this.lock == 0){
                    this.bulletCount += 1;
                    if (this.tankForward == 1){
                        var position = vec3.fromValues(this.cube.model.position[0], this.cube.model.position[1], this.cube.model.position[2] + 0.5); 
                        var direction = vec3.fromValues(0, 0, 1);
                        this.spawnBullet(position, direction);
                    }
                    if (this.tankForward == 2){
                        var position = vec3.fromValues(this.cube.model.position[0] + 0.5, this.cube.model.position[1], this.cube.model.position[2]);
                        var direction = vec3.fromValues(1, 0, 0);
                        this.spawnBullet(position, direction);
                    }
                    if (this.tankForward == 3){
                        var position = vec3.fromValues(this.cube.model.position[0], this.cube.model.position[1], this.cube.model.position[2] - 0.5);
                        var direction = vec3.fromValues(0, 0, -1);
                        this.spawnBullet(position, direction);
                    }
                    if (this.tankForward == 4){
                        var position = vec3.fromValues(this.cube.model.position[0] - 0.5, this.cube.model.position[1], this.cube.model.position[2]);
                        var direction = vec3.fromValues(-1, 0, 0);
                        this.spawnBullet(position, direction);
                    }}
                    break;
                case "k":
                    console.log(this.collidableObjects);
                    break;
                default:
                    break;
            }
        });

        this.customMethod(); // calling our custom method! (we could put spawning logic, collision logic etc in there ;) )

        // example: spawn some stuff before the scene starts
    //     for (let i = 0; i < 10; i++) {
    //         for (let j = 0; j < 10; j++) {
    //             for (let k = 0; k < 10; k++) {
    //                 spawnObject({
    //                     name: `new-Object${i}${j}${k}`,
    //                     type: "cube",
    //                     material: {
    //                         diffuse: randomVec3(0, 1)
    //                     },
    //                     position: vec3.fromValues(4 - i, 5 - j, 10 - k),
    //                     scale: vec3.fromValues(0.5, 0.5, 0.5)
    //                 }, this.state);
    //             }
    //         }
    //     }

    //     for (let i = 0; i < 10; i++) {
    //         let tempObject = await spawnObject({
    //             name: `new-Object${i}`,
    //             type: "cube",
    //             material: {
    //                 diffuse: randomVec3(0, 1)
    //             },
    //             position: vec3.fromValues(4 - i, 0, 0),
    //             scale: vec3.fromValues(0.5, 0.5, 0.5)
    //         }, this.state); 



    //     tempObject.constantRotate = true; // lets add a flag so we can access it later
    //     this.spawnedObjects.push(tempObject); // add these to a spawned objects list

    //     tempObject.collidable = true;
    //     tempObject.onCollide = (object) => { // we can also set a function on an object without defining the function before hand!
    //         console.log(`I collided with ${object.name}!`);
    //     };
    //     }
    }

    // Runs once every frame non stop after the scene loads
    onUpdate(deltaTime) {
        // TODO - Here we can add game logic, like moving game objects, detecting collisions, you name it. Examples of functions can be found in sceneFunctions

        // example: Rotate a single object we defined in our start method
        //this.exit.rotate('x', deltaTime * 0.5);

        // example: Rotate all objects in the scene marked with a flag
        // this.state.objects.forEach((object) => {
        //     if (object.constantRotate) {
        //         object.rotate('y', deltaTime * 0.5);
        //     }
        // });

        // simulate a collision between the first spawned object and 'cube' 
        // if (this.spawnedObjects[0].collidable) {
        //     this.spawnedObjects[0].onCollide(this.cube);
        // }

        // example: Rotate all the 'spawned' objects in the scene
        this.spawnedObjects.forEach((object) => {
            if(object.collider){
            object.translate(vec3.fromValues(object.direction[0]*0.05, 0, object.direction[2]*0.05));
            
            if (object.collider.flag == 1){
                //console.log("yes");
                this.checkBulletCollision(object);
            }}
            if (object.model.position[0] > 3.5 || object.model.position[0] < -3.5 || object.model.position[2] > 3.5 || object.model.position[2] < -3.5){
                this.deleteBullet(object);
            }
        });

        // Enemy movement
        if (this.enemy1.collider.flag == 1) {
            this.enemy1.translate(this.enemy1.direction);
            this.enemy1.steps += 1;
            this.checkEnemyCollision(this.enemy1);
            if (this.enemy1.steps == 240){
                this.enemy1.direction = vec3.fromValues(-this.enemy1.direction[0],0,0);
                this.enemy1.steps = 0;
            }}

        if (this.enemy2.collider.flag == 1) {
            this.enemy2.translate(this.enemy2.direction);
            this.enemy2.steps += 1;
            this.checkEnemyCollision(this.enemy2);
            if (this.enemy2.steps == 60){
                this.enemy2.direction = vec3.fromValues(0,0,-this.enemy2.direction[2]);
                this.enemy2.steps = 0;
            }}

        if (this.enemy3.collider.flag == 1) {
            this.enemy3.translate(this.enemy3.direction);
            this.enemy3.steps += 1;
            this.checkEnemyCollision(this.enemy3);
            if (this.enemy3.steps == 120){
                this.enemy3.direction = vec3.fromValues(-this.enemy3.direction[0],0,0);
                this.enemy3.steps = 0;
            }}

        if (this.enemy4.collider.flag == 1){
            this.enemy4.translate(this.enemy4.direction);
            this.enemy4.steps += 1;
            this.checkEnemyCollision(this.enemy4);
            if (this.enemy4.steps == 120){
                this.enemy4.direction = vec3.fromValues(-this.enemy4.direction[0],0,-this.enemy4.direction[2]);
                this.enemy4.steps = 0;
            }}
            
        if(this.gameover == 1){
            this.gameover = 0;
            this.lock = 1;
        }
        if(this.enemy_count == 0){
            this.gamewin = 1;
            this.lock = 1;
            this.enemy_count = 1;
            this.state.pointLights[0].colour[0] = 0;
            this.state.pointLights[0].colour[1] = 1;
            this.state.pointLights[0].colour[2] = 0;
        }

        // example - call our collision check method on our cube
        if (this.cube.model.position[2] == -3.5){
            this.cube.translate(vec3.fromValues(0,0,0.5));
            if(this.cameraPosition == 1){
            this.state.camera.position[0] = this.cube.model.position[0]+0.25;
            this.state.camera.position[2] = this.cube.model.position[2]+0.25;}
        }
        if (this.cube.model.position[2] == 3.5){
            this.cube.translate(vec3.fromValues(0,0,-0.5));
            if(this.cameraPosition == 1){
                this.state.camera.position[0] = this.cube.model.position[0]+0.25;
                this.state.camera.position[2] = this.cube.model.position[2]+0.25;}
        }
        if (this.cube.model.position[0] == -3.5){
            this.cube.translate(vec3.fromValues(0.5,0,0));
            if(this.cameraPosition == 1){
                this.state.camera.position[0] = this.cube.model.position[0]+0.25;
                this.state.camera.position[2] = this.cube.model.position[2]+0.25;}
        }
        if (this.cube.model.position[0] == 3.5){
            this.cube.translate(vec3.fromValues(-0.5,0,0));
            if(this.cameraPosition == 1){
                this.state.camera.position[0] = this.cube.model.position[0]+0.25;
                this.state.camera.position[2] = this.cube.model.position[2]+0.25;}
        }
        this.checkCubeCollision(this.cube);
    }
}
