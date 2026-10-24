import sys
import os
import re
from flask import Flask, render_template, request, jsonify
from utilities.exporter import make_img


def resource_path(relative_path):
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.dirname(os.path.abspath(__file__))
        if os.path.basename(base_path) == 'app':
            base_path = os.path.dirname(base_path)
    return os.path.join(base_path, relative_path)

app = Flask(__name__,
            template_folder=resource_path('templates'),
            static_folder=resource_path('static'))

# Save beside the executable when bundled, or in the project root when running
# from source. This keeps the output location independent of the build machine.
if getattr(sys, 'frozen', False):
    APP_DIR = os.path.dirname(sys.executable)
else:
    APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

STORAGE_DIR = os.path.join(APP_DIR, 'noteimg')
if not os.path.exists(STORAGE_DIR):
    os.makedirs(STORAGE_DIR)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/save', methods=['POST'])
def save_canvas():
    try:
        payload = request.get_json()
        if not payload:
            return jsonify({"error": "No data received"}), 400

        saved_path = make_img(payload, output_dir=STORAGE_DIR)   # pass storage dir
        return jsonify({"status": "success", "path": saved_path}), 200

    except Exception as e:
        print(f"[ERROR] Failed to process payload: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

# -DISCLAIMER:   DO NOT run with debug=True here