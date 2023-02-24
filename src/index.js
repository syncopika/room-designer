
const container = document.getElementById("modelCanvas");
const renderer = new THREE.WebGLRenderer({antialias: true, canvas: container});
const fov = 60;
const camera = new THREE.PerspectiveCamera(fov, container.clientWidth / container.clientHeight, 0.01, 1000);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

renderer.setSize(container.clientWidth, container.clientHeight);
renderer.domElement.style.border = '1px solid #000';
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
//renderer.gammaOutput = true;
//renderer.gammaFactor = 2.2;

camera.position.set(0, 10, 28);
scene.add(camera);

const raycaster = new THREE.Raycaster();
const loader = new THREE.GLTFLoader();

// set up trackball control
const controls = new THREE.TrackballControls(camera, renderer.domElement);
controls.rotateSpeed = 1.2;
controls.zoomSpeed = 1.2;
controls.panSpeed = 0.8;

// global vars
const objects = {};
let grids = [];
let lights = [];
let lightHelpers = [];
let lightControl = false;
let wallExists = false;
let floorExists = false;

setupLights(scene, lights, lightHelpers);

// set up grid
// https://stackoverflow.com/questions/56029083/change-width-and-height-of-a-gridhelper-in-three-js
const size = 10;
const divisions = 10;

setupFloorPlan2(grids);


function toggleGrids(){
    grids.forEach(grid => {
        grid.visible = !grid.visible;
    });
}
document.getElementById('toggleGrids').addEventListener('click', toggleGrids);

document.getElementById("addWall").addEventListener('click', () => {
    if(!wallExists){
        addWall(scene, grids);
        wallExists = true;
    }
});

document.getElementById("addFloor").addEventListener('click', () => {
    if(!floorExists){
        addFloor(scene, grids);
        floorExists = true;
    }
});

/* add object
function addSphere(){
    const radius = 3;
    const geometry = new THREE.SphereGeometry(radius, 16, 16);
    const material = new THREE.MeshBasicMaterial({color: 0xffaa00});
    const sphere = new THREE.Mesh(geometry, material);
    sphere.name = "sphere";
    sphere.material.wireframe = true;
    sphere.translateY(radius);
    scene.add(sphere);
    populateCurrSelectedMeshControls(sphere);
    selectedObject = sphere;
}
document.getElementById("addSphere").addEventListener('click', addSphere);
*/

// add image plane
function addImagePlane(parameters=null){
    const planeGeometry = new THREE.PlaneGeometry(10, 13, 1, 1);
    
    // TODO: if gif, use canvastexture
    const texture = new THREE.TextureLoader().load('../examples/cat2.png');
    
    const planeMaterial = new THREE.MeshLambertMaterial({map: texture, side: THREE.DoubleSide});
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.name = "poster";
    scene.add(plane);
    addNewObject(plane, "poster", objects);
    populateCurrSelectedMeshControls(plane);
    selectedObject = plane;
    
    if(parameters){
        if(parameters.position){
            plane.position.copy(parameters.position);
        }
        if(parameters.rotation){
            plane.rotation.copy(parameters.rotation);
        }
        if(parameters.scale){
            plane.scale.copy(parameters.scale);
        }
    }
    
    return plane;
}
document.getElementById('addPoster').addEventListener('click', addImagePlane);


function getModel(modelFilePath, name){
    return new Promise((resolve, reject) => {
        loader.load(
            modelFilePath,
            processGltf(name),
            function(xhr){
                console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
            },
            function(error){
                console.log('An error happened');
                console.log(error);
            }
        );
    });
}

function processMesh(mesh, modelName, parameters){
    if(!mesh.parent){
        //const axesHelper = new THREE.AxesHelper(10);
        //mesh.add(axesHelper);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        scene.add(mesh);
        
        if(parameters){
            if(parameters.position){
                mesh.position.copy(parameters.position);
            }
            if(parameters.rotation){
                mesh.rotation.copy(parameters.rotation);
            }
            if(parameters.scale){
                mesh.scale.copy(parameters.scale);
            }
        }
        
        addNewObject(mesh, modelName, objects);
        populateCurrSelectedMeshControls(mesh);
        selectedObject = mesh;
    }
    
    animate();
}

