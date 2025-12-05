import { ApiState } from "../states/ApiState";
import { fetchDataFromAPI } from "./APIClient";
import { reorderByIndexes } from "./LoadFunctions";

export async function getGene(gene) {
    if (ApiState.value.prefix == "moe") {
        let data = await fetchDataFromAPI(gene, ApiState.value.prefix)
        console.log("data", data)
        console.log("reorder", ApiState.value.reorder)
        return reorderByIndexes(data, ApiState.value.reorder);
    }
    return fetchDataFromAPI(gene, ApiState.value.prefix);
}

// for two genes
function interpolatePercentages(percent1, percent2) {

    // Define colors
    const white = { r: 255, g: 255, b: 255 };
    const green = { r: 0, g: 255, b: 0 };
    const magenta = { r: 255, g: 0, b: 255 };

    // Interpolate between red and white based on the first percentage
    const interpolatedRed = {
        r: Math.round(green.r + (white.r - green.r) * percent2),
        g: Math.round(green.g + (white.g - green.g) * percent2),
        b: Math.round(green.b + (white.b - green.b) * percent2)
    };

    // Interpolate between cyan and white based on the second percentage
    const interpolatedCyan = {
        r: Math.round(magenta.r + (white.r - magenta.r) * percent1),
        g: Math.round(magenta.g + (white.g - magenta.g) * percent1),
        b: Math.round(magenta.b + (white.b - magenta.b) * percent1)
    };

    // Calculate the average of the interpolated colors
    const averageColor = {
        r: (interpolatedRed.r + interpolatedCyan.r) / 2,
        g: (interpolatedRed.g + interpolatedCyan.g) / 2,
        b: (interpolatedRed.b + interpolatedCyan.b) / 2
    };

    // Return CSS color string
    return `rgb(${Math.round(averageColor.r)}, ${Math.round(averageColor.g)}, ${Math.round(averageColor.b)})`;
}

/**
 * Generates a color value in the coolwarm colormap based on the input value.
 * @param {number} value - The value for which to generate the color (between 0 and 1).
 * @returns {string} - The color string in RGB format.
 */
export function coolwarm(value1, value2) {
    // Check for NaN values
    if (isNaN(value1)) {
        return 'rgb(255, 255, 255)'; // Return black for NaN
        // return 'rgb(0, 0, 0)'; // Return black for NaN
    }

    // Define start and end colors (cool: blue, warm: red)
    const startColor = { r: 0, g: 0, b: 255 }; // Blue
    const middleColor = { r: 255, g: 255, b: 255 }; // White
    const endColor = { r: 255, g: 0, b: 0 }; // Red

    // no second gene
    if (value2 == null) {
        if (value1 < 0.5) { // blue to white
            return `rgb(${Math.floor(middleColor.r * value1 * 2)}, ${Math.floor(middleColor.g * value1 * 2)}, ${startColor.b})`;
        } else if (value1 === 0.5) { // white
            return `rgb(${middleColor.r}, ${middleColor.g}, ${middleColor.b})`;
        } else { // white to red
            return `rgb(${endColor.r}, ${Math.floor(middleColor.g - (middleColor.g * (value1 - 0.5) * 2))}, ${Math.floor(middleColor.b - (middleColor.b * (value1 - 0.5) * 2))})`;
        }
    } else {
        return interpolatePercentages(value1, value2);
    }
}


/**
 * Calculates the value at the specified percentile of the given array, ignoring NaN values.
 * @param {Array<number>} arr - The array of numerical values.
 * @param {number} percentile - The percentile to calculate (between 0 and 1).
 * @returns {number} - The value at the specified percentile.
 */
export function calculateGenePercentile(arr, percentile) {
    // Filter out NaN values and create a sorted copy
    const sortedArr = arr
        .filter(value => !isNaN(value) && value !== null)
        .sort((a, b) => a - b);

    if (sortedArr.length === 0) {
        return NaN; // Return NaN if all values are NaN
    }

    // Calculate the index for the xth percentile
    const index = Math.floor(sortedArr.length * percentile);
    
    // Ensure index is within bounds
    const boundedIndex = Math.min(Math.max(0, index), sortedArr.length - 1);

    return sortedArr[boundedIndex];
}


/**
 * Normalizes the values in the array to a range between 0 and 1.
 * @param {Array<number>} arr - The array of numerical values.
 * @param {number} nmax - The maximum value in the array.
 * @returns {Array<number>} - The array with normalized values.
 */
export function normalizeArray(arr, nmax) {
    return arr.map(value => Math.min(value / nmax, 1));
}
