const canvasElement = document.getElementById('paintCanvas');
const saveButton = document.getElementById('saveBtn');
const clearButton = document.getElementById('clearBtn');
const thicknessDown = document.getElementById('thicknessDown');
const thicknessUp = document.getElementById('thicknessUp');
const thicknessValue = document.getElementById('thicknessValue');
const toolButtons = [...document.querySelectorAll('[data-tool]')];
const menuToggle = document.getElementById('menuToggle');
const drawerScrim = document.getElementById('drawerScrim');
const optionsPanel = document.getElementById('optionsPanel');
const colorTrigger = document.getElementById('colorTrigger');
const colorSwatchPreview = document.getElementById('colorSwatchPreview');
const colorPopover = document.getElementById('colorPopover');
const iroMount = document.getElementById('iroMount');
const swatchRow = document.getElementById('swatchRow');
const hexInput = document.getElementById('hexInput');
const colorTriggerMobile = document.getElementById('colorTriggerMobile');

const PRESET_COLORS = ['#171717', '#ffffff', '#e03e3e', '#e3a004', '#2f9e44', '#1971c2'];
const MAX_RECENT = 5;
let recentColors = [];
let ink = hexToRgba(colorTrigger ? hexInput.value : '#171717');

function hexToRgba(hex) {
    const match = /^#?([0-9a-f]{3,8})$/i.exec(hex.trim());
    if (!match) return null;
    let digits = match[1];
    if (digits.length === 3) digits = digits.split('').map((c) => c + c).join('');
    if (digits.length !== 6 && digits.length !== 8) return null;
    const value = parseInt(digits, 16);
    if (digits.length === 6) {
        const rgb = parseInt(digits, 16);
        return `rgba(${(rgb >>> 16) & 0xff}, ${(rgb >>> 8) & 0xff}, ${rgb & 0xff}, 1)`;
    }
    return `rgba(${(value >>> 24) & 0xff}, ${(value >>> 16) & 0xff}, ${(value >>> 8) & 0xff}, ${(value & 0xff) / 255})`;
}
let strokeWidth = 2;

function setDrawerOpen(open) {
    document.body.classList.toggle('drawer-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close drawing options' : 'Open drawing options');
}

menuToggle.addEventListener('click', () => {
    setDrawerOpen(menuToggle.getAttribute('aria-expanded') !== 'true');
});
drawerScrim.addEventListener('click', () => setDrawerOpen(false));
optionsPanel.addEventListener('click', (event) => {
    if (event.target.closest('[data-tool]')) setDrawerOpen(false);
});
window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setDrawerOpen(false);
});

function applyInk(rgbaString, { commit = false } = {}) {
    ink = rgbaString;
    colorSwatchPreview.style.setProperty('background-color', rgbaString);
    document.documentElement.style.setProperty('--ink-color', rgbaString);
    if (commit) rememberColor(rgbaString);
    selectedObjects().forEach((object) => {
        if (object instanceof fabric.FabricText) {
            object.set('fill', rgbaString);
        } else {
            object.set('stroke', rgbaString);
            // arrows are filled paths: their body must follow the ink too
            if (object instanceof fabric.Path && object.fill) object.set('fill', rgbaString);
        }
    });
    canvas.requestRenderAll();
    markActiveSwatch(rgbaString);
}

function rgbaMatches(candidate, rgbaString) {
    return candidate.replace(/\s/g, '') === rgbaString.replace(/\s/g, '');
}

function markActiveSwatch(rgbaString) {
    swatchRow.querySelectorAll('.swatch').forEach((swatch) => {
        swatch.classList.toggle('active', rgbaMatches(swatch.dataset.rgba || '', rgbaString));
    });
}

function rememberColor(rgbaString) {
    if (/rgba\(\d+, \d+, \d+, 0(?:\.0+)?\)$/i.test(rgbaString)) return; // ignore fully transparent
    recentColors = recentColors.filter((color) => !rgbaMatches(color, rgbaString));
    recentColors.unshift(rgbaString);
    recentColors = recentColors.slice(0, MAX_RECENT);
    renderSwatches();
}

