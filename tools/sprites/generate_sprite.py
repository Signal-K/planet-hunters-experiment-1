#!/usr/bin/env python3
"""
Landnam sprite generator — uses Replicate (Flux) to create spacecraft part sprites.

Models:
  schnell  fast, $0.003/image  (default — use for NL iteration)
  pro      Flux 1.1 Pro, $0.04/image  (use for final approved sprites)

Single sprite:
  python3 tools/sprites/generate_sprite.py \\
      --prompt "a small ion thruster, flat vector icon, white background" \\
      --name ion_thruster_t3 \\
      --count 2 \\
      --aspect-ratio 1:1 \\
      --model pro \\
      --out-dir web/public/parts/_generated

Batch (multiple different sprites in one run):
  python3 tools/sprites/generate_sprite.py \\
      --batch '[{"name":"main_stage_t1","prompt":"...","aspect_ratio":"1:2"},{"name":"booster_t1","prompt":"..."}]' \\
      --model pro \\
      --out-dir web/public/parts/_generated

Setup:
  Add REPLICATE_API_TOKEN=<your token> to Landnam/web/.env.local
"""

import argparse
import json
import os
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path

MODELS = {
    "schnell": "black-forest-labs/flux-schnell",
    "pro": "black-forest-labs/flux-1.1-pro",
}

# Replicate Flux supported aspect ratios (as of 2026-06)
VALID_ASPECT_RATIOS = {
    "1:1", "16:9", "21:9", "3:2", "2:3", "4:5", "5:4", "3:4", "4:3", "9:16", "9:21",
}

# Map common shorthand → nearest valid ratio
ASPECT_RATIO_ALIASES = {
    "1:2": "9:16",   # tall portrait → closest valid
    "2:1": "16:9",   # wide landscape → closest valid
    "1:3": "9:21",
    "3:1": "21:9",
}

STYLE_SUFFIX = (
    "2D flat game sprite icon in the style of Master of Orion 2 or Stellaris unit icons. "
    "Strict 2D orthographic view — side view for ships, top-down for structures. "
    "Color palette: hull in muted steel blue-grey (#1e2d3d / #2c4a6b), "
    "cyan-teal accent trim (#00e5ff / #4ab8c1), amber indicator detail (#f5a623), "
    "dark navy outline (#0d1520 / #0a0f1e), pure black or transparent background. "
    "Flat shading ONLY — no gradients, no specular highlights, no ambient occlusion, "
    "no normal maps, no rim lighting. "
    "Crisp clean silhouette, single isolated object centered in frame, no scene context. "
    "Looks like a Figma or Illustrator vector export — NOT a Blender render."
)

# Passed as negative_prompt to Flux to hard-block photorealistic / 3D styles.
NEGATIVE_PROMPT = (
    "3D render, blender, cinema 4d, unreal engine, octane, corona, arnold, "
    "photorealistic, ray tracing, depth of field, bokeh, ambient occlusion, "
    "subsurface scattering, specular highlight, normal map, bump map, "
    "painterly, watercolor, oil painting, sketch, pencil drawing, "
    "white background, grey background, gradient background, "
    "scene, landscape, environment, multiple objects, "
    "person, human, text, label, border, frame, decorative elements"
)

POLL_INTERVAL = 1.5
POLL_TIMEOUT  = 120


def load_token() -> str:
    if tok := os.environ.get("REPLICATE_API_TOKEN"):
        return tok
    script_dir = Path(__file__).resolve().parent
    for candidate in [script_dir, script_dir.parent, script_dir.parent.parent]:
        env_file = candidate / "web" / ".env.local"
        if env_file.exists():
            for line in env_file.read_text().splitlines():
                line = line.strip()
                if line.startswith("REPLICATE_API_TOKEN="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit(
        "Error: REPLICATE_API_TOKEN not found.\n"
        "Add it to Landnam/web/.env.local or set the env var."
    )


class ReplicateError(Exception):
    pass


def api_request(method: str, path: str, token: str, body: dict | None = None) -> dict:
    url = f"https://api.replicate.com/v1/{path.lstrip('/')}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Prefer": "wait",
        },
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        try:
            detail = json.loads(e.read().decode(errors="replace"))
            msg = detail.get("detail", str(detail))
        except Exception:
            msg = f"HTTP {e.code}"
        raise ReplicateError(f"Replicate API {e.code}: {msg}")


