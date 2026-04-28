// /src/helpers/LoadFunctions.js
import { fetchColumn, fetchGenes, fetchPalette, fetchReorder } from './APIClient';
import { updateDataPalette, updateGenes, ApiState, updateGroups } from '../states/ApiState';
import { updateDataItems } from '../states/MatrixState';

const prefix = ApiState.value.prefix;

export async function loadPallete() {
    try {
        const dictionary = await fetchPalette(prefix);
        updateDataPalette(dictionary);
    } catch (error) {
        console.error('Failed to load palette:', error);
    }
}

export async function loadGenes() {
    try {
        const genes = await fetchGenes(prefix);
        updateGenes(genes);
    } catch (error) {
        console.error('Failed to load genes:', error);
    }
}

/**
 * Reorders an array based on a list of indexes
 * @param {Array} data - The original array to reorder
 * @param {Array<number>} indexes - Array of indexes specifying the new order
 * @returns {Array} - The reordered array
 */
export function reorderByIndexes(data, indexes) {
    return indexes.map(index => data[index]);
}

export async function loadItems() {
    let columns = ApiState.value.columns;
    const prefix = ApiState.value.prefix;
    if (prefix == "moe") {
        columns = [
            'X_spatial0_norm',
            'X_spatial1_norm',
            'clusters',
        ];
    }

    const transformedData = {};
    const jsonData = [];

    try {
        const results = await Promise.all(columns.map(col => fetchColumn(prefix, col)));
        columns.forEach((col, index) => {
            transformedData[col] = results[index];
        });

        for (let i = 0; i < transformedData.X_spatial0_norm.length; i++) {
            const row = {};
            for (const key in transformedData) {
                row[key] = transformedData[key][i];
            }
            jsonData.push(row);
        }

        if (prefix == "moe") {
            const newOrder = await fetchReorder('moe');
            ApiState.value.reorder = newOrder;
            const reorderedData = reorderByIndexes(jsonData, newOrder);
            updateDataItems(reorderedData);
        } else {
            updateDataItems(jsonData);
        }
    } catch (error) {
        console.error('Error combining data:', error);
    }
}

export async function loadGroups() {
    try {
        const data = await fetchColumn(prefix, "hierarchical_clusters");
        updateGroups(JSON.parse(data));
    } catch (error) {
        console.error('Failed to load groups:', error);
    }
}