function makeSwatch(rgbaString, title) {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'swatch';
    swatch.title = title;
    swatch.dataset.rgba = rgbaString;
    swatch.setAttribute('aria-label', title);
    // inner layer paints the ink over the CSS checkerboard so transparency is visible
    const fill = document.createElement('span');
    fill.style.display = 'block';
    fill.style.width = '100%';
    fill.style.height = '100%';
    fill.style.borderRadius = 'inherit';
    fill.style.backgroundColor = rgbaString;
    swatch.appendChild(fill);
    return swatch;
}

function addSwatch(rgbaString, title) {
    const swatch = makeSwatch(rgbaString, title);
    swatch.addEventListener('click', () => {
        iroPicker.color.set(rgbaString);
        const resolved = iroPicker.color.rgbaString;
        hexInput.value = iroPicker.color.hex8String;
        applyInk(resolved, { commit: true });
    });
    swatchRow.appendChild(swatch);
}

function renderSwatches() {
    swatchRow.textContent = '';
    [...PRESET_COLORS, ...recentColors].forEach((hex) => addSwatch(hex, `Use ${hex}`));
    markActiveSwatch(ink);
}

const iroPicker = new iro.ColorPicker(iroMount, {
    width: 210,
    color: '#171717',
    borderWidth: 0,
    padding: 0,
    layout: [
        { component: iro.ui.Wheel, options: { wheelLightness: 1, wheelAngle: 270, wheelDirection: 'anticlockwise' } },
        { component: iro.ui.Slider, options: { sliderType: 'value' } },
        { component: iro.ui.Slider, options: { sliderType: 'alpha' } }
    ]
});
window.iroPicker = iroPicker; // expose for console debugging

iroPicker.on('color:change', (color) => {
    hexInput.value = color.hex8String;
    applyInk(color.rgbaString);
});

hexInput.addEventListener('change', () => {
    const rgba = hexToRgba(hexInput.value);
    if (rgba) {
        iroPicker.color.set(hexInput.value);
        applyInk(rgba, { commit: true });
    } else {
        hexInput.value = iroPicker.color.hex8String;
    }
});

function setColorPopoverOpen(open) {
    colorPopover.hidden = !open;
    colorTrigger.setAttribute('aria-expanded', String(open));
    if (open) markActiveSwatch(ink);
}

colorTrigger.addEventListener('click', (event) => {
    event.stopPropagation();
    setColorPopoverOpen(colorPopover.hidden);
});

if (colorTriggerMobile) {
    colorTriggerMobile.addEventListener('click', (event) => {
        event.stopPropagation();
        setColorPopoverOpen(colorPopover.hidden);
    });
}

colorPopover.addEventListener('click', (event) => event.stopPropagation());
colorPopover.addEventListener('pointerdown', (event) => event.stopPropagation());
colorPopover.addEventListener('mousedown', (event) => event.stopPropagation());
colorPopover.addEventListener('touchstart', (event) => event.stopPropagation(), { passive: true });

document.addEventListener('pointerdown', (event) => {
    const onTrigger = event.target === colorTrigger || (colorTriggerMobile && colorTriggerMobile.contains(event.target));
    if (!colorPopover.hidden && !colorPopover.contains(event.target) && !onTrigger) {
        setColorPopoverOpen(false);
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !colorPopover.hidden) {
        setColorPopoverOpen(false);
        colorTrigger.focus();
    }
});

const canvas = new fabric.Canvas(canvasElement, {
    backgroundColor: '#ffffff',
    preserveObjectStacking: true,
    selection: true,
    selectionColor: 'rgba(227, 160, 4, 0.28)',
    selectionBorderColor: '#e3a004',
    stopContextMenu: true
});

let activeTool = 'select';
let activeShape = null;
let dragStart = null;
let freehandPoints = [];

