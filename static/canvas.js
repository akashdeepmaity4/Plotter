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

colorPopover.addEventListener('click', (event) => event.stopPropagation());
colorPopover.addEventListener('pointerdown', (event) => event.stopPropagation());
colorPopover.addEventListener('mousedown', (event) => event.stopPropagation());
colorPopover.addEventListener('touchstart', (event) => event.stopPropagation(), { passive: true });

document.addEventListener('pointerdown', (event) => {
    if (!colorPopover.hidden && !colorPopover.contains(event.target) && event.target !== colorTrigger) {
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

renderSwatches();
applyInk(ink);

let activeTool = 'select';
let activeShape = null;
let dragStart = null;
let freehandPoints = [];

function setTool(tool) {
    activeTool = tool;
    activeShape = null;
    dragStart = null;
    freehandPoints = [];
    canvas.isDrawingMode = false;
    canvas.selection = tool === 'select';
    canvas.skipTargetFind = tool !== 'select';
    canvas.defaultCursor = tool === 'select' ? 'default' : 'crosshair';
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
    if (kind === 'line' || kind === 'connector') {
        return new fabric.Line([start.x, start.y, start.x + 1, start.y + 1], {
            ...common,
            fill: null,
            strokeLineCap: 'round',
            strokeUniform: true
        });
    }
    return null;
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

canvas.on('mouse:down', (event) => {
    const point = pointFor(event);
    if (activeTool === 'text') {
        addText(point);
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
    activeShape = createShape(activeTool, point);
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
    canvas.setDimensions({
        width: window.innerWidth,
        height: Math.max(window.innerHeight - document.getElementById('controls').offsetHeight, 1)
    });
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
