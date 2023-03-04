// global variables
let startX, startY;
let objAcquired = null;
let moveObject = false;
let selectedObject = null;

function saveOriginalPos(light){
    light.originalPos = {
        x: light.position.x,
        y: light.position.y,
        z: light.position.z
    }
}

// https://discourse.threejs.org/t/solved-glb-model-is-very-dark/6258
function setupLights(scene, lights, lightHelpers){
    const dirLight = new THREE.DirectionalLight(0xffffff);
    dirLight.position.set(0, 80, 0);
    const helper1 = new THREE.DirectionalLightHelper(dirLight, 5, 0xff0000);
    saveOriginalPos(dirLight);
    scene.add(dirLight);
    scene.add(helper1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff);
    dirLight2.position.set(0, 50, 20);
    const helper2 = new THREE.DirectionalLightHelper(dirLight2, 5, 0xff0000);
    saveOriginalPos(dirLight2);
    scene.add(dirLight2);
    scene.add(helper2);

    const dirLight3 = new THREE.DirectionalLight(0xffffff);
    dirLight3.position.set(0, 50, -20);
    saveOriginalPos(dirLight3);
    const helper3 = new THREE.DirectionalLightHelper(dirLight3, 5, 0xff0000);
    scene.add(dirLight3);
    scene.add(helper3);

    const dirLight4 = new THREE.DirectionalLight(0xffffff);
    dirLight4.position.set(20, 50, 0);
    saveOriginalPos(dirLight4);
    const helper4 = new THREE.DirectionalLightHelper(dirLight4, 5, 0xff0000);
    scene.add(dirLight4);
    scene.add(helper4);

    const dirLight5 = new THREE.DirectionalLight(0xffffff);
    dirLight5.position.set(-20, 50, 0);
    saveOriginalPos(dirLight5);
    const helper5 = new THREE.DirectionalLightHelper(dirLight5, 5, 0xff0000);
    scene.add(dirLight5);
    scene.add(helper5);

    [dirLight, dirLight2, dirLight3, dirLight4, dirLight5].forEach(x => lights.push(x));
    [helper1, helper2, helper3, helper4, helper5].forEach(x => lightHelpers.push(x));
    
    // turn light helpers off initially
    lightHelpers.forEach(lh => {
        lh.visible = false;
    });
}

/*****

    for controlling obj movement on canvas pointerdown/move
    
*****/
// https://stackoverflow.com/questions/42309715/how-to-correctly-pass-mouse-coordinates-to-webgl
function getCoordsOnMouseClick(event){
    const target = event.target;
    const x1 = event.clientX - target.getBoundingClientRect().left;// + target.offsetWidth/2;
    const y1 = event.clientY - target.getBoundingClientRect().top;// + target.offsetHeight/2;
    const posX = (x1 * target.width) / target.clientWidth;
    const posY = (y1 * target.height) / target.clientHeight;

    const gl = target.getContext("webgl2"); // might be webgl in other browsers (not chrome)?
    const x = (posX / gl.canvas.width) * 2 - 1;
    const y = (posY / gl.canvas.height) * -2 + 1;
    
    return {x, y};
}

function addClickModelStart(ptrEvt){
    const mouseCoords = getCoordsOnMouseClick(ptrEvt);
    raycaster.setFromCamera(mouseCoords, camera);
    
    const intersects = raycaster.intersectObjects(scene.children, true);
    if(intersects.length > 0){
        for(let intersected of intersects){
            if(intersected.object.name && !intersected.object.name.includes("grid")){
                startX = mouseCoords.x;
                startY = mouseCoords.y;
                
                if(intersected.object.parent.type === "Group"){
                    objAcquired = intersected.object.parent;
                }else{
                    objAcquired = intersected.object;
                }
                
                break;
            }
        }
    }
}
function moveModelStart(evt){
    evt.preventDefault();
    if(evt.which === 1)
        addClickModelStart(evt);
}

function addClickModelMove(ptrEvt, dragging){
    const mouseCoords = getCoordsOnMouseClick(ptrEvt);
    raycaster.setFromCamera(mouseCoords, camera);
    if(objAcquired && objAcquired == selectedObject){
        //console.log(intersected);
        const currX = mouseCoords.x;
        const currY = mouseCoords.y;
        //console.log("currX: " + currX + ", currY: " + currY);
        
        const deltaX = currX - startX;
        const deltaY = currY - startY;
       // console.log("deltaX: " + deltaX + ", deltaY: " + deltaY);
        
        //console.log(objAcquired);
        const selectedMoveDir = document.querySelector('input[name="moveDirection"]:checked').value;
        
        const moveUp = Math.max(Math.abs(deltaX), Math.abs(deltaY)) === Math.abs(deltaY); // move along z axis
        if(moveUp || selectedMoveDir === "vertical"){
            if(deltaY){
                const moveAmount = (deltaY / Math.abs(deltaY)) * 0.05;
                if(selectedMoveDir === "vertical"){
                    objAcquired.translateY(moveAmount);
                }else{
                    objAcquired.translateZ(-moveAmount); // -z is into screen
                }
            }
        }else{
            if(deltaX){
                const moveAmount = (deltaX / Math.abs(deltaX)) * 0.05;
                objAcquired.translateX(moveAmount);
            }
        }
    }
}
function moveModelMove(evt){
    evt.preventDefault();
    addClickModelMove(evt, true);
}

