// /src/helpers/APIClient.js
// Direct S3 fetches. Files at <BASE>/<prefix>/cols/<name>.gz are served with
// Content-Encoding: gzip, so the browser auto-decompresses — no pako needed.

const DATA_BASE =
    import.meta.env.VITE_DATA_BASE ||
    "https://ob-moe-reorder.s3.us-west-2.amazonaws.com/v1";

export function dataBase() {
    return DATA_BASE;
}

/**
 * Fetch a single column file (one CSV line: "<name>,<v0>,<v1>,...").
 * Returns the values array with the leading column-name token stripped.
 * Numeric values are parsed via parseFloat; non-numeric tokens (e.g. cluster
 * names in the `clusters` column) are preserved as strings.
 */
export async function fetchColumn(prefix, name) {
    const url = `${DATA_BASE}/${prefix}/cols/${encodeURIComponent(name)}.gz`;
    const response = await fetch(url);
    if (!response.ok) {
        console.error(`Failed to fetch column ${name} (${response.status}): ${url}`);
        return [];
    }
    const text = await response.text();
    return text
        .trim()
        .split(",")
        .slice(1)
        .map((value) => {
            const num = parseFloat(value);
            return isNaN(num) ? value : num;
        });
}

export async function fetchGenes(prefix) {
    const url = `${DATA_BASE}/${prefix}/genes.json`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch genes (${response.status}): ${url}`);
    }
    return response.json();
}

export async function fetchPalette(prefix) {
    const url = `${DATA_BASE}/${prefix}/palette.json`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch palette (${response.status}): ${url}`);
    }
    return response.json();
}

export async function fetchReorder(prefix) {
    const url = `${DATA_BASE}/${prefix}/reorder.json`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch reorder (${response.status}): ${url}`);
    }
    return response.json();
}