function processGltf(name, parameters){
    return function(gltf){
        currMeshes = {};

        gltf.scene.traverse((child) => {
            if(child.type === "Mesh" || child.type === "SkinnedMesh"){
                currMeshes[child.name] = {mesh: null, texture: null};
                
                const material = child.material.clone();
                const geometry = child.geometry.clone();
                const obj = new THREE.Mesh(geometry, material);
                
                obj.name = child.name;
                
                currMeshes[child.name].mesh = obj;
                
                currModel = obj;
                currModelTextureMesh = obj;
                
                //if(child.parent) console.log(child.parent);
                if(child.parent && currMeshes[child.parent.name]){
                    currMeshes[child.parent.name].mesh.add(obj);
                }
                
                // reminder that rotation/position/scale fields are immutable: https://github.com/mrdoob/three.js/issues/8940
                obj.rotation.copy(child.rotation);
                obj.position.copy(child.position);
                obj.scale.copy(child.scale);
                
                processMesh(obj, name, parameters);
                
            }else if(child.type === "Object3D" && (child.name.includes("Armature") || child.name.includes("Bone"))){
                const obj3d = new THREE.Object3D();
                obj3d.position.copy(child.position);
                obj3d.rotation.copy(child.rotation);
                obj3d.scale.copy(child.scale);
                obj3d.name = child.name;
                
                currMeshes[child.name] = {mesh: obj3d, texture: null};
                
                if(child.parent && currMeshes[child.parent.name]){
                    currMeshes[child.parent.name].mesh.add(obj3d);
                }
                
                processMesh(obj3d, name, parameters);
            }
        });
    }
}

function importModel(){
    // https://stackoverflow.com/questions/61763757/load-gltf-file-into-a-three-js-scene-with-a-html-input
    // https://stackoverflow.com/questions/64538909/upload-and-preview-gltf-file-3d
    fileHandler();
    
    function fileHandler(){
        let input = document.createElement('input');
        input.type = 'file';
        input.addEventListener('change', getFile, false);
        input.click();
    }
    
    function getFile(e){
        const reader = new FileReader();
        const file = e.target.files[0];
        
        reader.onload = function(evt){
            const gltfText = evt.target.result;
            loader.parse(gltfText, '', processGltf(file.name), (err) => console.log(err)); 
        }
        
        reader.readAsText(file);
    }
}
document.getElementById('importModel').addEventListener('click', importModel);

function selectMesh(ptrEvt){
    const mouseCoords = getCoordsOnMouseClick(ptrEvt);
    raycaster.setFromCamera(mouseCoords, camera);
    
    const intersects = raycaster.intersectObjects(scene.children);
    if(intersects.length > 0){
        for(let intersected of intersects){
            if(intersected.object.name && !intersected.object.name.includes("grid")){
                populateCurrSelectedMeshControls(intersected.object);
                selectedObject = intersected.object;
                
                // indicate which mesh got selected by flashing wireframe
                selectedObject.material.wireframe = true;
                setTimeout(() => {
                    selectedObject.material.wireframe = false;
                }, 300);
                
                break;
            }
        }
    }
    
    renderer.domElement.removeEventListener('pointerdown', selectMesh);
    document.getElementById('selectModel').style.border = '';
}
document.getElementById('selectModel').addEventListener('click', (evt) => {
    document.getElementById('selectModel').style.border = '1px solid #aaffaa';
    renderer.domElement.addEventListener('pointerdown', selectMesh);
});

// direction should be 1 or -1
function rotate(direction){
    return function(evt){
        const selectedAxis = document.querySelector('input[name="rotateController"]:checked');
        if(selectedAxis){
            const rotateAxis = selectedAxis.value;
            if(rotateAxis){
                const rotateVal = 1; // 1 degree increments
                switch(rotateAxis){
                    case "X":
                        selectedObject.rotateX(direction * rotateVal * Math.PI / 180);
                        break;
                    case "Y":
                        selectedObject.rotateY(direction * rotateVal * Math.PI / 180);
                        break;
                    case "Z":
                        selectedObject.rotateZ(direction * rotateVal * Math.PI / 180);
                        break;
                }
            }
        }
   }
}

function rotateWheel(evt){
    // if using mouse wheel, get direction to rotate from scroll
    evt.preventDefault();
    direction = evt.deltaY < 0 ? -1 : 1;
    
    const selectedAxis = document.querySelector('input[name="rotateController"]:checked');
    if(selectedAxis){
        const rotateAxis = selectedAxis.value;
        if(rotateAxis){
            const rotateVal = 1; // 1 degree increments
            switch(rotateAxis){
                case "X":
                    selectedObject.rotateX(direction * rotateVal * Math.PI / 180);
                    break;
                case "Y":
                    selectedObject.rotateY(direction * rotateVal * Math.PI / 180);
                    break;
                case "Z":
                    selectedObject.rotateZ(direction * rotateVal * Math.PI / 180);
                    break;
            }
        }
    }
}

