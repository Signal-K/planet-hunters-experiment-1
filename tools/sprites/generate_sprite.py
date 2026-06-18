#!/usr/bin/env python3
"""
Landnam sprite generator — uses Replicate (Flux) to create spacecraft sprites.

Models:
  schnell  fast, $0.003/image  (default — use for NL iteration)
  pro      Flux 1.1 Pro, $0.04/image  (use for final approved sprites)

Single sprite:
  python3 tools/sprites/generate_sprite.py \\
      --profile room_module \\
      --prompt "Tier 1 cockpit command room with pilot console and star chart" \\
      --name ion_thruster_t3 \\
      --count 2 \\
      --aspect-ratio 1:1 \\
      --model pro \\
      --out-dir tools/sprites/output/_generated

Batch (multiple different sprites in one run):
  python3 tools/sprites/generate_sprite.py \\
      --batch-file tools/sprites/ship_room_batch.json \\
      --model pro \\
      --out-dir tools/sprites/output/_generated

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

LANDNAM_PALETTE = (
    "Landnam command-deck palette: dark navy and blue-black hull shadows, "
    "muted steel blue-grey panels (#1e2d3d / #2c4a6b), cyan-teal trims and light strips "
    "(#00e5ff / #4ab8c1), amber hazard and power details (#f5a623), deep ink outline "
    "(#0a0f1e)."
)

COMMON_STYLE = (
    "Pixel-art game sprite, side-view orthographic camera, crisp readable silhouette, "
    "chunky dark outline, visible hand-placed panel lines, no UI labels, no text, no crew characters. "
    "Transparent or pure black background only. "
    f"{LANDNAM_PALETTE} "
    "Readable at mobile-game size; avoid tiny greebles that collapse when scaled down."
)

STYLE_PROFILES = {
    "part_icon": (
        "Single isolated rocket part catalog icon. "
        "Object centered in frame, three-quarter-flat or strict side view, no surrounding scene. "
        "Studio-lit sprite tile feel, but still flat/pixel-art rather than 3D. "
        f"{COMMON_STYLE}"
    ),
    "ship_exterior": (
        "Complete exterior rocket/ship sprite for a regular closed-hull view, inspired by modular "
        "side-view ship management games. Long horizontal silhouette with hull, nose, engines, fins, "
        "container modules and stage seams visible from the outside. No visible rooms. "
        "The ship should read as one assembled vehicle, centered with empty transparent margin. "
        f"{COMMON_STYLE}"
    ),
    "ship_container": (
        "Open cutaway rocket/ship container sprite for an interior-management view. "
        "Flat side-elevation cutaway, like the port wall has been removed; not top-down, not blueprint plan view. "
        "Use a clean horizontal deck grid inside the hull: empty rectangular bays, floor/ceiling rails, vertical "
        "bulkheads, connector corridors, stage seams, engine/nose boundaries. Do not fill bays with "
        "room equipment; this is the reusable container layer that room sprites sit inside. "
        f"{COMMON_STYLE}"
    ),
    "room_module": (
        "Individual interior room/module sprite tile for placement inside the ship cutaway. "
        "Rectangular room bay with floor, ceiling, side bulkheads, machinery silhouettes, consoles, "
        "pipes, storage racks, screens, or equipment appropriate to the room. No exterior hull. "
        "Keep the module orthographic and grid-aligned so multiple rooms can tile together. "
        f"{COMMON_STYLE}"
    ),
    "launch_rocket_part": (
        "Isolated rocket component sprite for a launch sequence animation. "
        "VERTICAL portrait orientation — the rocket points UPWARD in the frame. "
        "Single separable rocket component centered in frame with transparent/black margins. "
        "Crisp chunky pixel-art silhouette, visible panel seams and bolted flanges, "
        "cyan thruster details, amber coupling rings and hazard markings. "
        "No background, no ground, no scene — isolated sprite only. "
        f"{COMMON_STYLE}"
    ),
    "launch_effect": (
        "Rocket exhaust, flame, or smoke effect sprite for a pixel-art launch animation. "
        "Effect isolated on pure black background. "
        "Bright cyan-white core fading to amber-orange outer glow, "
        "chunky pixel shapes not photo-realistic fire. "
        "Frame centered on the effect with black margins. "
        f"{COMMON_STYLE}"
    ),
    "launch_background": (
        "Pixel-art background layer for a rocket launch sequence. "
        "Wide panoramic scene layer for parallax scrolling, no moving elements, "
        "pure side-view or elevation composition. "
        "Flat readable pixel art, dark Landnam palette, "
        "readable depth cues through color and silhouette only. "
        f"{COMMON_STYLE}"
    ),
}

# Passed as negative_prompt to Flux to hard-block photorealistic / 3D styles.
NEGATIVE_PROMPT = (
    "3D render, blender, cinema 4d, unreal engine, octane, corona, arnold, "
    "photorealistic, ray tracing, depth of field, bokeh, ambient occlusion, "
    "subsurface scattering, specular highlight, normal map, bump map, "
    "painterly, watercolor, oil painting, sketch, pencil drawing, "
    "white background, grey background, gradient background, "
    "full scene, landscape, planet background, unrelated multiple objects, "
    "person, human, text, label, UI, border, frame, watermark"
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


def enrich_prompt(prompt: str, profile: str) -> str:
    suffix = STYLE_PROFILES.get(profile)
    if suffix is None:
        valid = ", ".join(sorted(STYLE_PROFILES))
        raise ValueError(f"unknown profile '{profile}' (valid: {valid})")
    return f"{prompt}. {suffix}"


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
    profile: str = "part_icon",
) -> list[Path]:
    full_prompt = enrich_prompt(prompt, profile)
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
    profile: str = "part_icon",
) -> tuple[list[Path], str | None]:
    """Wrapper around generate_one that catches errors instead of propagating them."""
    try:
        files = generate_one(name, prompt, model_slug, token, out_dir,
                             timestamp, index, total, count=count, aspect_ratio=aspect_ratio,
                             profile=profile)
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
    parser.add_argument("--profile", choices=sorted(STYLE_PROFILES), default="part_icon",
                        help="Prompt profile for single sprite mode")
    parser.add_argument("--count",        type=int, default=1, help="Variants to generate (single mode)")
    parser.add_argument("--aspect-ratio", default="1:1", dest="aspect_ratio",
                        help="Image aspect ratio, e.g. 1:1, 1:2, 2:3 (default: 1:1)")
    # Batch mode
    parser.add_argument("--batch", default="",
                        help='JSON array: [{"name":"...", "profile":"room_module", "prompt":"...", "aspect_ratio":"1:1"}]')
    parser.add_argument("--batch-file", default="", help="Path to JSON batch file")
    # Shared
    parser.add_argument("--model",   choices=list(MODELS), default="schnell")
    parser.add_argument("--out-dir", default="tools/sprites/output/_generated")
    parser.add_argument("--dry-run", action="store_true", help="Print enriched prompts without calling Replicate")
    args = parser.parse_args()

    model_slug = MODELS[args.model]
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    token = "" if args.dry_run else load_token()

    # ── Batch mode ────────────────────────────────────────────────────────────
    batch_payload = args.batch
    if args.batch_file:
        batch_payload = Path(args.batch_file).read_text()

    if batch_payload and batch_payload.strip() not in ("", "[]"):
        try:
            items = json.loads(batch_payload)
        except json.JSONDecodeError as e:
            # Print first 500 chars of the received value to help diagnose
            preview = batch_payload[:500] + ("…" if len(batch_payload) > 500 else "")
            sys.exit(f"Error: --batch is not valid JSON: {e}\nReceived: {preview}")

        if not isinstance(items, list) or not items:
            sys.exit("Error: --batch must be a non-empty JSON array")

        print(f"Batch mode  : {len(items)} sprites")
        print(f"Model       : {model_slug}")
        print(f"Output      : {out_dir.resolve()}")
        if args.dry_run:
            print("Dry run     : yes")
        print()

        all_generated: list[Path] = []
        errors: list[tuple[str, str]] = []
        for idx, item in enumerate(items, start=1):
            name   = item.get("name", f"sprite_{idx}")
            prompt = item.get("prompt", "")
            ar     = item.get("aspect_ratio", "1:1")
            profile = item.get("profile", "part_icon")
            if not prompt:
                print(f"[{idx}/{len(items)}] SKIPPED {name} — no prompt")
                continue
            if args.dry_run:
                print(f"[{idx}/{len(items)}] {name}")
                print(f"  profile: {profile}")
                print(f"  ratio  : {resolve_aspect_ratio(ar)}")
                print(f"  prompt : {enrich_prompt(prompt, profile)}")
                print()
                continue
            files, err = generate_one_safe(name, prompt, model_slug, token, out_dir,
                                           timestamp, idx, len(items), aspect_ratio=ar,
                                           profile=profile)
            if err:
                print(f"  ERROR: {err}")
                errors.append((name, err))
            else:
                all_generated.extend(files)
            # Respect rate limit: Pro model allows ~6/min (10s gap keeps us safe)
            if idx < len(items):
                time.sleep(12)

        if args.dry_run:
            return
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
    print(f"Profile: {args.profile}")
    print(f"Prompt : {args.prompt[:100]}{'…' if len(args.prompt) > 100 else ''}")
    print(f"Count  : {args.count}")
    print(f"Ratio  : {args.aspect_ratio}")
    print(f"Output : {out_dir.resolve()}")
    print()

    if args.dry_run:
        print(enrich_prompt(args.prompt, args.profile))
        return

    files, err = generate_one_safe(
        args.name, args.prompt, model_slug, token, out_dir,
        timestamp, 1, 1, count=args.count, aspect_ratio=args.aspect_ratio,
        profile=args.profile,
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
        print("Note: drafts should be reviewed, cleaned/cropped if needed, then promoted")
        print("to stable runtime filenames under web/public/game/assets/...")
    else:
        print("No files generated — check errors above.")


if __name__ == "__main__":
    main()
