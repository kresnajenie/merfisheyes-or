import { SelectedState } from "../../states/SelectedState";
import {
    ButtonState,
    updateCurrentGeneValue,
    updateCurrentGeneValue2,
} from "../../states/ButtonState";

const FACTOR = 36.75;

function isImputedAt(index) {
    const selectedGenes = SelectedState.value.selectedGenes;
    try {
        return selectedGenes[index].split("_")[1] == "imputed";
    } catch {
        return false;
    }
}

function formatVMax(rawMax, imputed) {
    const displayed = imputed ? rawMax * FACTOR : rawMax;
    if (displayed < 1) {
        return Number(displayed.toExponential(1));
    }
    return Math.round(displayed);
}

function applyMaxToInput(inputId, rawMax, imputed) {
    const input = document.getElementById(inputId);
    if (!input) return;
    // Skip if the user is mid-edit so we don't yank focus or overwrite typing.
    if (document.activeElement === input) return;
    input.value = formatVMax(rawMax, imputed);
}

function setBottomLabel(id, min) {
    const el = document.getElementById(id);
    if (el) el.textContent = min;
}

export function setLabels(min, max) {
    applyMaxToInput("top-label", max, isImputedAt(0));
    setBottomLabel("bottom-label", min);
}

export function setLabelsGreen(min, max) {
    // Green colorbar shows gene 1 in dual-gene mode
    applyMaxToInput("top-label-green", max, isImputedAt(1));
    setBottomLabel("bottom-label-green", min);
}

export function setLabelsMagenta(min, max) {
    // Magenta colorbar shows gene 2 in dual-gene mode
    applyMaxToInput("top-label-magenta", max, isImputedAt(0));
    setBottomLabel("bottom-label-magenta", min);
}

/**
 * Wire change/Enter/blur handlers on a v_max input field.
 *   inputId       — DOM id of the <input>
 *   geneIndex     — 0 for gene 1 (red/green colorbars), 1 for gene 2 (magenta)
 *   updateFn      — state updater to call with the resolved raw v_max
 */
function bindVMaxInput(inputId, geneIndex, updateFn) {
    const input = document.getElementById(inputId);
    if (!input || input.dataset.boundVmax === "1") return;
    input.dataset.boundVmax = "1";

    const apply = () => {
        const raw = parseFloat(input.value);
        // Reset to default when blank, NaN, or non-positive.
        if (!isFinite(raw) || raw <= 0) {
            updateFn(0);
            return;
        }
        const imputed = isImputedAt(geneIndex);
        const rawVMax = imputed ? raw / FACTOR : raw;
        updateFn(rawVMax);
    };

    input.addEventListener("change", apply); // fires on blur and Enter for type=number
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            input.blur(); // triggers change
        }
    });
}

/**
 * Bind all three v_max inputs to their state updaters. Call once after the
 * colorbar HTML partials have been injected by jQuery .load().
 */
export function bindColorbarInputs() {
    bindVMaxInput("top-label", 0, updateCurrentGeneValue);
    bindVMaxInput("top-label-green", 0, updateCurrentGeneValue);
    bindVMaxInput("top-label-magenta", 1, updateCurrentGeneValue2);
}

export function showColorbar() {
    const colorbarWrapper = document.getElementById("colorbar-wrapper");
    if (colorbarWrapper) {
        colorbarWrapper.style.display = "grid";
    } else {
        console.error("Colorbar wrapper not found in the DOM.");
    }
}

export function showColorbarGreen() {
    const colorbarWrapper2 = document.getElementById("colorbar-wrapper2");
    if (colorbarWrapper2) {
        colorbarWrapper2.style.display = "grid";
    } else {
        console.error("Colorbar wrapper not found in the DOM.");
    }
}

export function showColorbarMagenta() {
    const colorbarWrapper2 = document.getElementById("colorbar-wrapper3");
    if (colorbarWrapper2) {
        colorbarWrapper2.style.display = "grid";
    } else {
        console.error("Colorbar wrapper not found in the DOM.");
    }
}

export function hideColorbar() {
    const colorbarWrapper = document.getElementById("colorbar-wrapper");
    if (colorbarWrapper) {
        colorbarWrapper.style.display = "none";
    } else {
        console.error("Colorbar wrapper not found in the DOM.");
    }
}

export function hideColorbarGreen() {
    const colorbarWrapper2 = document.getElementById("colorbar-wrapper2");
    if (colorbarWrapper2) {
        colorbarWrapper2.style.display = "none";
    } else {
        console.error("Colorbar wrapper not found in the DOM.");
    }
}

export function hideColorbarMagenta() {
    const colorbarWrapper2 = document.getElementById("colorbar-wrapper3");
    if (colorbarWrapper2) {
        colorbarWrapper2.style.display = "none";
    } else {
        console.error("Colorbar wrapper not found in the DOM.");
    }
}