function updatePosterImage(mesh, imageUrl){
    if(imageUrl.includes("/gif")){
        // treat gifs specially
        const loadGifMsg = document.getElementById("loadingGifText");
        loadGifMsg.textContent = "loading gif, this might take a bit...";
        
        mesh.isGif = true;
        mesh.gifImageData = imageUrl;
        
        // using libgif.js
        const img = document.createElement('img');
        img.width = 200;
        img.height = 300;
        //img.setAttribute('rel:auto_play', 0);
        img.src = imageUrl; // base64 gif file
        img.style.display = "none";
        
        img.onload = () => {
            const superGif = new SuperGif({gif: img});
            
            superGif.load(() => {
                mesh.material.map = new THREE.CanvasTexture(superGif.get_canvas());
                loadGifMsg.textContent = "";
                //superGif.play();
            });
        }
    }else{
        const newTexture = new THREE.TextureLoader().load(imageUrl);
        mesh.material.map = newTexture;
        mesh.isGif = false;
    }
    mesh.material.needsUpdate = true;
}

function toggleObjMoveAndRotate(evt){
    moveObject = !moveObject;
    controls.enabled = !moveObject;
    objAcquired = null;
    
    if(moveObject){
        evt.target.style.border = '2px solid #aaffaa';
        renderer.domElement.addEventListener('pointerdown', moveModelStart);
        renderer.domElement.addEventListener('pointermove', moveModelMove);
        renderer.domElement.addEventListener('pointerup', moveModelStop);
        renderer.domElement.addEventListener('wheel', rotateWheel);
    }else{
        evt.target.style.border = '';
        renderer.domElement.removeEventListener('pointerdown', moveModelStart);
        renderer.domElement.removeEventListener('pointermove', moveModelMove);
        renderer.domElement.removeEventListener('pointerup', moveModelStop);
        renderer.domElement.removeEventListener('wheel', rotateWheel);
    }
}

