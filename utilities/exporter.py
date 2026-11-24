import os
import time
import base64
import json
from io import BytesIO
from PIL import Image, ImageDraw

def save_export(payload, output_dir="noteimg"):
    """Save the canvas in one or more formats: json, svg, png, webp."""
    formats = payload.get("formats") or []
    os.makedirs(output_dir, exist_ok=True)
    stem = f"note_{time.time_ns()}"
    saved = []

    for export_format in formats:
        if export_format == "json":
            scene_data = payload.get("scene")
            if scene_data is None:
                continue
            path = os.path.join(output_dir, f"{stem}.json")
            with open(path, "w", encoding="utf-8") as scene_file:
                json.dump(scene_data, scene_file)
            saved.append(path)
        elif export_format == "svg":
            svg_data = payload.get("svg")
            if not isinstance(svg_data, str):
                continue
            path = os.path.join(output_dir, f"{stem}.svg")
            with open(path, "w", encoding="utf-8") as svg_file:
                svg_file.write(svg_data)
            saved.append(path)
        elif export_format in ("png", "webp"):
            data_url = payload.get(export_format)
            prefix = f"data:image/{export_format};base64,"
            if not isinstance(data_url, str) or not data_url.startswith(prefix):
                continue
            image_bytes = base64.b64decode(data_url.partition(",")[2], validate=True)
            with Image.open(BytesIO(image_bytes)) as source:
                image = source.convert("RGBA")
                path = os.path.join(output_dir, f"{stem}.{export_format}")
                image.save(path, export_format.upper())
            saved.append(path)

    for filepath in saved:
        print(f"[SUCCESS] Exported canvas to disk: {filepath}")
    return saved

def make_img(payload, output_dir="noteimg"):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    width = payload.get("width", 800)
    height = payload.get("height", 600)

    image = Image.new("RGBA", (width, height), "white")
    draw = ImageDraw.Draw(image)

    lines = payload.get("lines", [])
    for line in lines:
        color = line.get("color", "#000000")
        points = line.get("points", [])

        coord_tuples = [(pt["x"], pt["y"]) for pt in points]

        if len(coord_tuples) >= 2:
            draw.line(coord_tuples, fill=color, width=3, joint="round")
        elif len(coord_tuples) == 1:
            x, y = coord_tuples[0]
            draw.ellipse([x-2, y-2, x+2, y+2], fill=color)
        else: 
            pass
        
    timestamp = int(time.time())
    filename = f"note_{timestamp}.png"
    filepath = os.path.join(output_dir, filename)

    image.save(filepath, "PNG")
    print(f"[SUCCESS] Exported vector plot to disk: {filepath}")
    return filepath