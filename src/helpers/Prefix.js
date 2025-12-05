import { ApiState } from "../states/ApiState";
import { changeURL } from "./URL";

/**
 * Function to load prefix options into the dropdown menu.
 */
export function loadPrefixOptions() {
    const prefixOptions = ApiState.value.prefixOptions;

    const prefixDropdown = document.querySelector('#prefix-dropdown-container .dropdown-menu');

    for (let i = 0; i < prefixOptions.length; i++) {
        const prefixItem = document.createElement('p');
        prefixItem.innerHTML = `<a class="dropdown-item">${prefixOptions[i]}</a>`

        prefixDropdown.appendChild(prefixItem);
    }
}

export function selectPrefix() {
    const dropdownMenuButton = document.getElementById("dropdownMenuButton");
    const prefixItems = document.getElementsByClassName("dropdown-item");

    for (let i = 0; i < prefixItems.length; i++) {
        
        prefixItems.item(i).addEventListener("click", () => {
            const displayName = prefixItems.item(i).innerText;
            const actualPrefix = ApiState.value.prefixMapping[displayName];

            const params = new URLSearchParams(""); // clears out the params

            // Use the actual prefix value for the API
            params.append('prefix', actualPrefix);
            changeURL(params);

            if (actualPrefix !== ApiState.value.prefix) {
                // Display the user-friendly name in the dropdown
                dropdownMenuButton.innerHTML = displayName;
                window.location.reload();
            }
        })
    }
}