function populateCurrSelectedMeshControls(mesh){
    const container = document.getElementById('currSelectedMeshControls');
    Array.from(container.children).forEach(x => {
        if(x.id === "toggleMoveObject" && moveObject){
            x.click(); // set moveobject to false again before switching over to new object
        }
        x.parentNode.removeChild(x)
    });
    
    const colorChangeContainer = document.getElementById('colorChangeArea');
    Array.from(colorChangeContainer.children).forEach(x => x.parentNode.removeChild(x));
    
    const meshName = document.createElement('p');
    meshName.style.fontWeight = 'bold';
    meshName.style.margin = "0";
    meshName.textContent = "selected mesh name: " + mesh.name;
    container.appendChild(meshName);
    
    container.appendChild(document.createElement('br'));
    
    // control movement
    const toggleMoveObjectBtn = document.createElement('button');
    toggleMoveObjectBtn.id = "toggleMoveObject";
    toggleMoveObjectBtn.textContent = "toggle object move/rotate";
    
    toggleMoveObjectBtn.addEventListener('click', toggleObjMoveAndRotate);
    container.appendChild(toggleMoveObjectBtn);
    
    ["horizontal", "vertical"].forEach(dir => {
        const moveDirInput = document.createElement('input');
        moveDirInput.type = "radio";
        moveDirInput.id = dir;
        moveDirInput.name = "moveDirection";
        moveDirInput.value = dir;
        
        if(dir === "horizontal") moveDirInput.checked = true;
        
        const moveDirInputLabel = document.createElement('label');
        moveDirInputLabel.for = dir;
        moveDirInputLabel.textContent = dir;
        container.appendChild(moveDirInput);
        container.appendChild(moveDirInputLabel);
    });
    
    container.appendChild(document.createElement('br'));
    container.appendChild(document.createElement('br'));
    
    // rotation via button
    const rotateLeftButton = document.createElement('button');
    rotateLeftButton.textContent = "rotate -";
    container.appendChild(rotateLeftButton);
    rotateLeftButton.addEventListener('pointerdown', rotate(-1));
    
    const rotateRightButton = document.createElement('button');
    rotateRightButton.textContent = "rotate +";
    container.appendChild(rotateRightButton);
    rotateRightButton.addEventListener('pointerdown', rotate(1));

    ['X', 'Y', 'Z'].forEach(axis => {        
        const rotateControllerInput = document.createElement('input');
        rotateControllerInput.type = "radio";
        rotateControllerInput.id = `rotateControllerRadio${axis}`;
        rotateControllerInput.name = `rotateController`;
        rotateControllerInput.value = axis;
        
        if(axis === 'Y') rotateControllerInput.checked = true;
        
        const rotateControllerInputLabel = document.createElement('label');
        rotateControllerInputLabel.for = `rotateControllerInputRadio${axis}`;
        rotateControllerInputLabel.textContent = ` ${axis} axis`;
        
        container.appendChild(rotateControllerInputLabel);
        container.appendChild(rotateControllerInput);
    });
    
    container.appendChild(document.createElement('br'));
    container.appendChild(document.createElement('br'));
    
    // control scale    
    const scaleControllerInput = document.createElement('input');
    scaleControllerInput.type = "range";
    scaleControllerInput.id = "scaleControllerInput";
    scaleControllerInput.name = "scaleControllerInput";
    scaleControllerInput.min = "0.1";
    scaleControllerInput.max = "20";
    scaleControllerInput.value = "1";
    scaleControllerInput.step = "0.1";
    scaleControllerInput.addEventListener('input', (evt) => {
        const axis = document.querySelector('input[name="scaleAxisControllerInput"]:checked').value;
        const scaleVal = parseFloat(evt.target.value);
        
        if(axis === "all"){
            if(objects[mesh.name]){
                const originalMeshScale = objects[mesh.name].scale;
                mesh.scale.set(
                    originalMeshScale.x * scaleVal,
                    originalMeshScale.y * scaleVal,
                    originalMeshScale.z * scaleVal
                );
            }else{
                 mesh.scale.set(scaleVal, scaleVal, scaleVal);
            }
        }else if(axis === "X"){
            if(objects[mesh.name]){
                const originalMeshScale = objects[mesh.name].scale;
                mesh.scale.set(
                    originalMeshScale.x * scaleVal,
                    mesh.scale.y,
                    mesh.scale.z
                );
            }else{
                 mesh.scale.set(scaleVal, mesh.scale.y, mesh.scale.z);
            }
        }else if(axis === "Y"){
            if(objects[mesh.name]){
                const originalMeshScale = objects[mesh.name].scale;
                mesh.scale.set(
                    mesh.scale.x,
                    originalMeshScale.y * scaleVal,
                    mesh.scale.z
                );
            }else{
                 mesh.scale.set(mesh.scale.x, scaleVal, mesh.scale.z);
            }
        }else if(axis === "Z"){
            if(objects[mesh.name]){
                const originalMeshScale = objects[mesh.name].scale;
                mesh.scale.set(
                    mesh.scale.x,
                    mesh.scale.y,
                    originalMeshScale.z * scaleVal
                );
            }else{
                 mesh.scale.set(mesh.scale.x, mesh.scale.y, scaleVal);
            }
        }
        
        // to prevent having the user need to adjust the vertical position of the object (assuming it should be at least floor-level)
        // when scaling, do the adjusting here
        // TODO: note that this can be problematic though if an object has been placed on another object - we don't necessarily want the height
        // to change in that case so translateY should maybe be dependent on the height difference of whatever gets hit first when doing a downward raycast
        const bbox = new THREE.Box3().setFromObject(mesh);
        mesh.translateY(-bbox.min.y);
    });
    
    const scaleControllerInputLabel = document.createElement('label');
    scaleControllerInputLabel.for = "scaleControllerInput";
    scaleControllerInputLabel.textContent = "scale: ";
    
    container.appendChild(scaleControllerInputLabel);
    container.appendChild(scaleControllerInput);
    
    ['X', 'Y', 'Z', 'all'].forEach(axis => {
        const scaleAxisControllerInput = document.createElement('input');
        scaleAxisControllerInput.type = "radio";
        scaleAxisControllerInput.id = `rotateControllerRadio${axis}`;
        scaleAxisControllerInput.name = `scaleAxisControllerInput`;
        scaleAxisControllerInput.value = axis;
        
        if(axis === 'all') scaleAxisControllerInput.checked = true;
        
        const scaleAxisControllerInputLabel = document.createElement('label');
        scaleAxisControllerInputLabel.for = `scaleAxisControllerInput${axis}`;
        scaleAxisControllerInputLabel.textContent = ` ${axis} axis`;
        
        container.appendChild(scaleAxisControllerInputLabel);
        container.appendChild(scaleAxisControllerInput);
    });
    
    // checkbox for toggling helper axes
    container.appendChild(document.createElement('br'));
    container.appendChild(document.createElement('br'));
    
    const toggleHelperAxes = document.createElement('input');
    toggleHelperAxes.type = "checkbox";
    toggleHelperAxes.name = "toggleHelperAxes";
    toggleHelperAxes.checked = mesh.axesHelper ? mesh.axesHelper.visible === true : false;
    toggleHelperAxes.addEventListener('input', (evt) => {
        const showAxes = evt.target.checked;
        if(!mesh.axesHelper){
            mesh.axesHelper = new THREE.AxesHelper(8);
            mesh.add(mesh.axesHelper);
        }
        mesh.axesHelper.visible = showAxes;
    });
    
    const toggleHelperAxesLabel = document.createElement('label');
    toggleHelperAxesLabel.textContent = "toggle helper axes";
    toggleHelperAxesLabel.for = "toggleHelperAxes";
    
    container.appendChild(toggleHelperAxesLabel);
    container.appendChild(toggleHelperAxes);
    
    // delete option
    const deleteBtn = document.createElement('button');
    deleteBtn.id = "delete";
    deleteBtn.textContent = "delete";
    deleteBtn.style.color = "#ff0000";
    deleteBtn.addEventListener('click', () => {
        if(mesh.name !== selectedObject.name){
            console.log("mesh to delete doesn't match selectedObject!");
            return;
        }
        
        if(objects[mesh.name]) delete objects[mesh.name];
        mesh.parent.remove(mesh);
        selectedObject = null;
        
        Array.from(container.children).forEach(x => {
            if(x.id === "toggleMoveObject" && moveObject){
                x.click(); // set moveobject to false again before switching over to new object
            }
            x.parentNode.removeChild(x)
        });

        renderer.domElement.removeEventListener('pointerdown', moveModelStart);
        renderer.domElement.removeEventListener('pointermove', moveModelMove);
        renderer.domElement.removeEventListener('pointerup', moveModelStop);
        renderer.domElement.removeEventListener('wheel', rotateWheel);
        
        for(let child of document.getElementById("colorChangeArea").children){
            child.parentNode.removeChild(child);
        }
    });
    
    // if it's a poster, allow the user to change image
    // TODO: if it's a poster, allow the user to add a frame for it?
    if(mesh.name.includes("poster")){
        container.appendChild(document.createElement('br'));
        container.appendChild(document.createElement('br'));

        const changeImageBtn = document.createElement('button');
        changeImageBtn.textContent = "change image";
        
        const loadingGifText = document.createElement('p');
        loadingGifText.id = "loadingGifText";
        container.appendChild(loadingGifText);
        
        changeImageBtn.addEventListener('click', (evt) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.addEventListener('change', getFile, false);
            input.click();
            
            function getFile(e){
                const img = new Image();
                const reader = new FileReader();
                const file = e.target.files[0];
                
                if(!file.type.match(/image.*/)){
                    console.log("not a valid image");
                    return;
                }
                
                reader.onloadend = function(){
                    updatePosterImage(mesh, reader.result);
                };
                reader.readAsDataURL(file);
            }
        });
        container.appendChild(changeImageBtn);
    }
    
    if(mesh.name.includes("wall") || mesh.name.includes("floor")){
        // add some color change options
        const colorChangeArea = document.getElementById("colorChangeArea");
        
        const changeWallColorBtn = document.createElement('button');
        changeWallColorBtn.textContent = "change wall color";
        
        const color = mesh.material.color;
        const currColor = document.createElement("input");
        currColor.id = "colorInput";
        currColor.type = "text";
        currColor.value = `rgb(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)})`;
        currColor.style.border = `2px solid ${currColor.value}`;
        
        changeWallColorBtn.addEventListener('click', () => {
            const selectedColor = currColor.value.match(/([0-9]+)/g);
            mesh.material.color.r = selectedColor[0] / 255;
            mesh.material.color.g = selectedColor[1] / 255;
            mesh.material.color.b = selectedColor[2] / 255;
        });
        
        // add color picker
        const colorWheel = createColorPicker();
        
        colorChangeArea.appendChild(colorWheel);
        colorChangeArea.appendChild(document.createElement('br'));
        colorChangeArea.appendChild(currColor);
        colorChangeArea.appendChild(changeWallColorBtn);
    }

    container.appendChild(document.createElement('br'));
    container.appendChild(document.createElement('br'));
    container.appendChild(deleteBtn);
}

