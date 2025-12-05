import { ButtonState, updateDotSize, updateCurrentGeneValue } from '../states/ButtonState.js';
import { SelectedState } from '../states/SelectedState.js';

// Common UI elements used across functions
const getUIElements = () => ({
    cellCheckbox: document.getElementById("cellCheckbox"),
    geneRadioContainer: document.getElementById('geneRadioContainer'),
    toggleCellCheckbox: document.getElementById('toggleCellCheckbox'),
    toggleGeneRadio: document.getElementById('toggleGeneRadio'),
    togglePointSize: document.getElementById("togglePointSize"),
    pointSizeSliderBox: document.getElementById("pointSizeSliderBox"),
    pointSizeSlider: document.getElementById("pointSizeSlider"),
    pointSizeSliderValue: document.getElementById("pointSizeSliderValue"),
    pointSizeMinId: document.getElementById("pointSizeMinId"),
    pointSizeMaxId: document.getElementById("pointSizeMaxId"),
    toggleGenePercentile: document.getElementById("toggleGenePercentile"),
    geneSliderBox: document.getElementById("geneSliderBox"),
    geneSlider: document.getElementById("geneSlider"),
    geneSliderValue: document.getElementById("geneSliderValue"),
    geneMinId: document.getElementById("geneMinId"),
    geneMaxId: document.getElementById("geneMaxId")
});

// Helper functions
const toggleDisplay = (element) => {
    if (element) {
        element.style.display = element.style.display === 'none' ? 'block' : 'none';
        return element.style.display === 'block';
    }
    return false;
};

const setButtonStyle = (button, active) => {
    if (button) {
        button.style.backgroundColor = active ? 'white' : '#282828';
        button.style.color = active ? 'black' : 'white';
    }
};

const closeAllMenus = (elements) => {
    const { 
        cellCheckbox, geneRadioContainer, pointSizeSliderBox, geneSliderBox,
        toggleCellCheckbox, toggleGeneRadio 
    } = elements;
    
    if (cellCheckbox && cellCheckbox.style.display === 'block') {
        cellCheckbox.style.display = 'none';
        setButtonStyle(toggleCellCheckbox, false);
    }
    
    if (geneRadioContainer && geneRadioContainer.style.display === 'block') {
        geneRadioContainer.style.display = 'none';
        setButtonStyle(toggleGeneRadio, false);
    }
    
    if (pointSizeSliderBox && pointSizeSliderBox.style.display === 'block') {
        pointSizeSliderBox.style.display = 'none';
    }
    
    if (geneSliderBox && geneSliderBox.style.display === 'block') {
        geneSliderBox.style.display = 'none';
    }
};

// Toggle cell filter menu
export const toggleCellFilter = () => {
    const elements = getUIElements();
    const { cellCheckbox, geneRadioContainer, toggleCellCheckbox, toggleGeneRadio } = elements;

    toggleCellCheckbox.addEventListener('click', () => {
        const isVisible = toggleDisplay(cellCheckbox);
        setButtonStyle(toggleCellCheckbox, isVisible);
        setButtonStyle(toggleGeneRadio, false);
        
        // Close gene radio if open
        if (geneRadioContainer && geneRadioContainer.style.display === 'block') {
            geneRadioContainer.style.display = 'none';
        }
    });
};

// Toggle gene filter menu
export const toggleGeneFilter = () => {
    const elements = getUIElements();
    const { cellCheckbox, geneRadioContainer, toggleCellCheckbox, toggleGeneRadio } = elements;

    toggleGeneRadio.addEventListener('click', () => {
        const isVisible = toggleDisplay(geneRadioContainer);
        setButtonStyle(toggleGeneRadio, isVisible);
        setButtonStyle(toggleCellCheckbox, false);
        
        // Close cell checkbox if open
        if (cellCheckbox && cellCheckbox.style.display === 'block') {
            cellCheckbox.style.display = 'none';
        }
    });
};

