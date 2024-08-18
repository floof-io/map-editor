import { compressString, decompressString } from "./lib/util.js";

const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

let selectedBrush = 0;

const colors = {
    antHell: "#8E603F",
    desert: "#E0D1AF",
    garden: "#1EA761",
    hell: "#973332",
    ocean: "#66869E",
    sewers: "#666633",
    dirt: "#68472E"
};

const options = {};

document.querySelectorAll(".brush").forEach(brush => {
    const brushID = parseInt(brush.getAttribute("data-value"));

    brush.addEventListener("click", () => {
        if (selectedBrush !== null) {
            document.querySelector(`.brush[data-value="${selectedBrush}"]`).classList.remove("selected");
        }

        brush.classList.add("selected");
        selectedBrush = brushID
    });

    options[brushID] = {};

    brush.querySelectorAll(".option").forEach(input => {
        const label = input.querySelector("label");
        const labelText = label.textContent;
        const inputElement = input.querySelector("input");

        if (inputElement) {
            options[brushID][labelText] = inputElement.value;

            inputElement.addEventListener("input", () => {
                const value = inputElement.value;
                options[brushID][labelText] = value;

                label.textContent = `${labelText}: ${value}`;
            });
        } else {
            const select = input.querySelector("select");
            options[brushID][labelText] = select.value;

            select.addEventListener("change", () => {
                const value = select.value;
                options[brushID][labelText] = value;
            });
        }
    });
});

const box = {
    x: 0,
    y: 0,
    size: 1
};

class MapFeature {
    static TYPE_SPAWNPOINT = 0;
    static TYPE_MOB_SPAWNER = 1;

    constructor(centerX, centerY, type) { }
}

class Map {
    constructor(width, height) {
        this.cells = [];

        this.sizeTo(width, height);

        /** @type {MapFeature[]} */
        this.features = [];
    }

    sizeTo(width, height) {
        this.width = width;
        this.height = height;

        this.cells = new Array(width * height).fill(0);
    }

    get(x, y) {
        return this.cells[y * this.width + x];
    }

    set(x, y, value) {
        this.cells[y * this.width + x] = value;
    }

    fill(value) {
        for (let i = 0; i < this.cells.length; i++) {
            this.cells[i] = value;
        }
    }

    neighbors(x, y) {
        const neighbors = [];

        if (x > 0) {
            neighbors.push(this.get(x - 1, y));
        }

        if (x < this.width - 1) {
            neighbors.push(this.get(x + 1, y));
        }

        if (y > 0) {
            neighbors.push(this.get(x, y - 1));
        }

        if (y < this.height - 1) {
            neighbors.push(this.get(x, y + 1));
        }

        return neighbors;
    }

    withinBrushSize(x, y, size) {
        if (size === 1) {
            return [[x, y]];
        }

        const output = [];
        const isEven = size % 2 === 0;

        size = Math.max(1, Math.floor(size / 2));

        if (isEven) {
            for (let i = x - size + 1; i <= x + size; i++) {
                for (let j = y - size + 1; j <= y + size; j++) {
                    if (i >= 0 && i < this.width && j >= 0 && j < this.height) {
                        output.push([i, j]);
                    }
                }
            }
        } else {
            for (let i = x - size; i <= x + size; i++) {
                for (let j = y - size; j <= y + size; j++) {
                    if (i >= 0 && i < this.width && j >= 0 && j < this.height) {
                        output.push([i, j]);
                    }
                }
            }
        }

        return output;
    }

    forEach(callback) {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                callback(x, y, this.get(x, y));
            }
        }
    }

    async getSaveData() {
        const myString = JSON.stringify(this.cells);
        const compressed = await compressString(myString);
        const decompressed = await decompressString(compressed);

        if (myString !== decompressed) {
            throw new Error("Compression failed");
        }

        return {
            width: this.width,
            height: this.height,
            data: compressed,
            compressionRate: compressed.length / myString.length,
            features: []
        };
    }
}

const map = new Map(90, 90);

function resize() {
    const styleWidth = getComputedStyle(canvas).width;
    const styleHeight = getComputedStyle(canvas).height;

    canvas.width = parseInt(styleWidth);
    canvas.height = parseInt(styleHeight);

    const min = Math.min(canvas.width, canvas.height) - 10;
    box.size = min;
    box.x = (canvas.width - min) / 2;
    box.y = (canvas.height - min) / 2;
}

window.addEventListener("resize", resize);
resize();

function draw() {
    requestAnimationFrame(draw);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cellSize = box.size / map.width;
    for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
            const layerIndex = map.get(x, y);

            switch (layerIndex) {
                case 0:
                    ctx.fillStyle = colors[options[0].Color];
                    break;
                case 1:
                    ctx.fillStyle = colors.dirt;
                    break;
            }

            ctx.fillRect(box.x + x * cellSize - .5, box.y + y * cellSize - .5, cellSize + 1, cellSize + 1);
        }
    }


    ctx.lineWidth = 5;
    ctx.strokeStyle = "black";
    ctx.strokeRect(box.x, box.y, box.size, box.size);
}

draw();

function paintCallback(e) {
    const x = Math.floor((e.clientX - canvas.offsetLeft - box.x) / (box.size / map.width));
    const y = Math.floor((e.clientY - canvas.offsetTop - box.y) / (box.size / map.height));

    if (x >= 0 && x < map.width && y >= 0 && y < map.height) {
        map.withinBrushSize(x, y, +options[selectedBrush]["Brush Width"]).forEach(([bx, by]) => {
            map.set(bx, by, selectedBrush);
        });
    }
}

canvas.addEventListener("click", paintCallback);
canvas.addEventListener("mousemove", e => {
    if (e.buttons === 1) {
        paintCallback(e);
    }
});

function snapshotImage(cellSize = 1) {
    const slicedCanvas = document.createElement("canvas");
    const slicedCtx = slicedCanvas.getContext("2d");

    slicedCanvas.width = map.width * cellSize;
    slicedCanvas.height = map.height * cellSize;

    map.forEach((x, y, value) => {
        switch (value) {
            case 0:
                slicedCtx.fillStyle = colors[options[0].Color];
                break;
            case 1:
                slicedCtx.fillStyle = colors.dirt;
                break;
        }

        slicedCtx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    });

    return slicedCanvas;
}

function getCellSize() {
    const promptValue = prompt("Cell Size in pixels", 8);
    let cellSize = parseInt(promptValue);

    if (!Number.isInteger(cellSize) || cellSize < 1) {
        cellSize = 8;
    }

    return cellSize;
}

function downloadImage() {
    const link = document.createElement("a");
    link.href = snapshotImage(getCellSize()).toDataURL();
    link.download = "image.png";
    link.click();
}

function copyImageToClipboard() {
    snapshotImage(getCellSize()).toBlob(blob => {
        const item = new ClipboardItem({
            "image/png": blob
        });

        navigator.clipboard.write([item]);
    });
}

document.querySelector("#actionRow").querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => {
        const action = button.getAttribute("data-action");

        switch (action) {
            case "download":
                downloadImage();
                break;
            case "copy":
                copyImageToClipboard();
                break;
            case "fill":
                map.fill(selectedBrush);
                break;
        }
    });
});

window.test = () => {
    map.getSaveData().then(console.log);
}