function getModelFromSelect(modelFilePath, name, parameters=null){
    return new Promise((resolve, reject) => {
        loader.load(
            modelFilePath,
            processGltf(name, parameters),
            // called while loading is progressing
            function(xhr){
                console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
            },
            // called when loading has errors
            function(error){
                console.log('An error happened');
                console.log(error);
            }
        );
    });
}
document.getElementById('addModel').addEventListener('click', () => {
    const selected = document.getElementById('selectModelToAdd').value;
    getModelFromSelect(`models/${selected}.gltf`, selected);
});

function save(){
    // TODO: capture any lighting, wall/floor properties as well
    let name = prompt("name of file: ");
    if(name === ""){
        const date = new Date(); 
        name = date.toISOString() + "_roomDesigner_saveFile";
    }else if(name === null){
        return;
    }
    
    const savedData = [];
    
    for(let obj in objects){
      const theMesh = objects[obj];
      const objData = {
        "name": theMesh.modelName,
        "position": theMesh.mesh.position,
        "rotation": theMesh.mesh.rotation,
        "scale": theMesh.mesh.scale,
      };
      
      if(theMesh.modelName === "poster"){
          if(!theMesh.mesh.isGif){
            objData["image"] = theMesh.mesh.material.map.image.currentSrc;
          }else{
            objData["image"] = theMesh.mesh.gifImageData; // expect base64 gif file
          }
      }
      
      savedData.push(objData);
    }
    
    const json = JSON.stringify(savedData, null, 2);
    
    // make a blob so it can be downloaded 
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name + ".json";
    link.click();
}
document.getElementById("save").addEventListener('click', save);