def resolve_aspect_ratio(ar: str) -> str:
    ar = ASPECT_RATIO_ALIASES.get(ar, ar)
    return ar if ar in VALID_ASPECT_RATIOS else "1:1"


def create_prediction(prompt: str, model_slug: str, token: str, aspect_ratio: str = "1:1") -> dict:
    ar = resolve_aspect_ratio(aspect_ratio)
    owner, name = model_slug.split("/")
    return api_request(
        "POST",
        f"models/{owner}/{name}/predictions",
        token,
        body={
            "input": {
                "prompt": prompt,
                "negative_prompt": NEGATIVE_PROMPT,
                "num_outputs": 1,
                "output_format": "png",
                "output_quality": 100,
                "aspect_ratio": ar,
            }
        },
    )


def wait_for_prediction(prediction_id: str, token: str) -> list[str]:
    deadline = time.time() + POLL_TIMEOUT
    while time.time() < deadline:
        pred = api_request("GET", f"predictions/{prediction_id}", token)
        status = pred.get("status")
        if status == "succeeded":
            output = pred.get("output", [])
            if isinstance(output, str):
                output = [output]
            return output
        if status in ("failed", "canceled"):
            err = pred.get("error") or status
            raise ReplicateError(f"Prediction {status}: {err}")
        time.sleep(POLL_INTERVAL)
    raise ReplicateError(f"Timed out after {POLL_TIMEOUT}s waiting for prediction {prediction_id}")


def download(url: str, dest: Path) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": "landnam-sprite-gen/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        dest.write_bytes(resp.read())


def enrich_prompt(prompt: str) -> str:
    return f"{prompt}. {STYLE_SUFFIX}"


def generate_one(
    name: str,
    prompt: str,
    model_slug: str,
    token: str,
    out_dir: Path,
    timestamp: str,
    index: int,
    total: int,
    count: int = 1,
    aspect_ratio: str = "1:1",
) -> list[Path]:
    full_prompt = enrich_prompt(prompt)
    generated = []

    for i in range(1, count + 1):
        suffix = f"_v{i}" if count > 1 else ""
        filename = f"{name}{suffix}_{timestamp}.png"
        dest = out_dir / filename
        label = f"[{index}/{total}{'.' + str(i) if count > 1 else ''}]"

        print(f"{label} {name} — creating prediction…", end=" ", flush=True)
        pred = create_prediction(full_prompt, model_slug, token, aspect_ratio)
        pred_id = pred["id"]

        output_urls: list[str] = pred.get("output") or []
        if isinstance(output_urls, str):
            output_urls = [output_urls]

        if not output_urls and pred.get("status") not in ("succeeded", "failed", "canceled"):
            print(f"queued, polling…", end=" ", flush=True)
            output_urls = wait_for_prediction(pred_id, token)

        if not output_urls:
            print(f"no output — status: {pred.get('status')}")
            continue

        print(f"downloading…", end=" ", flush=True)
        download(output_urls[0], dest)
        print(f"✓ {dest.name}")
        generated.append(dest)

    return generated


