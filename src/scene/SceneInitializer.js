// /src/components/SceneInitializer.js
import * as THREE from "three";
import { MatrixState } from "../states/MatrixState.js";
import { ApiState } from "../states/ApiState.js";
import { SceneState } from "../states/SceneState.js";
import { UIState, updateLoadingState } from "../states/UIState.js";
import { SelectedState } from "../states/SelectedState.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { isEqual } from "lodash";
import { map, distinctUntilChanged } from "rxjs/operators";
import {
  ButtonState,
  updateGeneExpressionRange,
} from "../states/ButtonState.js";
import { loading } from "../helpers/Loading.js";
import {
  showCellFilters,
  updateCelltypeCheckboxes,
} from "../helpers/Filtering/Celltype.js";
import {
  calculateGenePercentile,
  coolwarm,
  getGene,
  normalizeArray,
} from "../helpers/GeneFunctions.js";
import {
  showGeneFilters,
  showSelectedGeneFilters,
} from "../helpers/Filtering/Gene.js";
import { changeURL } from "../helpers/URL.js";
import {
  updateBadge,
  updateCelltypeBadge,
  updateCelltypeBadgeApperance,
} from "../ui/Showing/Showing.js";
import {
  hideColorbar,
  hideColorbarGreen,
  hideColorbarMagenta,
  setLabels,
  setLabelsGreen,
  setLabelsMagenta,
  showColorbar,
  showColorbarGreen,
  showColorbarMagenta,
} from "../ui/ColorBar/ColorBar.js";

const url = new URL(window.location);
const params = new URLSearchParams(url.search);

export class SceneInitializer {
  constructor(container) {
    this.container = container;
    this.instancedMesh;
    this.instancedMeshUmap;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.hoveredPoint = null;
    this.tooltip = this.createTooltip();
    this.lastCameraPosition = new THREE.Vector3();
    this.initScene();
    this.subscribeToStateChanges();
    this.setupEventListeners();
  }

  initScene() {
    // this.scene = new THREE.Scene();
    this.scene = SceneState.value.scene;

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    );