function loadObjectsFromData(data){
    // clear scene first
    for(let obj in objects){
        const mesh = objects[obj].mesh;
        scene.remove(mesh);
        delete objects[obj];
    }
    
    const objsAvailForImport = Array.from(document.querySelectorAll('.modelOptions')).map(x => x.value);
    data.forEach(obj => {
        if(objsAvailForImport.includes(obj.name)){
            getModelFromSelect(`models/${obj.name}.gltf`, obj.name, {
                position: obj.position, 
                rotation: obj.rotation, 
                scale: obj.scale,
            });
        }else if(obj.name === "poster"){
            const newPoster = addImagePlane({
                position: obj.position, 
                rotation: obj.rotation, 
                scale: obj.scale,
                image: obj.image,
            });
            updatePosterImage(newPoster, obj.image);
        }
    });
}

function importProject(){
    function getFile(e){
        const reader = new FileReader();
        const file = e.target.files[0];
        reader.onload = (function(theFile){
            return function(e){
                let data;
                try {
                    data = JSON.parse(e.target.result);
                    loadObjectsFromData(data);
                }catch(e){
                    console.log("import failed: not a valid JSON file");
                    console.log(e);
                    return;
                }
            };
        })(file);
        reader.readAsText(file);
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.addEventListener('change', getFile, false);
    input.click();
}
document.getElementById("import").addEventListener('click', importProject);

async function loadExampleProject(filename){
    const file = await fetch(filename);
    const data = await file.json();
    loadObjectsFromData(data);
}
document.getElementById('selectExampleBtn').addEventListener('click', () => {
    const selected = document.getElementById('selectExample').value;
    loadExampleProject(`examples/${selected}.json`);
});

function setupLightsController(evt){
    lightControl = !lightControl;
    createLightsControls(lights, document.getElementById('lightControls'), lightControl);
    
    lightHelpers.forEach(lightHelper => {
        lightHelper.visible = !lightHelper.visible;
    });
}
document.getElementById('lightControlBtn').addEventListener('click', setupLightsController);

function animate(){
    requestAnimationFrame(animate);
    controls.update();
    
    // handle any poster gifs
    for(let obj in objects){
        if(obj.includes("poster")){
            handleAnimatedPoster(objects[obj].mesh);
        }
    }
    
    renderer.render(scene, camera);
}

animate();

