import { BehaviorSubject } from 'rxjs';

const buttonData = {
    dotSize: 20.00,
    minDotSize: 10.00,
    maxDotSize: 30.00,
    offsetUMAP: 10000,
    genePercentile: 0.990, // Default percentile for calculation (80%)
    
    // Actual gene expression values at percentiles
    minGeneValue: 0, // Will store actual value at 80th percentile
    maxGeneValue: 0, // Will store actual value at 100th percentile
    
    // Current gene expression axis limits (initially set to calculated values)
    currentMinGeneValue: 0,
    currentGeneValue: 0,
    currentMaxGeneValue: 0,
    
    cameraPositionX: 80.65,
    cameraPositionY: -348.27,
    cameraPositionZ: 72.20,
    // Target point (the exact point the camera is looking at)
    targetX: 0,
    targetY: 0,
    targetZ: 0,

}

export const ButtonState = new BehaviorSubject(buttonData);

/**
 * Updates the dot size of the umap within the application's constant data state
 * @param {Integer} newDotSize - new dot size
 */
export function updateDotSize(newDotSize) {
    // Get the current state from the BehaviorSubject
    const currentState = ButtonState.getValue();

    // Update the items in the current state
    const updatedState = {
        ...currentState,
        dotSize: newDotSize
    };

    // Emit the updated state
    ButtonState.next(updatedState);
}

/**
 * Updates the dot size of the umap within the application's constant data state
 * @param {Integer} newGenePercentile - new dot size
 */
export function updateGenePercentile(newGenePercentile) {
    // Get the current state from the BehaviorSubject
    const currentState = ButtonState.getValue();

    const percent = newGenePercentile * 0.01;
    // Update the items in the current state
    const updatedState = {
        ...currentState,
        genePercentile: percent
    };

    // Emit the updated state
    ButtonState.next(updatedState);
}

/**
 * Updates the actual min and max gene expression values
 * @param {Number} minValue - The actual value at 80th percentile
 * @param {Number} maxValue - The actual value at 100th percentile
 */
export function updateGeneExpressionRange(minValue, currVal, maxValue) {
    // Get the current state from the BehaviorSubject
    const currentState = ButtonState.getValue();

    console.log("Current gene value", currVal);

    // Update the items in the current state
    const updatedState = {
        ...currentState,
        minGeneValue: minValue,
        maxGeneValue: maxValue,
        // Also set the current values to match the calculated ones initially
        currentMinGeneValue: minValue,
        currentGeneValue: currVal,
        currentMaxGeneValue: maxValue
    };

    // Emit the updated state
    ButtonState.next(updatedState);
}

/**
 * Updates the current gene expression value for visualization
 * @param {Number} value - The new gene expression value to use for visualization
 */
export function updateCurrentGeneValue(value) {
    // Get the current state from the BehaviorSubject
    const currentState = ButtonState.getValue();

    // Update the items in the current state
    const updatedState = {
        ...currentState,
        currentGeneValue: value
    };

    // Emit the updated state
    ButtonState.next(updatedState);
}

export function updateCameraPositionZ(newCameraPositionZ) {

    const currentState = ButtonState.getValue();

    const updatedState = {
        ...currentState,
        cameraPositionZ: newCameraPositionZ
    };

    ButtonState.next(updatedState);
}