function moveModelStop(evt){
    objAcquired = null;
}

/****

    different floor plans/grid configurations
    
****/
function setupGrids(grids){
    const gridHelper = new THREE.GridHelper(size, divisions);
    gridHelper.scale.setScalar(2);
    scene.add(gridHelper);
    gridHelper.name = "floorgrid";

    const gridHelper2 = new THREE.GridHelper(size, divisions);
    gridHelper2.scale.setScalar(2);
    gridHelper2.rotateX(Math.PI * 90 / 180);
    scene.add(gridHelper2);
    gridHelper2.translateZ(-10);
    gridHelper2.translateY(-10);
    gridHelper2.name = "wallgrid";

    const gridHelper3 = new THREE.GridHelper(size, divisions);
    gridHelper3.scale.setScalar(2);
    gridHelper3.rotateX(Math.PI * 90 / 180);
    gridHelper3.rotateZ(Math.PI * 90 / 180);
    scene.add(gridHelper3);
    gridHelper3.translateZ(-10);
    gridHelper3.translateY(-10);
    gridHelper3.name = "wallgrid";

    const gridHelper4 = new THREE.GridHelper(size, divisions);
    gridHelper4.scale.setScalar(2);
    gridHelper4.rotateX(Math.PI * 90 / 180);
    gridHelper4.rotateZ(Math.PI * 90 / 180);
    scene.add(gridHelper4);
    gridHelper4.translateZ(-10);
    gridHelper4.translateY(10);
    gridHelper4.name = "wallgrid";
    
    grids.push(gridHelper);
    grids.push(gridHelper2);
    grids.push(gridHelper3);
    grids.push(gridHelper4);
}

// floor plan 2
function setupFloorPlan2(grids){
    const gridHelper = new THREE.GridHelper(size, divisions);
    gridHelper.scale.setScalar(2);
    scene.add(gridHelper);
    gridHelper.name = "floorgrid";

    const gridHelper2 = new THREE.GridHelper(size, divisions);
    gridHelper2.scale.setScalar(2);
    gridHelper2.rotateX(Math.PI * 90 / 180);
    scene.add(gridHelper2);
    gridHelper2.translateZ(-10);
    gridHelper2.translateY(-10);
    gridHelper2.name = "wallgrid";

    const gridHelper3 = new THREE.GridHelper(size, divisions);
    gridHelper3.scale.setScalar(2);
    gridHelper3.rotateX(Math.PI * 90 / 180);
    gridHelper3.rotateZ(Math.PI * 90 / 180);
    scene.add(gridHelper3);
    gridHelper3.translateZ(-10);
    gridHelper3.translateY(-30);
    gridHelper3.name = "wallgrid";

    const gridHelper4 = new THREE.GridHelper(size, divisions);
    gridHelper4.scale.setScalar(2);
    gridHelper4.rotateX(Math.PI * 90 / 180);
    gridHelper4.rotateZ(Math.PI * 90 / 180);
    scene.add(gridHelper4);
    gridHelper4.translateZ(-10);
    gridHelper4.translateY(10);
    gridHelper4.name = "wallgrid";
    
    const gridHelper5 = new THREE.GridHelper(size, divisions);
    gridHelper5.scale.setScalar(2);
    scene.add(gridHelper5);
    gridHelper5.translateX(20);
    gridHelper5.name = "floorgrid";
    
    const gridHelper6 = new THREE.GridHelper(size, divisions);
    gridHelper6.scale.setScalar(2);
    gridHelper6.rotateX(Math.PI * 90 / 180);
    gridHelper6.translateX(20);
    gridHelper6.translateZ(-10);
    gridHelper6.translateY(-10);
    scene.add(gridHelper6);
    gridHelper6.name = "wallgrid";
    
    grids.push(gridHelper);
    grids.push(gridHelper2);
    grids.push(gridHelper3);
    grids.push(gridHelper4);
    grids.push(gridHelper5);
    grids.push(gridHelper6);
}

