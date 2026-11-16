import os
import time
import base64
import json
from io import BytesIO
from PIL import Image, ImageDraw

def save_png_data(image_data, scene_data=None, output_dir="noteimg"):
    if not isinstance(image_data, str) or not image_data.startswith("data:image/png;base64,"):
        raise ValueError("A PNG data URL is required")

    encoded = image_data.partition(",")[2]
    image_bytes = base64.b64decode(encoded, validate=True)
    with Image.open(BytesIO(image_bytes)) as source:
        if source.format != "PNG":
            raise ValueError("The uploaded image is not a PNG")
        image = source.convert("RGBA")

    os.makedirs(output_dir, exist_ok=True)
    filename = f"note_{time.time_ns()}.png"
    filepath = os.path.join(output_dir, filename)
    image.save(filepath, "PNG")
    if scene_data is not None:
        scene_path = os.path.splitext(filepath)[0] + ".json"
        with open(scene_path, "w", encoding="utf-8") as scene_file:
            json.dump(scene_data, scene_file)
    print(f"[SUCCESS] Exported canvas to disk: {filepath}")
    return filepath

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
#make timestamp - to save to noteimg
    timestamp = int(time.time())
    filename = f"note_{timestamp}.png"
    filepath = os.path.join(output_dir, filename)

    image.save(filepath, "PNG")
    print(f"[SUCCESS] Exported vector plot to disk: {filepath}")
    return filepath
