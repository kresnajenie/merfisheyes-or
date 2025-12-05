import './Overlay.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { SceneState } from '../../states/SceneState';
import { ButtonState } from '../../states/ButtonState';

export function createOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'overlay';
    overlay.className = 'overlay';
    overlay.setAttribute('display_type', 'maximize')

    // Create a container for top controls
    const topControls = document.createElement('div');
    topControls.className = 'top-controls';
    
    // TODO: Can be abstracted out into a separate function
    // Creates minimize maximize button
    const minimizeButton = document.createElement('img');
    minimizeButton.className = 'min_max_button';
    minimizeButton.id = 'maximize' // determines the state of the overlay
    minimizeButton.src = '/overlay_controls/minimize.png'

    // Toggle overlay minimize maximize state
    minimizeButton.onclick = (event) => {
        // Update button state
        const button = event.target;
        const overlay_state = button.id;
        let new_state = "";
        if (overlay_state === 'maximize') {
            new_state = 'minimize';
        } else {
            new_state = 'maximize';
        }
        button.id = new_state;
        // Use the old state to make the icon the opposite of the state
        button.src = `/overlay_controls/${overlay_state}.png`;
        
        // Hide circles
        const circles = document.querySelectorAll('.circle');
        circles.forEach((circle) => {
            if (new_state == 'minimize') {
                circle.style.display = 'none';
            } else {
                circle.style.display = 'block';
            }
        })
        
        // Update overlay state
        if (overlay_state === 'maximize') {
            overlay.style.transform = 'translateX(90%)';
        } else {
            overlay.style.transform = 'translateX(0%)';
        }
        overlay.setAttribute('display_type', new_state)
    }

    topControls.appendChild(minimizeButton);

    // Append the top controls container to the overlay
    overlay.appendChild(topControls);

    const sceneContainer = document.createElement('div');
    sceneContainer.id = 'overlayScene';
    sceneContainer.style.width = '100%';
    sceneContainer.style.height = '100%';
    overlay.appendChild(sceneContainer);

    // Initialize the Three.js scene
    // const scene = new THREE.Scene();
    const scene = SceneState.value.scene;
    const camera = new THREE.PerspectiveCamera(75, sceneContainer.offsetWidth / sceneContainer.offsetHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    
    // Calculate dimensions based on the viewport size
    const initialWidth = window.innerWidth * 0.25; // 25% of the viewport width
    const initialHeight = window.innerHeight * 0.5; // 50% of the viewport height

    camera.aspect = initialWidth / initialHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(initialWidth, initialHeight);
    
    renderer.render(scene, camera);
    sceneContainer.appendChild(renderer.domElement);

    camera.position.x = 10000;
    camera.position.z = 150;

    // Add orbit controls to the camera
    const controls = new OrbitControls(camera, renderer.domElement);

    // Disable the rotation of the camera
    controls.enableRotate = false;

    // Set left mouse button for panning instead of rotating
    controls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE
    };

    controls.touches = {
        ONE: THREE.TOUCH.PAN,
        TWO: THREE.TOUCH.DOLLY_PAN
    }

    // Make the camera look at the object
    camera.lookAt(10000, 0, 10);

    // Set the controls target to the position you want the camera to focus on
    controls.target.set(10000, 0, 10);

    // Update the controls to apply the changes
    controls.update();
    renderer.render(scene, camera);

    function animate() {
        requestAnimationFrame(animate);
        // controls.update();
        renderer.render(scene, camera);
    }

    animate();

    // if clips out of bounds
    window.addEventListener('resize', () => {
        keepInBounds()
    })

    return overlay;
}

document.body.appendChild(createOverlay());