// Main toggle button functionality
export const toggleButton = () => {
    const elements = getUIElements();
    const { 
        pointSizeSlider, pointSizeSliderValue, pointSizeMinId, pointSizeMaxId,
        toggleGenePercentile, geneSlider, geneSliderValue, geneMinId, geneMaxId,
        togglePointSize, pointSizeSliderBox, geneSliderBox
    } = elements;
    
    // Function to update gene percentile button state based on gene selection
    const updateGenePercentileButtonState = () => {
        const hasExactlyOneGene = SelectedState.value.selectedGenes.length === 1;
        const isSingleGeneMode = SelectedState.value.mode === 1;
        
        if (hasExactlyOneGene && isSingleGeneMode) {
            toggleGenePercentile.disabled = false;
            toggleGenePercentile.style.opacity = '1';
            toggleGenePercentile.style.cursor = 'pointer';
        } else {
            toggleGenePercentile.disabled = true;
            toggleGenePercentile.style.opacity = '0.5';
            toggleGenePercentile.style.cursor = 'not-allowed';
            
            if (geneSliderBox && geneSliderBox.style.display === 'block') {
                geneSliderBox.style.display = 'none';
            }
        }
    };
    
    // Initialize state and subscribe to changes
    updateGenePercentileButtonState();
    SelectedState.subscribe(updateGenePercentileButtonState);
    
    // Initialize point size slider
    const initPointSizeSlider = () => {
        const { minDotSize, maxDotSize, dotSize } = ButtonState.value;
        
        pointSizeSlider.min = minDotSize;
        pointSizeSlider.max = maxDotSize;
        pointSizeSlider.value = dotSize;
        pointSizeSliderValue.value = dotSize.toFixed(2);
        pointSizeSliderValue.min = minDotSize;
        pointSizeSliderValue.max = maxDotSize;
        
        pointSizeMinId.textContent = minDotSize.toFixed(2);
        pointSizeMaxId.textContent = maxDotSize.toFixed(2);
    };
    
    // Initialize gene slider with initial percentile values
    const initGeneSlider = () => {
        // These will be replaced with actual gene values when data is loaded
        if (geneMinId && geneMaxId) {
            geneMinId.textContent = '0.00';
            geneMaxId.textContent = '0.00';
        }
    };
    
    initPointSizeSlider();
    initGeneSlider();
    
    // Setup hover functionality for buttons
    const setupHoverEffects = () => {
        const buttons = document.querySelectorAll('.iconBtn,.toggles');
        
        buttons.forEach(button => {
            const targetId = button.dataset.target;
            if (!targetId) return;
            
            const targetBox = document.getElementById(targetId);
            if (!targetBox) return;
            
            button.addEventListener('mouseenter', () => {
                targetBox.style.display = 'block';
            });
            
            button.addEventListener('mouseleave', () => {
                targetBox.style.display = 'none';
            });
        });
    };
    
    setupHoverEffects();
    
    // Point size slider functionality
    togglePointSize.addEventListener('click', () => {
        // Only close other menus, not this one
        const { 
            cellCheckbox, geneRadioContainer, geneSliderBox,
            toggleCellCheckbox, toggleGeneRadio 
        } = elements;
        
        if (cellCheckbox && cellCheckbox.style.display === 'block') {
            cellCheckbox.style.display = 'none';
            setButtonStyle(toggleCellCheckbox, false);
        }
        
        if (geneRadioContainer && geneRadioContainer.style.display === 'block') {
            geneRadioContainer.style.display = 'none';
            setButtonStyle(toggleGeneRadio, false);
        }
        
        if (geneSliderBox && geneSliderBox.style.display === 'block') {
            geneSliderBox.style.display = 'none';
        }
        
        // Toggle this menu without affecting others
        toggleDisplay(pointSizeSliderBox);
    });
    
    const updatePointSize = (value) => {
        const parsedValue = parseFloat(value).toFixed(2);
        pointSizeSliderValue.value = parsedValue;
        updateDotSize(parsedValue);
    };
    
    pointSizeSlider.addEventListener('change', function() {
        updatePointSize(this.value);
    });
    
    pointSizeSlider.addEventListener('mouseup', function() {
        updatePointSize(this.value);
    });
    
    pointSizeSliderValue.addEventListener('change', function() {
        const { minDotSize, maxDotSize } = ButtonState.value;
        
        if (this.value < minDotSize) this.value = minDotSize;
        if (this.value > maxDotSize) this.value = maxDotSize;
        
        pointSizeSlider.value = this.value;
        updatePointSize(this.value);
    });
    
    // Gene expression slider functionality
    toggleGenePercentile.addEventListener('click', () => {
        if (toggleGenePercentile.disabled) return;
        
        // Only close other menus, not this one
        const { 
            cellCheckbox, geneRadioContainer, pointSizeSliderBox,
            toggleCellCheckbox, toggleGeneRadio 
        } = elements;
        
        if (cellCheckbox && cellCheckbox.style.display === 'block') {
            cellCheckbox.style.display = 'none';
            setButtonStyle(toggleCellCheckbox, false);
        }
        
        if (geneRadioContainer && geneRadioContainer.style.display === 'block') {
            geneRadioContainer.style.display = 'none';
            setButtonStyle(toggleGeneRadio, false);
        }
        
        if (pointSizeSliderBox && pointSizeSliderBox.style.display === 'block') {
            pointSizeSliderBox.style.display = 'none';
        }
        
        // Toggle this menu without affecting others
        toggleDisplay(geneSliderBox);
    });
    
    const updateGeneValue = (value) => {
        const parsedValue = parseFloat(value);
        geneSliderValue.value = parsedValue.toFixed(2);
        updateCurrentGeneValue(parsedValue);
    };
    
    geneSlider.addEventListener('mouseup', function() {
        updateGeneValue(this.value);
    });
    
    geneSliderValue.addEventListener('change', function() {
        const { minGeneValue, maxGeneValue } = ButtonState.value;
        const inputValue = parseFloat(this.value);
        
        // Allow values beyond the limit when manually typed
        if (isNaN(inputValue)) {
            // If not a valid number, reset to current value
            this.value = ButtonState.value.currentGeneValue.toFixed(2);
            return;
        }
        
        // Update the slider to match the input value, but constrained to min/max for the visual slider
        if (inputValue >= minGeneValue && inputValue <= maxGeneValue) {
            // If within range, update slider position too
            geneSlider.value = inputValue;
        } else {
            // If beyond range, keep slider at min or max but allow the value to be used
            geneSlider.value = inputValue < minGeneValue ? minGeneValue : maxGeneValue;
        }
        
        // Update the gene value with the actual typed value (even if beyond limits)
        updateGeneValue(inputValue);
    });
    
    // Handle Enter key for input fields
    const handleEnterKey = (e) => {
        if (e.key === "Enter") document.activeElement.blur();
    };
    
    pointSizeSliderValue.addEventListener('keydown', handleEnterKey);
    geneSliderValue.addEventListener('keydown', handleEnterKey);
    
    // Subscribe to ButtonState to update gene expression slider
    ButtonState.subscribe(state => {
        if (state.minGeneValue <= 0 && state.maxGeneValue <= 0) return;
        
        // Update slider range
        geneSlider.min = state.minGeneValue;
        geneSlider.max = state.maxGeneValue;
        geneSliderValue.min = state.minGeneValue;
        geneSliderValue.max = state.maxGeneValue;
        
        // Update slider value
        if (state.currentGeneValue > 0) {
            geneSlider.value = state.currentGeneValue;
            geneSliderValue.value = state.currentGeneValue.toFixed(2);
        } else {
            // Default to 99th percentile
            const defaultValue = state.minGeneValue + (state.maxGeneValue - state.minGeneValue) * 0.99;
            geneSlider.value = defaultValue;
            geneSliderValue.value = defaultValue.toFixed(2);
        }
        
        // Update min/max labels
        if (geneMinId && geneMaxId) {
            geneMinId.textContent = state.minGeneValue.toFixed(2);
            geneMaxId.textContent = state.maxGeneValue.toFixed(2);
        }
    });
}