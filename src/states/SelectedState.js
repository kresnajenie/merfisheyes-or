import { BehaviorSubject } from 'rxjs';

const url = new URL(window.location);
const params = new URLSearchParams(url.search);

const selectedData = {
    selectedCelltypes: [],
    mode: params.has("mode") ? Number(params.get("mode")) : 1,
    selectedSingleGene: "",
    selectedGenes: [],
    showing: "celltype",
}

export function updateSelectedShowing(newShowing) {
    // Get the current state from the BehaviorSubject
    const currentState = SelectedState.getValue();

    // Update the items in the current state
    const updatedState = {
        ...currentState,
        showing: newShowing
    };

    // console.log(newShowing)

    // Emit the updated state
    SelectedState.next(updatedState);
}

/**
 * Toggles a celltype within the selectedCelltypes list.
 * @param {string} celltype - The celltype to add or remove from the selectedCelltypes list.
 * Example Usage:
 * toggleSelectedCelltype("cell1");
 */
export function toggleSelectedCelltype(celltype) {
    // Get the current state from the BehaviorSubject
    const currentState = SelectedState.getValue();

    // Copy the existing selectedCelltypes array
    const selectedCelltypes = [...currentState.selectedCelltypes];

    // Check if the celltype is already in the list
    const celltypeIndex = selectedCelltypes.indexOf(celltype);

    if (celltypeIndex > -1) {
        // If it exists, remove it from the list
        selectedCelltypes.splice(celltypeIndex, 1);
    } else {
        // If it does not exist, add it to the list
        selectedCelltypes.push(celltype);
    }

    // Create the updated state
    const updatedState = {
        ...currentState,
        selectedCelltypes: selectedCelltypes
    };

    // Emit the updated state
    SelectedState.next(updatedState);
}

export const SelectedState = new BehaviorSubject(selectedData);

/**
 * Updates the selected celltypes within the application's constant data state.
 * @param {Array} newCelltypes - The new selected celltypes array to set in the state.
 * Example Usage:
 * updateGenes(["cell1", "cell2", "cell3"]);
 */
export function updateSelectedCelltype(newCelltypes) {
    // Get the current state from the BehaviorSubject
    const currentState = SelectedState.getValue();

    // Update the items in the current state
    const updatedState = {
        ...currentState,
        selectedCelltypes: [...new Set(newCelltypes)]
    };

    // Emit the updated state
    SelectedState.next(updatedState);
}

export function updateMode(newMode) {
    // Get the current state from the BehaviorSubject
    const currentState = SelectedState.getValue();

    // Update the items in the current state
    const updatedState = {
        ...currentState,
        mode: newMode
    };

    // Emit the updated state
    SelectedState.next(updatedState);
}

export function updateSelectedSingleGene(newSingleGene) {
    // Get the current state from the BehaviorSubject
    const currentState = SelectedState.getValue();

    // Update the items in the current state
    const updatedState = {
        ...currentState,
        selectedSingleGene: newSingleGene
    };

    // Emit the updated state
    SelectedState.next(updatedState);
}

/**
 * Updates the selected celltypes within the application's constant data state.
 * @param {Array} newGenes - The new selected celltypes array to set in the state.
 * Example Usage:
 * updateGenes("gene1");
 */
export function updateSelectedGene(newGenes) {
    // Get the current state from the BehaviorSubject
    const currentState = SelectedState.getValue();

    // Update the items in the current state
    const updatedState = {
        ...currentState,
        selectedGenes: newGenes
    };

    // Emit the updated state
    SelectedState.next(updatedState);
}