/****

    add wall, floor, new mesh

****/
function addWall(scene, grids){
    function createWall(){
        const wallGeometry = new THREE.PlaneGeometry(20, 20);
        const wallMaterial = new THREE.MeshBasicMaterial({color: 0xf6b092, side: THREE.DoubleSide}); // peach color
        return new THREE.Mesh(wallGeometry, wallMaterial);
    }
    
    grids.forEach((grid, index) => {
        if(grid.name.includes("wall")){
            const newWall = createWall();
            newWall.position.copy(grid.position);
            newWall.rotation.copy(grid.rotation);
            newWall.rotateX(90 * Math.PI / 180);
            newWall.name = `wall${index}`;
            scene.add(newWall);
        }
    });
}

function addFloor(scene, grids){
    function createFloor(){
        const floorGeometry = new THREE.PlaneGeometry(20, 20);
        const floorMaterial = new THREE.MeshBasicMaterial({color: 0xeaddca, side: THREE.DoubleSide}); // almond color
        return new THREE.Mesh(floorGeometry, floorMaterial);
    }
    
    grids.forEach((grid, index) => {
        if(grid.name.includes("floor")){
            const newFloor = createFloor();
            newFloor.position.copy(grid.position);
            newFloor.rotation.copy(grid.rotation);
            newFloor.rotateX(90 * Math.PI / 180);
            newFloor.name = `floor${index}`;
            scene.add(newFloor);
        }
    });
}

function addNewObject(mesh, modelName, objects){
    // if object name already exists, assign a new name
    if(objects[mesh.name]){
        const counter = objects[mesh.name].counter;
        mesh.name = mesh.name + counter;
        objects[mesh.name] = {
            'modelName': modelName, 
            scale: {x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z}, // note the original scale 
            'mesh': mesh,
            'counter': counter+1,
        };
    }else{
        objects[mesh.name] = {
            'modelName': modelName, 
            scale: {x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z}, // note the original scale 
            'mesh': mesh,
            'counter': 0,
        };
    }    
}

/****

    color picker

****/
function createColorPicker(colorInput){
    const colorWheel = document.createElement('canvas');
    colorWheel.id = "colorWheel";
    colorWheel.setAttribute('width', 150);
    colorWheel.setAttribute('height', 150);

    const colorWheelContext = colorWheel.getContext('2d');
    const x = colorWheel.width / 2;
    const y = colorWheel.height / 2;
    const radius = 60;

    // why 5600??
    for(let angle = 0; angle <= 5600; angle++) {
        const startAngle = (angle - 2) * Math.PI / 180; //convert angles to radians
        const endAngle = (angle) * Math.PI / 180;
        colorWheelContext.beginPath();
        colorWheelContext.moveTo(x, y);
        colorWheelContext.arc(x, y, radius, startAngle, endAngle, false);
        colorWheelContext.closePath();
        const gradient = colorWheelContext.createRadialGradient(x, y, 0, startAngle, endAngle, radius);
        gradient.addColorStop(0, 'hsla(' + angle + ', 10%, 100%, 1)');
        gradient.addColorStop(1, 'hsla(' + angle + ', 100%, 50%, 1)');
        colorWheelContext.fillStyle = gradient;
        colorWheelContext.fill();
    }

    // make black a pickable color 
    colorWheelContext.fillStyle = "rgba(0,0,0,1)";
    colorWheelContext.beginPath();
    colorWheelContext.arc(10, 10, 8, 0, 2*Math.PI);
    colorWheelContext.fill();

    colorWheel.addEventListener('mousedown', (evt) => {
        const x = evt.offsetX;
        const y = evt.offsetY;
        const colorPicked = colorWheel.getContext('2d', {willReadFrequently: true}).getImageData(x, y, 1, 1).data;
        const pickedColor = 'rgb(' + colorPicked[0] + ',' + colorPicked[1] + ',' + colorPicked[2] + ')';
        
        // assumes colorInput is an input of type 'text'
        colorInput.value = pickedColor;
        colorInput.style.border = `2px solid ${pickedColor}`;
    });
    
    return colorWheel;
}

/***

    color input textbox

***/
function createColorInputBox(defaultColor){
    const currColor = document.createElement("input");
    currColor.id = "colorInput";
    currColor.type = "text";
    currColor.value = `rgb(${Math.floor(defaultColor.r * 255)}, ${Math.floor(defaultColor.g * 255)}, ${Math.floor(defaultColor.b * 255)})`;
    currColor.style.border = `2px solid ${currColor.value}`;
    return currColor;
}

