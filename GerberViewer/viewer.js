const board = document.getElementById("board");

let viewBox = [0, 0, 0, 0];
let isPanning = false;
let startPoint = { x: 0, y: 0 };
let startViewBox = [viewBox];

// To be filled with array from parent webpage depending on what we want to plot
const layers = [];
const layerColors = {};
const layerIds = [];

function namespaceSVG(svgElement, prefix) {
    const idMap = {};

    // 1. Rename all IDs
    svgElement.querySelectorAll("[id]").forEach(el => {
        const oldId = el.id;
        const newId = prefix + "_" + oldId;
        idMap[oldId] = newId;
        el.id = newId;
    });

    // 2. Fix attributes that reference IDs
    const rewriteValue = (value) => {
        if (!value) return value;

        // href="#id"
        if (value.startsWith("#") && idMap[value.slice(1)]) {
            return "#" + idMap[value.slice(1)];
        }

        // url(#id)
        const urlMatch = value.match(/^url\(#(.+)\)$/);
        if (urlMatch && idMap[urlMatch[1]]) {
            return `url(#${idMap[urlMatch[1]]})`;
        }

        return value;
    };

    svgElement.querySelectorAll("*").forEach(el => {
        for (const attr of el.getAttributeNames()) {
            const val = el.getAttribute(attr);
            const newVal = rewriteValue(val);
            if (newVal !== val) {
                el.setAttribute(attr, newVal);
            }
        }

        // 3. Fix inline style=""
        const style = el.getAttribute("style");
        if (style) {
            let newStyle = style;
            for (const oldId in idMap) {
                const regex = new RegExp(`url\\(#${oldId}\\)`, "g");
                newStyle = newStyle.replace(regex, `url(#${idMap[oldId]})`);
            }
            if (newStyle !== style) {
                el.setAttribute("style", newStyle);
            }
        }
    });

    // 4. Fix embedded <style> blocks
    svgElement.querySelectorAll("style").forEach(styleTag => {
        let css = styleTag.textContent;

        for (const oldId in idMap) {
            const idRegex = new RegExp(`#${oldId}\\b`, "g");
            const urlRegex = new RegExp(`url\\(#${oldId}\\)`, "g");

            css = css.replace(idRegex, `#${idMap[oldId]}`);
            css = css.replace(urlRegex, `url(#${idMap[oldId]})`);
        }

        styleTag.textContent = css;
    });
}

async function loadSVG(file) {
    const res = await fetch(file);
    const text = await res.text();
    const layerName = file.split("/").at(-1).replace(".svg", "");
    const doc = new DOMParser().parseFromString(text, "image/svg+xml");
    const svg = doc.documentElement;
    const importedSvg = document.importNode(svg, true);

    importedSvg.setAttribute("id", layerName);

    // Replace fill colors
    importedSvg.querySelectorAll('[style*="fill"]').forEach(el => {
        const style = el.getAttribute("style");

        if (!style.includes("fill:rgb(100%,100%,100%)")) {
            el.style.fill = layerColors[layerName];
            el.classList.add("layer-recolor");
        }
        else {
            el.style.fill = "rgb(0%,0%,0%)";
        }
    });

    // Replace stroke colors
    importedSvg.querySelectorAll('*').forEach(el => {
        const style = el.getAttribute("style");
        const strokeAttr = el.getAttribute("stroke");

        let stroke = null;

        if (style) {
            const match = style.match(/stroke\s*:\s*([^;]+)/i);
            if (match) stroke = match[1];
        }

        if (!stroke && strokeAttr) {
            stroke = strokeAttr;
        }

        if (stroke && stroke !== "none") {
            el.style.stroke = layerColors[layerName];
            el.classList.add("layer-recolor");
        }
    });

    // Replace ids with unique ids for this layer based off the layer name
    namespaceSVG(importedSvg, layerName);

    // Get the original viewBox or fallback to bbox
    let vb = svg.getAttribute("viewBox");
    let minX, minY, width, height;
    if (vb) {
        [minX, minY, width, height] = vb.split(" ").map(Number);
    } else {
        const bbox = svg.getBBox();
        minX = bbox.x;
        minY = bbox.y;
        width = bbox.width;
        height = bbox.height;
    }

    return { svgElement: importedSvg, minX, minY, width, height };
}

// Mouse down -> start panning
board.addEventListener("mousedown", (e) => {
    isPanning = true;
    startPoint = { x: e.clientX, y: e.clientY };
    startViewBox = [...viewBox];
    board.style.cursor = "grabbing";
});

// Mouse move -> pan
board.addEventListener("mousemove", (e) => {
    if (!isPanning) return;

    const dx = e.clientX - startPoint.x;
    const dy = e.clientY - startPoint.y;

    // Convert pixel delta to viewBox units
    const svgRect = board.getBoundingClientRect();
    const scaleX = viewBox[2] / svgRect.width;
    const scaleY = viewBox[3] / svgRect.height;

    viewBox[0] = startViewBox[0] - dx * scaleY;
    viewBox[1] = startViewBox[1] - dy * scaleY;

    board.setAttribute("viewBox", viewBox.join(" "));
});

// Mouse up -> stop panning
board.addEventListener("mouseup", () => {
    isPanning = false;
    board.style.cursor = "default";
});

// Mouse leave -> stop panning
board.addEventListener("mouseleave", () => {
    isPanning = false;
    board.style.cursor = "default";
});

// Mouse wheel -> scroll in/out
board.addEventListener("wheel", (e) => {
    e.preventDefault();

    const zoomFactor = 1.1;
    const svgRect = board.getBoundingClientRect();
    const mouseX = e.clientX - svgRect.left;
    const mouseY = e.clientY - svgRect.top;

    // Convert mouse position to SVG units
    const svgMouseX = viewBox[0] + (mouseX / svgRect.width) * viewBox[2];
    const svgMouseY = viewBox[1] + (mouseY / svgRect.height) * viewBox[3];

    if (e.deltaY < 0) { // zoom in
        viewBox[2] /= zoomFactor;
        viewBox[3] /= zoomFactor;
    } else { // zoom out
        viewBox[2] *= zoomFactor;
        viewBox[3] *= zoomFactor;
    }

    // Keep the zoom centered on mouse
    viewBox[0] = svgMouseX - (mouseX / svgRect.width) * viewBox[2];
    viewBox[1] = svgMouseY - (mouseY / svgRect.height) * viewBox[3];

    board.setAttribute("viewBox", viewBox.join(" "));
});

// Wait until the message with layer information is received from the parent HTML window
window.addEventListener("message", async (event) => {
    const receivedArray = event.data;
    console.log("Received array:", receivedArray);
    // Populate arrays
    let i = 0;
    let j = 0;
    while (receivedArray[j]) {
        layers[i] = receivedArray[j + 0];
        layerIds[i] = receivedArray[j + 2];
        layerColors[layerIds[i]] = receivedArray[j + 1];
        i = i + 1;
        j = j + 3;
    }

    const layerControls = document.getElementById("layerControls");

    layerIds.forEach(id => {
        const container = document.createElement("div");
        container.style.marginBottom = "4px";

        // --- Checkbox to toggle layer visibility ---
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = true; // show layer by default
        checkbox.dataset.layerId = id;

        checkbox.addEventListener("change", (e) => {
            const layer = document.getElementById(e.target.dataset.layerId);
            if (layer) {
                layer.style.display = e.target.checked ? "" : "none";
            }
        });

        // --- Color picker to change layer color ---
        const colorInput = document.createElement("input");
        colorInput.type = "color";
        colorInput.value = layerColors[id];
        colorInput.dataset.layerId = id;
        colorInput.style.marginLeft = "6px";

        colorInput.addEventListener("input", (e) => {
            console.log("recolor");
            const layer = document.getElementById(e.target.dataset.layerId);
            if (layer) {
                layer.querySelectorAll('.layer-recolor').forEach(el => {
                    el.setAttribute("fill", e.target.value);
                });
            }
        });

        // --- Label ---
        const label = document.createElement("span");
        label.textContent = " " + id;

        // --- Append controls ---
        container.appendChild(checkbox);
        container.appendChild(colorInput);
        container.appendChild(label);

        layerControls.appendChild(container);
    });

    let globalMinX = Infinity, globalMinY = Infinity, globalMaxX = -Infinity, globalMaxY = -Infinity;

    const loadedLayers = [];
    for (const file of layers) {
        const { svgElement, minX, minY, width, height } = await loadSVG(file);
        loadedLayers.push({ svgElement, minX, minY, width, height, maxX: minX + width, maxY: minY + height, file });
    }

    for (const layer of loadedLayers) {
        // Don't bother plot layers with zero width or zero height
        if (layer.width === 0 || layer.height === 0) continue;

        globalMinX = Math.min(globalMinX, layer.minX);
        globalMinY = Math.min(globalMinY, layer.minY);
        globalMaxX = Math.max(globalMaxX, layer.maxX);
        globalMaxY = Math.max(globalMaxY, layer.maxY);

        layer.svgElement.setAttribute("id", layerIds[layers.indexOf(layer.file)]);
        board.appendChild(layer.svgElement);
    }

    // Set viewBox to reference layer size
    viewBox = [globalMinX, globalMinY, globalMaxX - globalMinX, globalMaxY - globalMinY];
    //viewBox = [235, 525, 300, 300];
    board.setAttribute("viewBox", viewBox.join(" "));
    console.log(viewBox);
});