const canvasElement = document.getElementById('paintCanvas');
const saveButton = document.getElementById('saveBtn');
const clearButton = document.getElementById('clearBtn');
const colorPicker = document.getElementById('colorPicker');
const thicknessDown = document.getElementById('thicknessDown');
const thicknessUp = document.getElementById('thicknessUp');
const thicknessValue = document.getElementById('thicknessValue');
const toolButtons = [...document.querySelectorAll('[data-tool]')];
let ink = colorPicker.value;
let strokeWidth = 2;

const canvas = new fabric.Canvas(canvasElement, {
    backgroundColor: '#ffffff',
    preserveObjectStacking: true,
    selection: true,
    stopContextMenu: true
});

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

colorPicker.addEventListener('input', () => {
    ink = colorPicker.value;
    selectedObjects().forEach((object) => {
        if (object instanceof fabric.FabricText) {
            object.set('fill', ink);
        } else {
            object.set('stroke', ink);
        }
    });
    canvas.requestRenderAll();
});

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

saveButton.addEventListener('click', async () => {
    saveButton.disabled = true;
    try {
        const payload = {
            image: canvas.toDataURL({ format: 'png', multiplier: 1 }),
            scene: canvas.toObject()
        };
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
    }
});