/* ------------------------------------------------------------------
   Infinite canvas: zoom + pan, with a coordinate grid that is drawn in
   scene space so it moves, stretches and scales with everything else.
   ------------------------------------------------------------------ */
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 12;
const GRID_SIZE = 50;        // scene units between minor grid lines
const GRID_MAJOR = 5;        // every 5th line is a major line
let isPanning = false;
let panStart = null;
let spaceHeld = false;

function clampZoom(value) {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function renderGrid(ctx) {
    const vpt = canvas.viewportTransform;
    const zoom = vpt[0] || 1;
    const width = canvas.width;
    const height = canvas.height;

    // visible scene bounds (the canvas is infinite, so only draw in view)
    const topLeft = fabric.util.transformPoint({ x: 0, y: 0 }, fabric.util.invertTransform(vpt));
    const bottomRight = fabric.util.transformPoint({ x: width, y: height }, fabric.util.invertTransform(vpt));

    // three tiers: minor 50, major 250, labels 250
    const minorStep = GRID_SIZE;
    const majorStep = GRID_SIZE * GRID_MAJOR;
    const showMinor = zoom * GRID_SIZE >= 8;

    ctx.save();
    ctx.lineWidth = 1 / zoom; // stay 1 screen pixel at any zoom

    const drawLines = (step, color) => {
        const startX = Math.floor(topLeft.x / step) * step;
        const startY = Math.floor(topLeft.y / step) * step;
        ctx.beginPath();
        for (let x = startX; x <= bottomRight.x; x += step) {
            ctx.moveTo(x, topLeft.y);
            ctx.lineTo(x, bottomRight.y);
        }
        for (let y = startY; y <= bottomRight.y; y += step) {
            ctx.moveTo(topLeft.x, y);
            ctx.lineTo(bottomRight.x, y);
        }
        ctx.strokeStyle = color;
        ctx.stroke();
    };

    if (showMinor) drawLines(minorStep, 'rgba(0, 0, 0, 0.08)');
    drawLines(majorStep, 'rgba(0, 0, 0, 0.18)');
    drawLines(majorStep * GRID_MAJOR, 'rgba(0, 0, 0, 0.28)');

    // axes through the scene origin
    ctx.beginPath();
    ctx.moveTo(topLeft.x, 0);
    ctx.lineTo(bottomRight.x, 0);
    ctx.moveTo(0, topLeft.y);
    ctx.lineTo(0, bottomRight.y);
    ctx.strokeStyle = 'rgba(197, 138, 0, 0.55)';
    ctx.stroke();

    // ruler labels every major interval; thin them out when zoomed far out
    let labelStep = majorStep;
    while (zoom * labelStep < 46) labelStep *= GRID_MAJOR;
    {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.font = `${11 / zoom}px -apple-system, Segoe UI, Roboto, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const startX = Math.floor(topLeft.x / labelStep) * labelStep;
        const startY = Math.floor(topLeft.y / labelStep) * labelStep;
        const axisY = Math.min(Math.max(0, topLeft.y), bottomRight.y);
        const axisX = Math.min(Math.max(0, topLeft.x), bottomRight.x);
        for (let x = startX; x <= bottomRight.x; x += labelStep) {
            if (x === 0) continue;
            ctx.fillText(String(x), x + 3 / zoom, axisY + 4 / zoom);
        }
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let y = startY; y <= bottomRight.y; y += labelStep) {
            if (y === 0) continue;
            ctx.fillText(String(y), axisX - 4 / zoom, y + 3 / zoom);
        }
    }

    ctx.restore();
}

// keep the coordinate grid behind every object but above the white background
const originalRenderBackground = canvas._renderBackground.bind(canvas);
canvas._renderBackground = function renderBackgroundWithGrid(ctx) {
    originalRenderBackground(ctx);
    ctx.save();
    const vpt = canvas.viewportTransform;
    ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);
    renderGrid(ctx);
    ctx.restore();
};

function zoomToPoint(point, zoom) {
    canvas.zoomToPoint(point || new fabric.Point(canvas.width / 2, canvas.height / 2), clampZoom(zoom));
    canvas.requestRenderAll();
}

function zoomBy(factor, point) {
    zoomToPoint(point, canvas.getZoom() * factor);
}

function homeTransform() {
    // put the scene origin in the middle of the viewport so the axes are visible
    return [1, 0, 0, 1, canvas.width / 2, canvas.height / 2];
}

function resetView() {
    canvas.setViewportTransform(homeTransform());
    canvas.requestRenderAll();
}

// Ctrl/Cmd +/-/0
window.addEventListener('keydown', (event) => {
    if (event.code === 'Space') spaceHeld = true;
    const accel = event.ctrlKey || event.metaKey;
    if (!accel) return;
    if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        zoomBy(1.2);
    } else if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        zoomBy(1 / 1.2);
    } else if (event.key === '0') {
        event.preventDefault();
        resetView();
    }
});
window.addEventListener('keyup', (event) => {
    if (event.code === 'Space') spaceHeld = false;
});

// mouse wheel + trackpad pinch (ctrlKey is set by browsers for pinch gestures)
canvas.on('mouse:wheel', (event) => {
    const wheel = event.e;
    if (wheel.ctrlKey || wheel.altKey || wheel.metaKey) {
        wheel.preventDefault();
        wheel.stopPropagation();
        zoomBy(wheel.deltaY < 0 ? 1.08 : 1 / 1.08, new fabric.Point(wheel.offsetX, wheel.offsetY));
        return;
    }
    // plain wheel pans the infinite canvas
    wheel.preventDefault();
    wheel.stopPropagation();
    const vpt = canvas.viewportTransform.slice();
    vpt[4] -= wheel.deltaX;
    vpt[5] -= wheel.deltaY;
    canvas.setViewportTransform(vpt);
    canvas.requestRenderAll();
});

// middle-button or space+drag panning, available in every tool
canvas.on('mouse:down', (event) => {
    const original = event.e;
    if (original.button === 1 || spaceHeld) {
        isPanning = true;
        panStart = { x: original.clientX, y: original.clientY };
        canvas.setCursor('grabbing');
    }
});
canvas.on('mouse:move', (event) => {
    if (!isPanning || !panStart) return;
    const original = event.e;
    const vpt = canvas.viewportTransform.slice();
    vpt[4] += original.clientX - panStart.x;
    vpt[5] += original.clientY - panStart.y;
    panStart = { x: original.clientX, y: original.clientY };
    canvas.setViewportTransform(vpt);
    canvas.requestRenderAll();
});
canvas.on('mouse:up', () => {
    if (!isPanning) return;
    isPanning = false;
    panStart = null;
    canvas.setCursor(canvas.defaultCursor || 'default');
});

// touch: one finger pans, two fingers pinch-zoom
const activeTouches = new Map();
let pinchStart = null;

canvasElement.addEventListener('touchstart', (event) => {
    for (const touch of event.changedTouches) activeTouches.set(touch.identifier, touch);
    if (activeTouches.size === 2) {
        const [a, b] = [...activeTouches.values()];
        pinchStart = {
            distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
            zoom: canvas.getZoom(),
            center: new fabric.Point((a.clientX + b.clientX) / 2 - canvasElement.getBoundingClientRect().left,
                (a.clientY + b.clientY) / 2 - canvasElement.getBoundingClientRect().top)
        };
        // a pinch must not leave a half-drawn shape behind
        if (activeShape) {
            canvas.remove(activeShape);
            activeShape = null;
            dragStart = null;
            freehandPoints = [];
        }
    }
}, { passive: true });

canvasElement.addEventListener('touchmove', (event) => {
    for (const touch of event.changedTouches) activeTouches.set(touch.identifier, touch);
    if (activeTouches.size !== 2 || !pinchStart) return;
    event.preventDefault();
    const [a, b] = [...activeTouches.values()];
    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    if (!pinchStart.distance) return;
    zoomToPoint(pinchStart.center, pinchStart.zoom * (distance / pinchStart.distance));
}, { passive: false });

function endTouch(event) {
    for (const touch of event.changedTouches) activeTouches.delete(touch.identifier);
    if (activeTouches.size < 2) pinchStart = null;
}
canvasElement.addEventListener('touchend', endTouch, { passive: true });
canvasElement.addEventListener('touchcancel', endTouch, { passive: true });

renderSwatches();
applyInk(ink);

function setTool(tool) {
    activeTool = tool;
    activeShape = null;
    dragStart = null;
    freehandPoints = [];
    canvas.isDrawingMode = false;
    canvas.selection = tool === 'select';
    canvas.skipTargetFind = !['select', 'fill'].includes(tool);
    canvas.defaultCursor = tool === 'fill' ? 'cell' : (tool === 'select' ? 'default' : 'crosshair');
    canvas.forEachObject((object) => {
        object.selectable = tool === 'select';
        object.evented = tool === 'select';
    });

    toolButtons.forEach((button) => {
        const selected = button.dataset.tool === tool;
        button.classList.toggle('active', selected);
        button.setAttribute('aria-pressed', String(selected));
    });
    canvas.requestRenderAll();
}

function pointFor(event) {
    return event.scenePoint || canvas.getPointer(event.e);
}

function createShape(kind, start) {
    const common = {
        left: start.x,
        top: start.y,
        fill: 'rgba(0,0,0,0)',
        stroke: ink,
        strokeWidth,
        objectCaching: false,
        selectable: false,
        evented: false,
        originX: 'left',
        originY: 'top'
    };

    if (kind === 'rectangle') return new fabric.Rect({ ...common, width: 1, height: 1 });
    if (kind === 'ellipse') return new fabric.Ellipse({ ...common, rx: 0.5, ry: 0.5 });
    if (kind === 'line') {
        return new fabric.Line([start.x, start.y, start.x + 1, start.y + 1], {
            ...common,
            fill: null,
            strokeLineCap: 'round',
            strokeUniform: true
        });
    }
    return null;
}

// a plain line with a triangular arrow head only at the end point
function createArrow(start, end) {
    const headLength = 12 + strokeWidth * 2;
    const headWidth = 5 + strokeWidth * 0.8;
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const left = new fabric.Point(
        end.x - Math.cos(angle) * headLength - Math.sin(angle) * headWidth,
        end.y - Math.sin(angle) * headLength + Math.cos(angle) * headWidth
    );
    const right = new fabric.Point(
        end.x - Math.cos(angle) * headLength + Math.sin(angle) * headWidth,
        end.y - Math.sin(angle) * headLength - Math.cos(angle) * headWidth
    );
    // line stops at the arrow base so it does not poke through the head
    const base = new fabric.Point(
        end.x - Math.cos(angle) * headLength,
        end.y - Math.sin(angle) * headLength
    );
    const commands = [
        ['M', start.x, start.y],
        ['L', base.x, base.y],
        ['M', left.x, left.y],
        ['L', end.x, end.y],
        ['L', right.x, right.y],
        ['Z']
    ];
    return new fabric.Path(commands, {
        fill: ink,
        stroke: ink,
        strokeWidth,
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
        objectCaching: false,
        selectable: false,
        evented: false
    });
}

function createFreehandPath(points) {
    const commands = [['M', points[0].x, points[0].y]];
    for (let index = 1; index < points.length; index += 1) {
        commands.push(['L', points[index].x, points[index].y]);
    }
    if (points.length === 1) {
        commands.push(['L', points[0].x + 0.1, points[0].y + 0.1]);
    }
    return new fabric.Path(commands, {
        fill: null,
        stroke: ink,
        strokeWidth,
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
        objectCaching: false,
        selectable: false,
        evented: false
    });
}

function addText(point) {
    const text = new fabric.IText('Text', {
        left: point.x,
        top: point.y,
        fontFamily: 'Arial, sans-serif',
        fontSize: 24,
        fill: ink,
        editable: true
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    text.enterEditing();
    text.selectAll();
    setTool('select');
}

function floodFill(x, y, fillColor) {
    const ctx = canvas.getContext();
    const width = canvas.width;
    const height = canvas.height;
    const image = ctx.getImageData(0, 0, width, height);
    const data = image.data;
    const startX = Math.round(x);
    const startY = Math.round(y);
    const index = (startY * width + startX) * 4;
    const target = [data[index], data[index + 1], data[index + 2], data[index + 3]];

    // parse "rgba(r, g, b, a)"
    const parts = fillColor.match(/rgba?\(([^)]+)\)/i)[1].split(',').map(Number);
    const fill = [parts[0], parts[1], parts[2], Math.round((parts[3] ?? 1) * 255)];
    if (target.every((value, i) => Math.abs(value - fill[i]) < 10)) return; // already filled

    const visited = new Uint8Array(width * height);
    const queue = [[startX, startY]];
    while (queue.length) {
        const [cx, cy] = queue.pop();
        if (cx < 0 || cy < 0 || cx >= width || cy >= height) continue;
        const key = cy * width + cx;
        if (visited[key]) continue;
        visited[key] = 1;
        const i = key * 4;
        if (Math.abs(data[i] - target[0]) > 10 ||
            Math.abs(data[i + 1] - target[1]) > 10 ||
            Math.abs(data[i + 2] - target[2]) > 10 ||
            Math.abs(data[i + 3] - target[3]) > 10) continue;
        data[i] = fill[0];
        data[i + 1] = fill[1];
        data[i + 2] = fill[2];
        data[i + 3] = fill[3];
        queue.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
    ctx.putImageData(image, 0, 0);
}

function fillAt(point) {
    // find the topmost object under the click so fills stay editable/vector
    const fabricPoint = new fabric.Point(point.x, point.y);
    const objects = canvas.getObjects();
    let target = null;
    for (let index = objects.length - 1; index >= 0; index -= 1) {
        const object = objects[index];
        if (object.containsPoint && object.containsPoint(fabricPoint)) {
            target = object;
            break;
        }
    }
    if (target && !(target instanceof fabric.FabricText) && target.fill !== undefined) {
        target.set('fill', ink);
        target.setCoords();
        canvas.requestRenderAll();
        return;
    }
    // fallback: pixel flood fill on the flattened canvas
    floodFill(point.x, point.y, ink);
    canvas.requestRenderAll();
}

canvas.on('mouse:down', (event) => {
    const point = pointFor(event);
    if (activeTool === 'text') {
        addText(point);
        return;
    }
    if (activeTool === 'fill') {
        fillAt(point);
        return;
    }
    if (activeTool === 'freehand') {
        freehandPoints = [point];
        activeShape = createFreehandPath(freehandPoints);
        canvas.add(activeShape);
        return;
    }
    if (!['rectangle', 'ellipse', 'line', 'connector'].includes(activeTool)) return;

    dragStart = point;
    activeShape = activeTool === 'connector'
        ? createArrow(point, { x: point.x + 1, y: point.y + 1 })
        : createShape(activeTool, point);
    canvas.add(activeShape);
});

canvas.on('mouse:move', (event) => {
    if (!activeShape) return;
    const point = pointFor(event);

    if (activeTool === 'freehand') {
        const previousPath = activeShape;
        freehandPoints.push(point);
        activeShape = createFreehandPath(freehandPoints);
        canvas.remove(previousPath);
        canvas.add(activeShape);
        return;
    }

    if (!dragStart) return;
    const left = Math.min(dragStart.x, point.x);
    const top = Math.min(dragStart.y, point.y);
    const width = Math.max(Math.abs(point.x - dragStart.x), 1);
    const height = Math.max(Math.abs(point.y - dragStart.y), 1);

    if (activeTool === 'rectangle') {
        activeShape.set({ left, top, width, height });
    } else if (activeTool === 'ellipse') {
        activeShape.set({ left, top, rx: width / 2, ry: height / 2 });
    } else if (activeTool === 'connector') {
        const previousArrow = activeShape;
        activeShape = createArrow(dragStart, point);
        canvas.remove(previousArrow);
        canvas.add(activeShape);
    } else {
        const previousLine = activeShape;
        activeShape = createShape(activeTool, dragStart);
        activeShape.set({ x1: dragStart.x, y1: dragStart.y, x2: point.x, y2: point.y });
        canvas.remove(previousLine);
        canvas.add(activeShape);
    }

    activeShape.setCoords();
    canvas.requestRenderAll();
});

canvas.on('mouse:up', () => {
    if (activeShape) {
        activeShape.selectable = true;
        activeShape.evented = true;
        activeShape.setCoords();
    }
    activeShape = null;
    dragStart = null;
    freehandPoints = [];
    canvas.requestRenderAll();
    if (activeTool === 'text') setTool('select');
});

toolButtons.forEach((button) => button.addEventListener('click', () => setTool(button.dataset.tool)));

function selectedObjects() {
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return [];
    return activeObject instanceof fabric.ActiveSelection ? activeObject.getObjects() : [activeObject];
}

function changeThickness(delta) {
    strokeWidth = Math.max(1, strokeWidth + delta);
    thicknessValue.value = `${strokeWidth} px`;
    thicknessValue.textContent = `${strokeWidth} px`;
    selectedObjects().forEach((object) => {
        if (!(object instanceof fabric.FabricText) && typeof object.strokeWidth === 'number') {
            object.set('strokeWidth', strokeWidth);
            object.setCoords();
        }
    });
    canvas.requestRenderAll();
}

thicknessDown.addEventListener('click', () => changeThickness(-1));
thicknessUp.addEventListener('click', () => changeThickness(1));

clearButton.addEventListener('click', () => {
    canvas.discardActiveObject();
    canvas.getObjects().slice().forEach((object) => canvas.remove(object));
    canvas.requestRenderAll();
});

function resizeCanvas() {
    const firstLayout = !canvas.viewportTransform;
    canvas.setDimensions({
        width: window.innerWidth,
        height: Math.max(window.innerHeight - document.getElementById('controls').offsetHeight, 1)
    });
    // keep the scene origin centered; also recenter once on first layout
    const vpt = canvas.viewportTransform;
    if (firstLayout) {
        canvas.setViewportTransform(homeTransform());
    } else {
        const zoom = vpt[0];
        const vptCenter = [zoom, 0, 0, zoom, canvas.width / 2, canvas.height / 2];
        canvas.setViewportTransform(vptCenter);
    }
    canvas.requestRenderAll();
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const exportModal = document.getElementById('exportModal');
const exportCancel = document.getElementById('exportCancel');
const exportConfirm = document.getElementById('exportConfirm');

function selectedFormats() {
    return [...exportModal.querySelectorAll('input[name="exportFormat"]:checked')]
        .map((input) => input.value);
}

function openExportModal() {
    exportModal.hidden = false;
    exportConfirm.focus();
}

function closeExportModal() {
    exportModal.hidden = true;
}

exportCancel.addEventListener('click', closeExportModal);
exportModal.addEventListener('click', (event) => {
    if (event.target === exportModal) closeExportModal();
});
window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !exportModal.hidden) closeExportModal();
});

exportConfirm.addEventListener('click', async () => {
    const formats = selectedFormats();
    if (formats.length === 0) {
        alert('Select at least one export format.');
        return;
    }
    closeExportModal();
    saveButton.disabled = true;
    exportConfirm.disabled = true;
    try {
        const payload = { formats };
        if (formats.includes('json')) payload.scene = canvas.toObject();
        if (formats.includes('png')) payload.png = canvas.toDataURL({ format: 'png', multiplier: 1 });
        if (formats.includes('webp')) payload.webp = canvas.toDataURL({ format: 'webp', multiplier: 1 });
        if (formats.includes('svg')) payload.svg = canvas.toSVG();
        const response = await fetch('/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('The host could not save the drawing.');
        alert('Saved to Host.');
    } catch (error) {
        console.error(error);
        alert('Failed to save to Host.');
    } finally {
        saveButton.disabled = false;
        exportConfirm.disabled = false;
    }
});

saveButton.addEventListener('click', openExportModal);