def generate_one_safe(
    name: str, prompt: str, model_slug: str, token: str, out_dir: Path,
    timestamp: str, index: int, total: int, count: int = 1, aspect_ratio: str = "1:1",
) -> tuple[list[Path], str | None]:
    """Wrapper around generate_one that catches errors instead of propagating them."""
    try:
        files = generate_one(name, prompt, model_slug, token, out_dir,
                             timestamp, index, total, count=count, aspect_ratio=aspect_ratio)
        return files, None
    except ReplicateError as e:
        return [], str(e)
    except Exception as e:
        return [], f"Unexpected error: {e}"


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate Landnam sprite(s) via Replicate Flux")
    # Single sprite mode
    parser.add_argument("--prompt",       default="", help="Visual description (single sprite mode)")
    parser.add_argument("--name",         default="sprite", help="Base filename, snake_case, no extension")
    parser.add_argument("--count",        type=int, default=1, help="Variants to generate (single mode)")
    parser.add_argument("--aspect-ratio", default="1:1", dest="aspect_ratio",
                        help="Image aspect ratio, e.g. 1:1, 1:2, 2:3 (default: 1:1)")
    # Batch mode
    parser.add_argument("--batch", default="",
                        help='JSON array: [{"name":"...", "prompt":"...", "aspect_ratio":"1:1"}]')
    # Shared
    parser.add_argument("--model",   choices=list(MODELS), default="schnell")
    parser.add_argument("--out-dir", default="web/public/parts/_generated")
    args = parser.parse_args()

    token = load_token()
    model_slug = MODELS[args.model]
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    # ── Batch mode ────────────────────────────────────────────────────────────
    if args.batch and args.batch.strip() not in ("", "[]"):
        try:
            items = json.loads(args.batch)
        except json.JSONDecodeError as e:
            # Print first 500 chars of the received value to help diagnose
            preview = args.batch[:500] + ("…" if len(args.batch) > 500 else "")
            sys.exit(f"Error: --batch is not valid JSON: {e}\nReceived: {preview}")

        if not isinstance(items, list) or not items:
            sys.exit("Error: --batch must be a non-empty JSON array")

        print(f"Batch mode  : {len(items)} sprites")
        print(f"Model       : {model_slug}")
        print(f"Output      : {out_dir.resolve()}")
        print()

        all_generated: list[Path] = []
        errors: list[tuple[str, str]] = []
        for idx, item in enumerate(items, start=1):
            name   = item.get("name", f"sprite_{idx}")
            prompt = item.get("prompt", "")
            ar     = item.get("aspect_ratio", "1:1")
            if not prompt:
                print(f"[{idx}/{len(items)}] SKIPPED {name} — no prompt")
                continue
            files, err = generate_one_safe(name, prompt, model_slug, token, out_dir,
                                           timestamp, idx, len(items), aspect_ratio=ar)
            if err:
                print(f"  ERROR: {err}")
                errors.append((name, err))
            else:
                all_generated.extend(files)
            # Brief pause between calls to avoid rate limits
            if idx < len(items):
                time.sleep(0.5)

        print()
        print(f"Done — {len(all_generated)}/{len(items)} sprites generated in {out_dir.resolve()}")
        for p in all_generated:
            print(f"  {p.name}")
        if errors:
            print(f"\n{len(errors)} sprite(s) failed:")
            for name, err in errors:
                print(f"  {name}: {err}")
        if not all_generated:
            sys.exit(1)
        return

    # ── Single sprite mode ────────────────────────────────────────────────────
    if not args.prompt:
        sys.exit("Error: provide --prompt for single sprite mode, or --batch for multi-sprite mode")

    print(f"Model  : {model_slug}")
    print(f"Prompt : {args.prompt[:100]}{'…' if len(args.prompt) > 100 else ''}")
    print(f"Count  : {args.count}")
    print(f"Ratio  : {args.aspect_ratio}")
    print(f"Output : {out_dir.resolve()}")
    print()

    files, err = generate_one_safe(
        args.name, args.prompt, model_slug, token, out_dir,
        timestamp, 1, 1, count=args.count, aspect_ratio=args.aspect_ratio,
    )
    if err:
        sys.exit(f"Error: {err}")
    generated = files

    print()
    if generated:
        print(f"Done — {len(generated)} file(s) in {out_dir.resolve()}:")
        for p in generated:
            print(f"  {p.name}")
        print()
        print("Note: images have white backgrounds. Use Preview > Instant Alpha")
        print("or the game engine's color-key to drop white before importing.")
    else:
        print("No files generated — check errors above.")


if __name__ == "__main__":
    main()
