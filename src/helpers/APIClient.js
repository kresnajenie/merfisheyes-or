// /src/helpers/APIClient.js
// Function to fetch data from the API and return an Observable using async/await

import pako from "pako";

export async function fetchDataFromAPI(columnName, prefix) {

    const response = await fetch(
        `https://or-be-gz.merfisheyes.com/get-gz-file?gene=${columnName}&dbname=genedb-or&dbcollection=${prefix}&username=dulac&csv_filename=${prefix}_matrix.csv`
    );

    if (!response.ok) {
        console.error(`Failed to fetch data for column: ${columnName}`);
        return [];
    }

    try {
        // Decompress the .gz file
        const compressedData = await response.arrayBuffer();
        const data = pako.inflate(compressedData, { to: "string" });

        // console.log("Raw Data:", data); // Debugging

        // ✅ Trim, Split by Comma, Convert to Numbers
        const parsedData = data
            .trim() // Remove any leading/trailing whitespace
            .split(",") // Split by comma
            .slice(1)
            .map(value => {
                const num = parseFloat(value); 
                return isNaN(num) ? value : num; // Convert to number if possible
            });
        if (columnName == "clusters") {
            console.log("Parsed Data:", parsedData); // Debugging
        }
        return parsedData;

    } catch (error) {
        console.error(`Error processing data for ${columnName}:`, error);
        return [];
    }
    
}

export async function fetchConstAPI(columnName, prefix) {
    const response = await fetch(`https://or-be-gz.merfisheyes.com/get-gene-values?gene=${columnName}&dbname=genedb-or&dbcollection=${prefix}&username=dulac&csv_filename=${prefix}_matrix.csv`);

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (data === undefined || data.gene_values == undefined) {
        return '[]';
    }
    let _d;
    if (columnName == "clusters_pal") {
        _d = data.gene_values.split(',')
        .filter(item => item !== "")
        .map(item => item.slice(0, -3)); // Removes the last two characters
    } else {
        _d = data.gene_values.split(',')
        .filter(item => item !== "")
    }



    _d.shift()
    return _d;
}