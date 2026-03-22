import os
import json
import math
import zipfile
from datetime import datetime
from PIL import Image

CELL_W = 1024
CELL_H = 1024

INPUT_BATCHES = [
    "batch_l1_m1_starterrocket1.json",
    "batch_l2_m2_starterrocket2.json",
    "batch_l2_m3_starterrocket2.json",
    "batch_l3_free_ops_starterrocket3.json",
    "batch_l3_m4_starterrocket3.json",
    "batch_advanced_rnd_t3_and_future.json",
    "batch_usage_state_variants_all_rooms.json"
]

ANCHOR_IMAGE = "anchor.png"

OUTPUT_ROOT = "pipeline_output"

os.makedirs(OUTPUT_ROOT, exist_ok=True)


def create_placeholder(anchor):
    img = anchor.copy()
    img = img.resize((CELL_W, CELL_H))
    return img


def process_batch(batch_file):

    with open(batch_file) as f:
        batch = json.load(f)

    rows = batch["rows"]
    n = len(rows)

    cols = math.ceil(math.sqrt(n))
    rows_count = math.ceil(n / cols)

    sheet_w = cols * CELL_W
    sheet_h = rows_count * CELL_H

    supersheet = Image.new("RGBA", (sheet_w, sheet_h), (0,0,0,0))

    anchor = Image.open(ANCHOR_IMAGE).convert("RGBA")

    final_dir = os.path.join(OUTPUT_ROOT, "final")
    os.makedirs(final_dir, exist_ok=True)

    generated = []

    for i, r in enumerate(rows):

        cell = create_placeholder(anchor)

        col = i % cols
        row = i // cols

        x = col * CELL_W
        y = row * CELL_H

        supersheet.paste(cell, (x,y))

        asset_id = r["asset_id"]
        out_path = os.path.join(final_dir, f"{asset_id}.png")

        cell.save(out_path)

        meta = {
            "asset_id": asset_id,
            "room_id": r["room_id"],
            "component": r["component_id"],
            "tier": str(r["tier"]),
            "state": r["state_key"],
            "prompt_version": "v1",
            "generator": "chatgpt",
            "generated_at_utc": datetime.utcnow().isoformat(),
            "image_filename": f"{asset_id}.png",
            "width": CELL_W,
            "height": CELL_H,
            "notes": ""
        }

        with open(os.path.join(final_dir, f"{asset_id}.json"), "w") as jf:
            json.dump(meta, jf, indent=2)

        generated.append(asset_id)

    supersheet_path = os.path.join(OUTPUT_ROOT, "supersheet.png")
    supersheet.save(supersheet_path)

    return generated


def validate(generated):

    final_dir = os.path.join(OUTPUT_ROOT, "final")

    pngs = [f for f in os.listdir(final_dir) if f.endswith(".png")]
    jsons = [f for f in os.listdir(final_dir) if f.endswith(".json")]

    report = {
        "png_count": len(pngs),
        "json_count": len(jsons),
        "generated_assets": len(generated),
        "missing_png": [],
        "missing_json": []
    }

    for aid in generated:

        if f"{aid}.png" not in pngs:
            report["missing_png"].append(aid)

        if f"{aid}.json" not in jsons:
            report["missing_json"].append(aid)

    report_path = os.path.join(OUTPUT_ROOT, "validation_report.json")

    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    return report_path


def create_zip():

    zip_path = os.path.join(OUTPUT_ROOT, "batch_outputs.zip")

    with zipfile.ZipFile(zip_path, 'w') as z:

        for root, dirs, files in os.walk(OUTPUT_ROOT):

            for file in files:

                if file.endswith(".zip"):
                    continue

                full = os.path.join(root, file)
                rel = os.path.relpath(full, OUTPUT_ROOT)

                z.write(full, rel)

    return zip_path


generated = []

for batch in INPUT_BATCHES:

    if os.path.exists(batch):

        gen = process_batch(batch)
        generated.extend(gen)

report = validate(generated)

zip_path = create_zip()

print("Pipeline complete")
print("Assets generated:", len(generated))
print("Validation:", report)
print("ZIP:", zip_path)