    // Create renderer with minimal settings to avoid color processing
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      preserveDrawingBuffer: true,
    });

    // Set renderer properties for accurate color reproduction
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    // Use linear color space to avoid sRGB conversion
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.container.appendChild(this.renderer.domElement);

    if (ApiState.value.prefix == "ob") {
      this.camera.position.x = ButtonState.value.cameraPositionX;
      this.camera.position.y = ButtonState.value.cameraPositionY;
      this.camera.position.z = ButtonState.value.cameraPositionZ;
      // Add directional labels to help with orientation
      this.addText("Dorsal", 170, 50, 130);
      this.addText("Ventral", -210, -50, -170);
      this.addText("Posterior", 100, -50, -200);

      // Example of rotated text (angles in radians)
      // Math.PI/2 = 90 degrees, Math.PI = 180 degrees, etc.
      this.addText("Anterior", -180, -50, 80, 50, "white", "Bold 450px Arial");
      this.addText("Lateral", 0, -200, 0, 50, "white", "Bold 450px Arial");
      this.addText("Medial", -50, 130, -50, -50, "white", "Bold 450px Arial");
    } else {
      this.camera.position.x = 0;
      this.camera.position.y = 0;
      this.camera.position.z = 300;
    }
    // Get the target point directly from ButtonState
    const targetPoint = new THREE.Vector3(
      ButtonState.value.targetX,
      ButtonState.value.targetY,
      ButtonState.value.targetZ
    );

    // Set the camera to look at this target point
    this.camera.lookAt(targetPoint);

    // Save the target point to use with controls later
    this.cameraTargetPoint = targetPoint.clone();

    const axesHelper = new THREE.AxesHelper(1000); // The argument specifies the size of the axes lines.
    // this.scene.add( axesHelper );

    // this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.prefix = ApiState.value.prefix;
    if (this.prefix == "ob") {
      this.controls = new TrackballControls(
        this.camera,
        this.renderer.domElement
      );
    } else {
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      // Disable rotation
      this.controls.enableRotate = false;

      // Set panning to left mouse button
      this.controls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE,
      };

      this.controls.enableZoomToCursor = true;

      // Set the controls target to match the camera's look-at point
      // This ensures the orbit controls rotate around the correct point
      if (this.cameraTargetPoint) {
        this.controls.target.copy(this.cameraTargetPoint);
      }

      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.25;
    }

    this.controls.update();
    this.jsonData = MatrixState.value.items;
    this.pallete = ApiState.value.pallete;

    this.updateInstancedMesh();
    this.createPointsGeometry();

    this.animate();

    window.addEventListener(
      "resize",
      () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      },
      false
    );
  }

  subscribeToStateChanges() {
    MatrixState.pipe(
      map((state) => state.items),
      // If you want to deep compare array objects, you might replace the next line with a custom comparison function
      distinctUntilChanged((prev, curr) => isEqual(prev, curr))
    ).subscribe((items) => {
      console.log("Items have updated:");
      // console.log(MatrixState.value.items);
      // Here you can handle the update, e.g., update UI components to reflect the new items array
    });

    // Subscribe to dot size changes to update the shader uniform
    ButtonState.pipe(
      map((state) => state.dotSize),
      distinctUntilChanged()
    ).subscribe((dotSize) => {
      console.log("Dot size changed:", dotSize);
      // Update the shader uniform if the material exists
      if (
        this.pointsMeshSpatial &&
        this.pointsMeshSpatial.material.uniforms.dotSize
      ) {
        this.pointsMeshSpatial.material.uniforms.dotSize.value = dotSize;
        this.pointsMeshUMAP.material.uniforms.dotSize.value = dotSize;
      }
    });

    ApiState.pipe(
      map((state) => state.prefix),
      distinctUntilChanged((prev, curr) => isEqual(prev, curr))
    ).subscribe((items) => {
      console.log("Prefix changed:", items);
      // console.log(ApiState.value.prefix);

      const prefix = document.getElementById("dropdownMenuButton");

      // Find the display name for the current prefix value
      const currentPrefix = ApiState.value.prefix;
      // Get the display name by finding the key in prefixMapping that has the current prefix as its value
      const displayName =
        Object.keys(ApiState.value.prefixMapping).find(
          (key) => ApiState.value.prefixMapping[key] === currentPrefix
        ) || currentPrefix; // Fallback to the prefix value if no mapping is found

      prefix.innerText = displayName;
    });

    UIState.pipe(
      map((state) => state.isLoading),
      distinctUntilChanged((prev, curr) => isEqual(prev, curr))
    ).subscribe((items) => {
      console.log("Loading changed:", items);
      // console.log(UIState.value.isLoading);

      loading(UIState.value.isLoading);
    });

    // listens for changing celltype
    SelectedState.pipe(
      map((state) => state.selectedCelltypes),
      distinctUntilChanged((prev, curr) => prev.join() === curr.join())
    ).subscribe(async (items) => {
      console.log("Selected celltypes changed:", items);
      // console.log(SelectedState.value.selectedCelltypes);

      updateLoadingState(true);

      this.updateCelltype();

      updateLoadingState(false);

      showCellFilters();

      if (SelectedState.value.selectedCelltypes.length > 0) {
        const newCelltype = encodeURIComponent(
          JSON.stringify(SelectedState.value.selectedCelltypes)
        );

        // params not in celltype
        if (params.has("celltype")) {
          params.set("celltype", newCelltype);
        } else {
          params.append("celltype", newCelltype);
        }

        // there's no celltypes selected
      } else {
        params.delete("celltype");
      }

      changeURL(params);
    });

    SelectedState.pipe(
      map((state) => state.selectedGenes),
      distinctUntilChanged((prev, curr) => prev.join() === curr.join())
    ).subscribe(async (items) => {
      console.log("Selected genes changed:", items);
      // console.log(SelectedState.value.selectedGenes);

      if (SelectedState.value.mode === 2) {
        showSelectedGeneFilters();
      }

      updateLoadingState(true);

      this.updateGene();

      // if (SelectedState.value.selectedGenes) {
      //     await this.updateInstancedMesh(SelectedState.value.selectedGenes);
      // } else {
      //     await this.updateInstancedMesh([]);
      // }

      updateLoadingState(false);
      updateCelltypeBadgeApperance();

      showGeneFilters();

      if (SelectedState.value.selectedGenes.length > 0) {
        // hype boy
        const newGenes = encodeURIComponent(
          JSON.stringify(SelectedState.value.selectedGenes)
        );
        params.append("gene", newGenes);

        // params not in celltype
        if (params.has("gene")) {
          params.set("gene", newGenes);
        } else {
          params.append("gene", newGenes);
        }

        // there's no genes selected
      } else {
        params.delete("gene");
      }

      changeURL(params);
    });

    SelectedState.pipe(
      map((state) => state.mode),
      distinctUntilChanged()
    ).subscribe((items) => {
      console.log("Selected genes changed:", items);

      if (params.has("mode")) {
        params.set("mode", items);
      } else {
        params.append("mode", items);
      }

      changeURL(params);
    });

    // listen for changing dotsize
    ButtonState.pipe(
      map((state) => state.dotSize),
      distinctUntilChanged()
    ).subscribe(async (items) => {
      console.log("Dot Size Changed:", items);
      // console.log(ButtonState.value.dotSize);

      updateLoadingState(true);

      if (ButtonState.value.dotSize) {
        await this.updateInstancedMesh(ButtonState.value.dotSize);
      } else {
        await this.updateInstancedMesh([]);
      }

      updateLoadingState(false);
    });

    ButtonState.pipe(
      map((state) => state.genePercentile),
      distinctUntilChanged()
    ).subscribe(async (items) => {
      console.log("Gene Percentile", items);
      // console.log(ButtonState.value.genePercentile);

      updateLoadingState(true);

      if (ButtonState.value.genePercentile) {
        await this.updateInstancedMesh(ButtonState.value.genePercentile);
      } else {
        await this.updateInstancedMesh([]);
      }

      updateLoadingState(false);
    });

    // Subscribe to changes in the gene expression slider value
    ButtonState.pipe(
      map((state) => state.currentGeneValue),
      distinctUntilChanged()
    ).subscribe((currentGeneValue) => {
      // Only update if we have genes selected and the slider value is valid
      if (
        SelectedState.value.selectedGenes.length > 0 &&
        currentGeneValue > 0
      ) {
        console.log("Gene slider value changed to:", currentGeneValue);
        this.updateGene(true);
      }
    });
  }
  async updateInstancedMesh(filterType = []) {
    console.log("Updating instanced mesh with filter type:", filterType);
  }

  async updateGene(isGeneChanged = false) {
    const genes = SelectedState.value.selectedGenes;
    if (genes.length == 0) {
      this.updateCelltype([]);
      return;
    }
    // when plotting gene
    let ctsClipped1;
    let ctsClipped2;

    // Get gene percentile value from state
    let genePercentile = ButtonState.value.genePercentile; // Default 99th percentile

    let nmax1 = 1;
    let minValue = 0;
    let absoluteMaxValue = 0;

    if (genes.length > 0) {
      try {
        let count1 = await getGene(genes[0]);
        console.log("Gene count1", count1.length);
        console.log("Gene count1", count1);

        // Count how many values are equal to 0
        const zeroCount = count1.filter((value) => value === 0).length;
        console.log("Number of zero values:", zeroCount);

        // Calculate the 80th percentile value
        minValue = calculateGenePercentile(count1, 0.8);

        // Calculate the 99th percentile value (for initial visualization)
        nmax1 = calculateGenePercentile(count1, genePercentile);

        // Calculate the 100th percentile (absolute maximum)
        // Use a safer approach to find the maximum value to avoid stack overflow
        absoluteMaxValue = count1.reduce(
          (max, val) => (val > max ? val : max),
          0
        );

        // Check if we have a user-set value to use instead of the default 99th percentile
        if (ButtonState.value.currentGeneValue > 0 && isGeneChanged) {
          nmax1 = ButtonState.value.currentGeneValue;
        }

        console.log("Gene Percentile", genePercentile);
        console.log("nmax1", nmax1);

        // Use the selected value for visualization
        ctsClipped1 = normalizeArray(count1, nmax1);

        if (genes.length == 2) {
          let count2 = await getGene(genes[1]);
          let nmax2 = calculateGenePercentile(count2, genePercentile);
          ctsClipped2 = normalizeArray(count2, nmax2);

          // Make sure setLabelsMagenta is defined before calling it
          if (typeof setLabelsMagenta === "function") {
            setLabelsMagenta(0, nmax2);
          }
        }

        // Store the actual calculated range values in the state
        updateGeneExpressionRange(minValue, nmax1, absoluteMaxValue);

        // Update badges and colorbars based on the number of genes
        if (genes.length > 0) {
          updateBadge("gene", genes);
          if (genes.length > 1) {
            showColorbarGreen();
            showColorbarMagenta();
            hideColorbar();
          } else {
            showColorbar();
            hideColorbarGreen();
            hideColorbarMagenta();
          }
        } else {
          updateBadge("celltype");
          hideColorbar();
          hideColorbarGreen();
          hideColorbarMagenta();
        }

        // Update celltype-related UI elements
        updateCelltypeBadge();
        updateCelltypeCheckboxes();
        updateCelltypeBadgeApperance();
      } catch (error) {
        // Handle errors if the promise is rejected
        console.error("Error fetching data:", error);
      }
    }

    setLabels(0, nmax1);
    setLabelsGreen(0, nmax1);

    // Get dot size parameters from ButtonState
    const dotSize = ButtonState.value.dotSize;

    const hexColors = [];
    const sizes = [];
    const alphas = [];

    // Calculate scaling factors based on the current dot size
    const MIN_SIZE = dotSize / 20;
    const MAX_SIZE = dotSize / 4;

    // Scale function to map gene expression values to point sizes
    const scale = (value) => {
      return MIN_SIZE + (MAX_SIZE - MIN_SIZE) * value;
    };
    for (let i = 0; i < this.jsonData.length; i++) {
      if (this.jsonData[i]["clusters"] != "" && this.prefix == "ob") {
        hexColors.push("#000000");
        sizes.push(-1);
        alphas.push(-1);
        continue;
      }
      if (genes.length == 1) {
        const val = coolwarm(ctsClipped1[i]);
        hexColors.push(val);
      } else {
        const val = coolwarm(ctsClipped1[i], ctsClipped2[i]);
        hexColors.push(val);
      }
      sizes.push(1);
      alphas.push(1);
    }

    this.updateColors(hexColors);
    this.updateScales(sizes);
    this.updateAlphas(alphas);
  }

  rgbToHex(rgbColors) {
    const hexColors = [];
    const hexDigits = "0123456789ABCDEF";

    for (let i = 0; i < rgbColors.length; i += 3) {
      // Get RGB values (0-255)
      const r = Math.round(rgbColors[i] * 255);
      const g = Math.round(rgbColors[i + 1] * 255);
      const b = Math.round(rgbColors[i + 2] * 255);

      // Calculate hex values using division by 16
      // R/16 = x + y/16 where x is quotient and y is remainder
      const rQuotient = Math.floor(r / 16);
      const rRemainder = r % 16;

      const gQuotient = Math.floor(g / 16);
      const gRemainder = g % 16;

      const bQuotient = Math.floor(b / 16);
      const bRemainder = b % 16;

      // Convert to hex digits (0-9, A-F)
      const rHex = hexDigits[rQuotient] + hexDigits[rRemainder];
      const gHex = hexDigits[gQuotient] + hexDigits[gRemainder];
      const bHex = hexDigits[bQuotient] + hexDigits[bRemainder];

      hexColors.push(`#${rHex}${gHex}${bHex}`);
    }
    return hexColors;
  }

  async updateCelltype() {
    const celltypes = SelectedState.value.selectedCelltypes;
    const grey = "#1c1c1c";

    if (celltypes.length > 0) {
      const hexColors = this.jsonData.map((point) => {
        const clusterValue = point["clusters"];
        // Use the palette color for this cluster, or a default gray if not found
        if (clusterValue === "") return "#000000";
        return celltypes.includes(clusterValue)
          ? this.pallete[clusterValue]
          : grey;
      });

      const sizes = this.jsonData.map((point) => {
        const clusterValue = point["clusters"];
        if (clusterValue === "") return -1;
        return celltypes.includes(clusterValue) ? 2 : 0.5;
      });

      const alphas = this.jsonData.map((point) => {
        const clusterValue = point["clusters"];
        if (clusterValue === "") return -1;
        if (this.prefix == "moe") {
          return celltypes.includes(clusterValue) ? 1 : 0;
        }
        return celltypes.includes(clusterValue) ? 1 : 0.5;
      });

      console.log("Celltypes selected without genes");
      this.updateColors(hexColors);
      this.updateScales(sizes);
      this.updateAlphas(alphas);
      // Update badges and colorbars
      updateBadge("celltype", celltypes);
      hideColorbar();
      hideColorbarGreen();
      hideColorbarMagenta();

      const alphasBg = this.jsonData.map((point) => {
        return 1;
      });
      this.updateAlphas(alphasBg, "bg");
    } else {
      const hexColors = this.jsonData.map((point) => {
        const clusterValue = point["clusters"];
        if (clusterValue === "") return "#000000";
        // Use the palette color for this cluster, or a default gray if not found
        return this.pallete[clusterValue] || grey;
      });
      console.log("No celltypes selected without genes");
      const sizes = this.jsonData.map((point) => {
        const clusterValue = point["clusters"];
        if (clusterValue === "") return -1;
        if (this.prefix == "moe") return 1;
        return 2;
      });

      const alphas = this.jsonData.map((point) => {
        const clusterValue = point["clusters"];
        if (clusterValue === "") return -1;
        else return 1;
      });

      this.updateColors(hexColors);
      this.updateScales(sizes);
      this.updateAlphas(alphas);

      const alphasBg = this.jsonData.map((point) => {
        return 0;
      });
      this.updateAlphas(alphasBg, "bg");

      // Update badges and colorbars
      updateBadge("celltype");
      hideColorbar();
      hideColorbarGreen();
      hideColorbarMagenta();
    }

    // Update celltype-related UI elements
    updateCelltypeBadge();
    updateCelltypeCheckboxes();
    updateCelltypeBadgeApperance();
  }

  async createPointsGeometry() {
    console.log(this.jsonData);
    const count = this.jsonData.length;

    // Create buffer geometry
    const geometrySpatial = new THREE.BufferGeometry();
    const geometrySpatialBg = new THREE.BufferGeometry();
    // const geometryUMAP = new THREE.BufferGeometry();

    // Create position buffer
    const positionsSpatial = new Float32Array(count * 3);
    const positionsSpatialBg = new Float32Array(count * 3);
    // const positionsUMAP = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const alphas = new Float32Array(count);

    // Fill position and color buffers
    this.jsonData.forEach((point, i) => {
      if (this.prefix == "moe") {
        positionsSpatial[i * 3] = point["X_spatial1_norm"] * 200;
        positionsSpatial[i * 3 + 1] = point["X_spatial0_norm"] * -200;
        positionsSpatial[i * 3 + 2] = 0;

        positionsSpatialBg[i * 3] = point["X_spatial1_norm"] * 200;
        positionsSpatialBg[i * 3 + 1] = point["X_spatial0_norm"] * -200;
        positionsSpatialBg[i * 3 + 2] = -0.05;
      } else {
        positionsSpatial[i * 3] = point["X_spatial0_norm"] * -200;
        positionsSpatial[i * 3 + 1] = point["X_spatial1_norm"] * -200;
        positionsSpatial[i * 3 + 2] = point["X_spatial2_norm"] * 200;
      }

      // Default color (will be updated later)
      const hexColor = this.pallete[point["clusters"]] || "#5e5e5e";
      const color = new THREE.Color(hexColor);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Default scale (will be updated later)
      scales[i] = 3;

      // Default alpha (fully opaque)
      alphas[i] = 1;
    });

    // Set attributes
    geometrySpatial.setAttribute(
      "position",
      new THREE.BufferAttribute(positionsSpatial, 3)
    );
    geometrySpatial.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometrySpatial.setAttribute("size", new THREE.BufferAttribute(scales, 1));
    geometrySpatial.setAttribute("alpha", new THREE.BufferAttribute(alphas, 1));
    if (this.prefix == "moe") {
      geometrySpatialBg.setAttribute(
        "position",
        new THREE.BufferAttribute(positionsSpatialBg, 3)
      );
      const colorsBg = new Float32Array(count * 3);
      const scalesBg = new Float32Array(count);
      const alphasBg = new Float32Array(count);

      colorsBg.fill(0.28);
      scalesBg.fill(0.1);
      alphasBg.fill(0);

      geometrySpatialBg.setAttribute(
        "color",
        new THREE.BufferAttribute(colorsBg, 3)
      );
      geometrySpatialBg.setAttribute(
        "size",
        new THREE.BufferAttribute(scalesBg, 1)
      );
      geometrySpatialBg.setAttribute(
        "alpha",
        new THREE.BufferAttribute(alphasBg, 1)
      );
    }
    // Get current dot size from ButtonState for use in the shader
    const dotSizeUniform = { value: ButtonState.value.dotSize };

    // Define custom shaders for better control over point rendering
    const vertexShader = `
            attribute float size;
            attribute vec3 color;
            attribute float alpha;
            uniform float dotSize;
            varying vec3 vColor;
            varying float vAlpha;
            varying float vDistance;

            void main() {
                vColor = color;
                vAlpha = alpha;
                
                // Early exit if size or alpha is zero or negative - point will not be rendered
                if (size <= 0.0 || alpha <= 0.0) {
                    // Move the point far off-screen (effectively hiding it)
                    gl_Position = vec4(2.0, 2.0, 2.0, 1.0); // Position outside clip space
                    gl_PointSize = 0.0;
                    return;
                }
                
                // Calculate the model view position
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                
                // Calculate distance from camera
                float distance = -mvPosition.z;
                vDistance = distance;
                
                // Get base size from the size attribute, scaled by the dotSize uniform
                float baseSize = size * dotSize * 0.4; // Scale factor to make it reasonable
                
                // Dynamic sizing based on distance with smoother transitions
                float minSize = max(0.5, dotSize * 0.2); // Minimum size scales with dotSize
                float maxSize = min(50.0, dotSize * 6.0); // Maximum size scales with dotSize
                float zoomFactor = 150.0; // LOWER value makes points shrink faster when zooming in
                
                // Use a smooth curve for size transition based on distance
                // This creates a more natural zoom feeling
                float distanceRatio = zoomFactor / distance;
                
                // Smooth adaptive sizing with cubic easing
                float t = clamp((distance - 100.0) / 200.0, 0.0, 1.0); // Shorter distance range for faster transition
                float easedT = 1.0 - (1.0 - t) * (1.0 - t) * (1.0 - t); // Cubic ease-out
                
                // Blend between close-up and far-away behaviors
                float closeUpFactor = 1.0;  // Size multiplier when close to camera
                float farAwayFactor = 2.0;   // Size multiplier when far from camera
                float scaleFactor = mix(closeUpFactor, farAwayFactor, easedT);
                
                // Calculate final adaptive size
                float adaptiveSize = baseSize * distanceRatio * scaleFactor;
                
                // Clamp size between min and max
                gl_PointSize = clamp(adaptiveSize, minSize, maxSize);
                gl_Position = projectionMatrix * mvPosition;
            }
        `;

    // Fragment shader that renders circular points with exact colors and a subtle border
    const fragmentShader = `
            precision highp float;
            varying vec3 vColor;
            varying float vAlpha;
            varying float vDistance;

            void main() {
                // Skip rendering if alpha is 0
                if (vAlpha <= 0.0) {
                    discard;
                    return;
                }
                
                // Calculate distance from center of point
                float dist = length(gl_PointCoord - vec2(0.5, 0.5));
                
                // Discard fragments outside the circle
                if (dist > 0.5) {
                    discard;
                }
                
                // Create a subtle border/drop shadow effect
                float borderWidth = 0.05; // Width of the border (0.0-0.5)
                float borderSoftness = 0.02; // Softness of the border edge
                
                if (dist > (0.5 - borderWidth)) {
                    // Border area - create a subtle dark edge
                    float borderFactor = smoothstep(0.5 - borderWidth - borderSoftness, 0.5 - borderSoftness, dist);
                    vec3 borderColor = vec3(0.0, 0.0, 0.0); // Black border
                    
                    // Blend between the point color and border color
                    vec3 finalColor = mix(vColor, borderColor, borderFactor * 0.5); // 0.5 controls border intensity
                    gl_FragColor = vec4(finalColor, vAlpha);
                } else {
                    // Interior of the point - use exact colors with no modifications
                    gl_FragColor = vec4(vColor, vAlpha);
                }
            }
        `;

    // Create custom shader material with uniforms for dynamic updates
    const material = new THREE.ShaderMaterial({
      uniforms: {
        dotSize: dotSizeUniform,
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
      // Use linear color space for accurate color reproduction
      colorSpace: THREE.LinearSRGBColorSpace,
    });

    // Create points mesh
    this.pointsMeshSpatial = new THREE.Points(geometrySpatial, material);

    // Set names for the meshes so they can be found by the overlay
    this.pointsMeshSpatial.name = "pointsMeshSpatial";

    this.scene.add(this.pointsMeshSpatial);

    if (this.prefix == "moe") {
      this.pointsMeshSpatialBg = new THREE.Points(geometrySpatialBg, material);
      this.pointsMeshSpatialBg.name = "pointsMeshSpatialBg";

      this.scene.add(this.pointsMeshSpatialBg);
    }
  }

  // Helper method to parse RGB color strings
  parseRGBColor(rgbStr) {
    try {
      // Extract RGB values from string like 'rgb(255, 0, 0)'
      const matches = rgbStr.match(
        /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/
      );
      if (matches && matches.length === 4) {
        const r = parseInt(matches[1], 10) / 255;
        const g = parseInt(matches[2], 10) / 255;
        const b = parseInt(matches[3], 10) / 255;
        console.log(`Parsed RGB: ${rgbStr} -> r:${r}, g:${g}, b:${b}`);
        return new THREE.Color(r, g, b);
      }
      return null;
    } catch (e) {
      console.error(`Error parsing RGB string: ${rgbStr}`, e);
      return null;
    }
  }

  updateColors(hexColors, rgb = false) {
    if (!this.pointsMeshSpatial || !hexColors || hexColors.length === 0) return;
    const geometrySpatial = this.pointsMeshSpatial.geometry;
    const colorAttribute = geometrySpatial.getAttribute("color");
    const count = colorAttribute.count;
    if (hexColors.length !== count) {
      console.error(
        `Color list length (${hexColors.length}) does not match point count (${count}).`
      );
      return;
    }
    const colorArray = new Float32Array(count * 3);

    // Log some sample colors for debugging
    console.log(`Sample colors (first 5): ${hexColors.slice(0, 5).join(", ")}`);

    // Process each color value
    hexColors.forEach((colorValue, i) => {
      let color;

      // Always treat RGB strings as RGB regardless of the rgb parameter
      if (
        colorValue &&
        typeof colorValue === "string" &&
        colorValue.startsWith("rgb")
      ) {
        // Parse RGB string directly
        const rgbMatches = colorValue.match(
          /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/
        );
        if (rgbMatches && rgbMatches.length === 4) {
          const r = parseInt(rgbMatches[1], 10) / 255;
          const g = parseInt(rgbMatches[2], 10) / 255;
          const b = parseInt(rgbMatches[3], 10) / 255;
          color = new THREE.Color(r, g, b);
          // console.log(`RGB color parsed: ${colorValue} -> r:${r}, g:${g}, b:${b}`);
        } else {
          // console.error(`Failed to parse RGB color: ${colorValue}`);
          color = new THREE.Color(1, 1, 1);
        }
      } else if (colorValue && typeof colorValue === "string") {
        // Handle hex colors
        const lowerColorValue = colorValue.toLowerCase();
        // Parse the hex value manually to ensure accuracy
        try {
          // Remove # if present
          const hex = lowerColorValue.startsWith("#")
            ? lowerColorValue.substring(1)
            : lowerColorValue;

          // Parse hex values directly
          const r = parseInt(hex.substring(0, 2), 16) / 255;
          const g = parseInt(hex.substring(2, 4), 16) / 255;
          const b = parseInt(hex.substring(4, 6), 16) / 255;

          color = new THREE.Color(r, g, b);
        } catch (e) {
          console.error(`Error parsing hex color: ${colorValue}`, e);
          // Fallback to Three.js color parsing if manual parsing fails
          color = new THREE.Color(colorValue);
        }
      } else {
        console.error(`Invalid color value: ${colorValue}`);
        color = new THREE.Color(1, 1, 1); // Default to white
      }

      // Store the exact color values in the buffer
      colorArray[i * 3] = color.r;
      colorArray[i * 3 + 1] = color.g;
      colorArray[i * 3 + 2] = color.b;
    });

    // Update the color attribute
    geometrySpatial.setAttribute(
      "color",
      new THREE.BufferAttribute(colorArray, 3)
    );

    console.log("Colors updated for all points.");
  }

  /**
   * Updates scales for all points.
   * @param {Array<number>} scales - List of scale values for each point.
   */
  updateScales(scales) {
    console.log("Updating scales for all points");
    if (!this.pointsMeshSpatial || !scales || scales.length === 0) return;

    const geometrySpatial = this.pointsMeshSpatial.geometry;
    const count = this.jsonData.length;

    if (scales.length !== count) {
      console.error(
        `Scale list length (${scales.length}) does not match point count (${count}).`
      );
      return;
    }

    // Create a new array for the size attribute
    const sizeArraySpatial = new Float32Array(count);

    // Fill the arrays with scale values
    let scalingFactor = 1;
    if (this.prefix == "moe") {
      scalingFactor = 0.1;
    }
    for (let i = 0; i < count; i++) {
      sizeArraySpatial[i] = scales[i] * scalingFactor; // Apply scaling factor
    }

    // Replace the size attribute with the new arrays
    geometrySpatial.setAttribute(
      "size",
      new THREE.BufferAttribute(sizeArraySpatial, 1)
    );

    console.log("Scales updated for all points.");
  }

  /**
   * Updates alpha (transparency) values for all points.
   * @param {Array<number>} alphas - List of alpha values (0-1) for each point.
   */
  updateAlphas(alphas, prefix = "") {
    console.log("Updating alphas for all points");
    if (!this.pointsMeshSpatial || !alphas || alphas.length === 0) return;

    let geometrySpatial;
    if (prefix == "bg") {
      geometrySpatial = this.pointsMeshSpatialBg.geometry;
    } else {
      geometrySpatial = this.pointsMeshSpatial.geometry;
    }
    const count = this.jsonData.length;

    if (alphas.length !== count) {
      console.error(
        `Alpha list length (${alphas.length}) does not match point count (${count}).`
      );
      return;
    }

    // Create a new array for the size attribute
    const alphaArraySpatial = new Float32Array(count);

    // Fill the arrays with alpha values
    for (let i = 0; i < count; i++) {
      alphaArraySpatial[i] = alphas[i]; // Apply alpha factor
    }

    // Replace the alpha attribute with the new arrays
    geometrySpatial.setAttribute(
      "alpha",
      new THREE.BufferAttribute(alphaArraySpatial, 1)
    );

    console.log("Alphas updated for all points.");
  }

  /**
   * Parses an RGB color string (e.g., 'rgb(255, 0, 0)') into a THREE.Color object.
   * @param {string} rgbString - RGB color string in the format 'rgb(r, g, b)'.
   * @returns {THREE.Color|null} - THREE.Color object or null if parsing fails.
   */
  parseRGBColor(rgbString) {
    try {
      // Extract the RGB values from the string
      const rgbValues = rgbString.match(/\d+/g);
      if (!rgbValues || rgbValues.length !== 3) {
        return null;
      }

      // Convert to normalized values (0-1)
      const r = parseInt(rgbValues[0]) / 255;
      const g = parseInt(rgbValues[1]) / 255;
      const b = parseInt(rgbValues[2]) / 255;

      return new THREE.Color(r, g, b);
    } catch (error) {
      console.error("Error parsing RGB color:", error);
      return null;
    }
  }

  animate = () => {
    requestAnimationFrame(this.animate);
    this.controls.update(); // Only needed if controls.enableDamping is true

    // Check for raycaster intersections if we have a mouse position
    if (this.mouse.x !== 0 || this.mouse.y !== 0) {
      this.checkIntersections();
    }

    // Log camera position and look-at direction every 5 seconds
    if (!this.lastLogTime) {
      this.lastLogTime = Date.now();
    }

    // const currentTime = Date.now();
    // if (currentTime - this.lastLogTime >= 1000) { // 5000ms = 5 seconds
    //     // Get camera position
    //     const position = this.camera.position.clone();

    //     // Calculate look-at direction
    //     const lookAtDirection = new THREE.Vector3(0, 0, -1);
    //     lookAtDirection.applyQuaternion(this.camera.quaternion);

    //     // Get the exact target point from the controls
    //     const targetPoint = this.controls.target.clone();

    //     // Log the information in an easy-to-copy format
    //     console.log('Camera Position:',
    //         `x: ${position.x.toFixed(2)}, y: ${position.y.toFixed(2)}, z: ${position.z.toFixed(2)}`);
    //     console.log('Target Point:',
    //         `x: ${targetPoint.x.toFixed(2)}, y: ${targetPoint.y.toFixed(2)}, z: ${targetPoint.z.toFixed(2)}`);
    //     console.log('Look-at Direction:',
    //         `x: ${lookAtDirection.x.toFixed(2)}, y: ${lookAtDirection.y.toFixed(2)}, z: ${lookAtDirection.z.toFixed(2)}`);

    //     // Log in a format that's easy to copy directly to ButtonState.js
    //     console.log('Copy to ButtonState.js:\n' +
    //         `    cameraPositionX: ${position.x.toFixed(2)},\n` +
    //         `    cameraPositionY: ${position.y.toFixed(2)},\n` +
    //         `    cameraPositionZ: ${position.z.toFixed(2)},\n` +
    //         `    targetX: ${targetPoint.x.toFixed(2)},\n` +
    //         `    targetY: ${targetPoint.y.toFixed(2)},\n` +
    //         `    targetZ: ${targetPoint.z.toFixed(2)},`);

    //     // Update the last log time
    //     this.lastLogTime = currentTime;
    // }

    this.renderer.render(this.scene, this.camera);
  };

  checkIntersections() {
    // Get current camera position to check if we've moved
    const currentCameraPosition = this.camera.position.clone();
    // const cameraHasMoved = !currentCameraPosition.equals(this.lastCameraPosition);
    this.lastCameraPosition.copy(currentCameraPosition);

    // Calculate camera distance to determine raycaster parameters
    const cameraDistance = this.camera.position.z;

    // Set more user-friendly thresholds for raycasting
    // Higher values make it easier to select points but less precise
    // Lower values require more precision but are more accurate
    const minThreshold = 0.2; // When zoomed in very close
    const maxThreshold = 2.0; // When zoomed out far

    // Calculate adaptive threshold based on camera distance
    // Use a non-linear curve to provide better usability across zoom levels
    let threshold;
    if (cameraDistance < 50) {
      // Close range - easier selection but still somewhat precise
      threshold = minThreshold;
    } else if (cameraDistance > 500) {
      // Far away - much larger threshold for easier selection
      threshold = maxThreshold;
    } else {
      // Middle range - use a quadratic curve for smoother transition
      // This gives more precision when closer and more leniency when farther
      const t = (cameraDistance - 50) / (500 - 50); // Normalized distance (0-1)
      threshold = minThreshold + t * t * (maxThreshold - minThreshold);
    }

    // Always update the threshold to ensure consistent behavior
    this.raycaster.params.Points.threshold = threshold;

    // Update the raycaster with the current mouse position and camera
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Check for intersections with the spatial points mesh
    const intersects = this.raycaster.intersectObject(this.pointsMeshSpatial);

    // If we found an intersection
    if (intersects.length > 0) {
      // Sort intersections by distance if there are multiple
      if (intersects.length > 1) {
        intersects.sort((a, b) => a.distance - b.distance);
      }

      // Get the index of the closest point that was intersected
      const index = intersects[0].index;

      // If this is a different point than the one we were previously hovering over
      if (this.hoveredPoint !== index) {
        this.hoveredPoint = index;

        // Get the cluster information for this point
        const point = this.jsonData[index];
        const clusterValue = point["clusters"];
        const position = intersects[0].point;

        // Show the tooltip with cluster information
        if (clusterValue !== "") {
          this.showTooltip(position, clusterValue);
        }
      }
    } else {
      // If we're not hovering over any point, hide the tooltip
      if (this.hoveredPoint !== null) {
        this.hoveredPoint = null;
        this.hideTooltip();
      }
    }
  }

  createTooltip() {
    // Create a tooltip element
    const tooltip = document.createElement("div");
    tooltip.className = "point-tooltip";
    tooltip.style.position = "absolute";
    tooltip.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    tooltip.style.color = "white";
    tooltip.style.padding = "6px 10px";
    tooltip.style.borderRadius = "4px";
    tooltip.style.fontSize = "14px";
    tooltip.style.fontFamily = "Arial, sans-serif";
    tooltip.style.pointerEvents = "none";
    tooltip.style.display = "none";
    tooltip.style.zIndex = "1000";
    tooltip.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";
    tooltip.style.minWidth = "80px";

    // Add the tooltip to the document body
    document.body.appendChild(tooltip);

    return tooltip;
  }

  showTooltip(position, clusterValue) {
    // Convert 3D position to screen coordinates
    const vector = position.clone();
    vector.project(this.camera);

    const x = (vector.x * 0.5 + 0.5) * this.renderer.domElement.clientWidth;
    const y = (-vector.y * 0.5 + 0.5) * this.renderer.domElement.clientHeight;

    // Get the color for this cluster from the palette
    const clusterColor = this.pallete[clusterValue] || "#5e5e5e";

    // Set the tooltip content with a colored circle and the cluster name
    this.tooltip.innerHTML = `
            <div style="display: flex; align-items: center;">
                <div style="
                    width: 12px; 
                    height: 12px; 
                    border-radius: 50%; 
                    background-color: ${clusterColor}; 
                    margin-right: 6px;
                "></div>
                <span>${clusterValue}</span>
            </div>
        `;

    this.tooltip.style.left = `${x + 10}px`;
    this.tooltip.style.top = `${y + 10}px`;
    this.tooltip.style.display = "block";
  }

  hideTooltip() {
    this.tooltip.style.display = "none";
  }

  /**
   * Adds 3D text at specified coordinates with rotation
   * Uses a sprite-based approach for better performance and readability
   * @param {string} text - The text to display
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} z - Z coordinate
   * @param {number} [scale=50] - Size of the text (default: 50)
   * @param {string} [color='white'] - Color of the text (default: white)
   * @param {string} [font='Bold 450px Arial'] - Font style (default: Bold 450px Arial)
   * @param {number} [rotationX=0] - Rotation around X axis in radians
   * @param {number} [rotationY=0] - Rotation around Y axis in radians
   * @param {number} [rotationZ=0] - Rotation around Z axis in radians
   * @returns {THREE.Object3D} - The created text object
   */
  addText(
    text,
    x,
    y,
    z,
    scale = 50,
    color = "white",
    font = "Bold 450px Arial",
    rotationX = 0,
    rotationY = 0,
    rotationZ = 0
  ) {
    // Create a high-resolution canvas for the text
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    // Increase canvas size for higher resolution
    canvas.width = 2048; // 4x higher resolution
    canvas.height = 2048;

    // Enable anti-aliasing for smoother text
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    // Set text properties
    context.font = font;
    context.fillStyle = color;
    context.textAlign = "center";
    context.textBaseline = "middle";

    // Add a subtle outline to improve readability
    context.strokeStyle = "rgba(0, 0, 0, 0.5)";
    context.lineWidth = 8;
    context.strokeText(text, canvas.width / 2, canvas.height / 2);

    // Draw text on canvas
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    // Create texture from canvas with better filtering
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;

    // Determine if we should use a sprite (always faces camera) or a plane (can be rotated)
    if (rotationX === 0 && rotationY === 0 && rotationZ === 0) {
      // No rotation - use a sprite for better visibility (always faces camera)
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false, // Make sure text is always visible
      });

      // Create sprite
      const sprite = new THREE.Sprite(material);
      sprite.position.set(x, y, z);
      sprite.scale.set(scale, scale, 1); // Adjust scale to make text visible

      // Add sprite to scene
      this.scene.add(sprite);

      // Return the sprite
      return sprite;
    } else {
      // With rotation - use a plane geometry
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide, // Visible from both sides
        depthTest: false, // Make sure text is always visible
      });

      // Create a plane geometry for the text
      const plane = new THREE.PlaneGeometry(1, 1);
      const mesh = new THREE.Mesh(plane, material);

      // Create a container to handle rotations properly
      const container = new THREE.Object3D();
      container.add(mesh);

      // Position and scale
      container.position.set(x, y, z);
      mesh.scale.set(scale, scale, 1);

      // Apply rotations
      container.rotation.set(rotationX, rotationY, rotationZ);

      // Add to scene
      this.scene.add(container);

      // Return the container
      return container;
    }
  }

  setupEventListeners() {
    // Add mouse move event listener to track mouse position
    this.renderer.domElement.addEventListener("mousemove", (event) => {
      // Calculate mouse position in normalized device coordinates (-1 to +1)
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    });

    // Add click event listener for additional interaction if needed
    this.renderer.domElement.addEventListener("click", (event) => {
      // We already have the hovered point from the mousemove event
      if (this.hoveredPoint !== null) {
        const point = this.jsonData[this.hoveredPoint];
        const clusterValue = point["clusters"];
        console.log(`Clicked on point with cluster: ${clusterValue}`);

        // You can add additional actions here, such as selecting the cluster
        // or showing more detailed information in a separate panel
      }
    });
  }
}