function createLightsControls(lightsArray, container, turnOn){
    Array.from(container.children).forEach(child => child.parentNode.removeChild(child));
    
    if(!turnOn){
        return;
    }
    
    // create some controls for each light in lightsArray
    let index = 0;
    lightsArray.forEach(light => {
        const lightName = document.createElement('p');
        lightName.textContent = `directional light ${index}`;
        container.appendChild(lightName);
        
        // control movement
        ['X', 'Y', 'Z'].forEach(axis => {
            // radio buttons for selecting axis to move on
            const moveLightControllerInput = document.createElement('input');
            moveLightControllerInput.type = "radio";
            moveLightControllerInput.id = `moveLightControllerRadio${axis}-${index}`;
            moveLightControllerInput.name = `moveLightController-${index}`;
            moveLightControllerInput.value = axis;
            
            if(axis === 'X') moveLightControllerInput.checked = true;
            
            const moveLightControllerInputLabel = document.createElement('label');
            moveLightControllerInputLabel.for = `moveLightControllerInputRadio${axis}-${index}`;
            moveLightControllerInputLabel.textContent = ` ${axis} axis`;
            
            container.appendChild(moveLightControllerInputLabel);
            container.appendChild(moveLightControllerInput);
        });
        
        // slider for movement
        const moveLightSlider = document.createElement('input');
        moveLightSlider.type = "range";
        moveLightSlider.id = `moveLightSlider${index}`;
        moveLightSlider.name = `moveLightSlider${index}`;
        moveLightSlider.min = "-100";
        moveLightSlider.max = "100";
        moveLightSlider.value = "0";
        moveLightSlider.step = "0.5";
        
        function moveLightSliderEvent(axisRadioInputName){
            return function(evt){
                const axisToMoveOn = document.querySelector(`input[name="${axisRadioInputName}"]:checked`).value;
                const amountToMove = parseFloat(evt.target.value);
                switch(axisToMoveOn){
                    case "X":
                        //console.log(`moving to: (${light.originalPos.x + amountToMove}, ${light.position.y}, ${light.position.z})`);
                        light.position.set(light.originalPos.x + amountToMove, light.position.y, light.position.z);
                        break;
                    case "Y":
                        //console.log(`(${light.position.x}, ${light.originalPos.y + amountToMove}, ${light.position.z})`);
                        light.position.set(light.position.x, light.originalPos.y + amountToMove, light.position.z);
                        break;
                    case "Z":
                        //console.log(`(${light.position.x}, ${light.position.y}, ${light.originalPos.z + amountToMove})`);
                        light.position.set(light.position.x, light.position.y, light.originalPos.z + amountToMove);
                        break;
                }
                // TODO: just update the corresponding lightHelper for this light
                lightHelpers.forEach(x => x.update());
            }
        }
        
        const moveLightSliderEvtFunc = moveLightSliderEvent(`moveLightController-${index}`);
        moveLightSlider.addEventListener('input', moveLightSliderEvtFunc);
        
        const moveLightSliderLabel = document.createElement('label');
        moveLightSliderLabel.for = `moveLightSlider${index}`;
        moveLightSliderLabel.textContent = ": move";
        
        container.appendChild(moveLightSlider);
        container.appendChild(moveLightSliderLabel);
        
        container.appendChild(document.createElement('br'));
        
        /* control rotation
        ['X', 'Y', 'Z'].forEach(axis => {
            const rotateLightControllerInput = document.createElement('input');
            rotateLightControllerInput.type = "radio";
            rotateLightControllerInput.id = `rotateLightRadio${axis}-${index}`;
            rotateLightControllerInput.name = `rotateLightController-${index}`;
            rotateLightControllerInput.value = axis;
            
            if(axis === 'X') rotateLightControllerInput.checked = true;
            
            const rotateLightControllerInputLabel = document.createElement('label');
            rotateLightControllerInputLabel.for = `rotateLightInputRadio${axis}-${index}`;
            rotateLightControllerInputLabel.textContent = ` ${axis} axis`;
            
            container.appendChild(rotateLightControllerInputLabel);
            container.appendChild(rotateLightControllerInput);
        });
        
        //slider for rotation // need to rethink this a bit - do rotation with mousewheel instead? slider is not really good I think for rotations
        const rotateLightSlider = document.createElement('input');
        rotateLightSlider.type = "range";
        rotateLightSlider.id = `rotateLightSlider${index}`;
        rotateLightSlider.name = `rotateLightSlider${index}`;
        rotateLightSlider.min = "-20";
        rotateLightSlider.max = "20";
        rotateLightSlider.value = "0";
        rotateLightSlider.step = "1";
        
        const rotateLightSliderLabel = document.createElement('label');
        rotateLightSliderLabel.for = `rotateLightSlider${index}`;
        rotateLightSliderLabel.textContent = ": rotate";
        
        container.appendChild(rotateLightSlider);
        container.appendChild(rotateLightSliderLabel);
        */
        
        container.appendChild(document.createElement('hr'));
        
        index++;
    });
}

// handle any animated gifs used as images for posters
// https://discourse.threejs.org/t/using-an-animated-gif-as-a-displacement-map-shaders/907/8
function handleAnimatedPoster(poster){
    if(poster.isGif && poster.gifLoaded){
        poster.material.needsUpdate = true;
        poster.material.map.needsUpdate = true;
    }
}





