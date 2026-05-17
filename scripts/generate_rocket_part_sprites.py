#!/usr/bin/env python3
"""Generate 512x512 transparent rocket-part sprites from RoomCatalog.gd.

This workflow always reads the editable style brief in:
  .knowns/docs/game-art/rocket-part-sprite-generation-spec.md

No third-party Python packages are required.
"""

from __future__ import annotations

import hashlib
import json
import re
import struct
import zlib
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, List, Tuple


REPO_ROOT = Path(__file__).resolve().parent.parent
CATALOG_PATH = REPO_ROOT / "scene" / "Scripts" / "Utils" / "RoomCatalog.gd"
SPEC_PATH = REPO_ROOT / ".knowns" / "docs" / "game-art" / "rocket-part-sprite-generation-spec.md"
OUTPUT_DIR = REPO_ROOT / "scene" / "assets" / "Rooms" / "generated_parts_512"
MANIFEST_PATH = OUTPUT_DIR / "manifest.json"
CANVAS = 512

Color = Tuple[int, int, int, int]


@dataclass
class RoomDefinition:
    room_id: str
    name: str
    category: str
    tier: int
    footprint: int
    sprite: str


class Canvas:
    def __init__(self, width: int, height: int) -> None:
        self.width = width
        self.height = height
        self.pixels = bytearray(width * height * 4)

    def blend_pixel(self, x: int, y: int, color: Color) -> None:
        if x < 0 or y < 0 or x >= self.width or y >= self.height:
            return
        idx = (y * self.width + x) * 4
        src_r, src_g, src_b, src_a = color
        if src_a <= 0:
            return
        dst_r = self.pixels[idx]
        dst_g = self.pixels[idx + 1]
        dst_b = self.pixels[idx + 2]
        dst_a = self.pixels[idx + 3]
        inv = 255 - src_a
        out_a = src_a + (dst_a * inv) // 255
        self.pixels[idx] = (src_r * src_a + dst_r * inv) // 255
        self.pixels[idx + 1] = (src_g * src_a + dst_g * inv) // 255
        self.pixels[idx + 2] = (src_b * src_a + dst_b * inv) // 255
        self.pixels[idx + 3] = max(dst_a, out_a)

    def fill_rect(self, x0: int, y0: int, x1: int, y1: int, color: Color) -> None:
        for y in range(max(0, y0), min(self.height, y1)):
            for x in range(max(0, x0), min(self.width, x1)):
                self.blend_pixel(x, y, color)

    def fill_rounded_rect(self, x0: int, y0: int, x1: int, y1: int, radius: int, color: Color) -> None:
        radius = max(0, min(radius, (x1 - x0) // 2, (y1 - y0) // 2))
        r_sq = radius * radius
        for y in range(max(0, y0), min(self.height, y1)):
            for x in range(max(0, x0), min(self.width, x1)):
                if radius == 0:
                    self.blend_pixel(x, y, color)
                    continue
                if x < x0 + radius and y < y0 + radius:
                    dx = x - (x0 + radius)
                    dy = y - (y0 + radius)
                    if dx * dx + dy * dy <= r_sq:
                        self.blend_pixel(x, y, color)
                elif x >= x1 - radius and y < y0 + radius:
                    dx = x - (x1 - radius - 1)
                    dy = y - (y0 + radius)
                    if dx * dx + dy * dy <= r_sq:
                        self.blend_pixel(x, y, color)
                elif x < x0 + radius and y >= y1 - radius:
                    dx = x - (x0 + radius)
                    dy = y - (y1 - radius - 1)
                    if dx * dx + dy * dy <= r_sq:
                        self.blend_pixel(x, y, color)
                elif x >= x1 - radius and y >= y1 - radius:
                    dx = x - (x1 - radius - 1)
                    dy = y - (y1 - radius - 1)
                    if dx * dx + dy * dy <= r_sq:
                        self.blend_pixel(x, y, color)
                else:
                    self.blend_pixel(x, y, color)

    def fill_ellipse(self, x0: int, y0: int, x1: int, y1: int, color: Color) -> None:
        rx = max(1.0, (x1 - x0) / 2.0)
        ry = max(1.0, (y1 - y0) / 2.0)
        cx = x0 + rx
        cy = y0 + ry
        for y in range(max(0, y0), min(self.height, y1)):
            for x in range(max(0, x0), min(self.width, x1)):
                norm = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
                if norm <= 1.0:
                    self.blend_pixel(x, y, color)

    def draw_line(self, x0: int, y0: int, x1: int, y1: int, color: Color, width: int = 1) -> None:
        dx = x1 - x0
        dy = y1 - y0
        steps = max(abs(dx), abs(dy), 1)
        radius = max(0, width // 2)
        for i in range(steps + 1):
            t = i / steps
            x = round(x0 + dx * t)
            y = round(y0 + dy * t)
            self.fill_ellipse(x - radius, y - radius, x + radius + 1, y + radius + 1, color)

    def save_png(self, path: Path) -> None:
        raw = bytearray()
        stride = self.width * 4
        for y in range(self.height):
            raw.append(0)
            start = y * stride
            raw.extend(self.pixels[start : start + stride])
        compressed = zlib.compress(bytes(raw), level=9)
        png = bytearray(b"\x89PNG\r\n\x1a\n")
        png.extend(self._chunk(b"IHDR", struct.pack(">IIBBBBB", self.width, self.height, 8, 6, 0, 0, 0)))
        png.extend(self._chunk(b"IDAT", compressed))
        png.extend(self._chunk(b"IEND", b""))
        path.write_bytes(png)

    @staticmethod
    def _chunk(chunk_type: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + chunk_type
            + data
            + struct.pack(">I", zlib.crc32(chunk_type + data) & 0xFFFFFFFF)
        )


CATEGORY_PALETTES: Dict[str, Dict[str, Color]] = {
    "propulsion": {"base": (84, 95, 112, 255), "dark": (42, 47, 56, 255), "accent": (255, 171, 79, 255), "glow": (255, 110, 61, 120)},
    "power": {"base": (86, 96, 116, 255), "dark": (38, 42, 52, 255), "accent": (99, 217, 255, 255), "glow": (126, 239, 255, 110)},
    "fuel": {"base": (93, 105, 120, 255), "dark": (46, 51, 61, 255), "accent": (96, 205, 194, 255), "glow": (143, 229, 216, 90)},
    "storage": {"base": (111, 102, 92, 255), "dark": (55, 47, 42, 255), "accent": (232, 183, 84, 255), "glow": (255, 212, 129, 70)},
    "mining": {"base": (96, 101, 109, 255), "dark": (48, 50, 57, 255), "accent": (255, 196, 92, 255), "glow": (255, 151, 68, 95)},
    "navigation": {"base": (88, 96, 110, 255), "dark": (43, 47, 57, 255), "accent": (106, 220, 255, 255), "glow": (150, 236, 255, 90)},
    "hull": {"base": (97, 99, 108, 255), "dark": (49, 51, 59, 255), "accent": (160, 176, 196, 255), "glow": (111, 220, 255, 60)},
    "science": {"base": (94, 100, 114, 255), "dark": (44, 47, 56, 255), "accent": (172, 131, 255, 255), "glow": (121, 229, 255, 100)},
    "communication": {"base": (94, 102, 112, 255), "dark": (45, 48, 58, 255), "accent": (126, 227, 255, 255), "glow": (92, 243, 220, 90)},
    "life_support": {"base": (100, 107, 114, 255), "dark": (49, 54, 61, 255), "accent": (123, 231, 161, 255), "glow": (162, 246, 193, 85)},
}


def main() -> None:
    spec_text = SPEC_PATH.read_text(encoding="utf-8")
    spec_hash = hashlib.sha256(spec_text.encode("utf-8")).hexdigest()
    rooms = parse_room_catalog(CATALOG_PATH.read_text(encoding="utf-8"))

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest: List[dict] = []

    for room in rooms:
        canvas = render_room_sprite(room)
        output_path = OUTPUT_DIR / f"{room.sprite}.png"
        canvas.save_png(output_path)
        manifest.append(
            {
                **asdict(room),
                "output_file": output_path.name,
                "width": CANVAS,
                "height": CANVAS,
                "spec_path": str(SPEC_PATH.relative_to(REPO_ROOT)),
                "spec_sha256": spec_hash,
            }
        )

    MANIFEST_PATH.write_text(json.dumps({"generated": manifest}, indent=2), encoding="utf-8")
    print(f"Loaded style spec: {SPEC_PATH}")
    print(f"Style spec sha256: {spec_hash}")
    print(f"Generated sprites: {len(manifest)}")
    print(f"Output directory: {OUTPUT_DIR}")
    print(f"Manifest: {MANIFEST_PATH}")


def parse_room_catalog(source: str) -> List[RoomDefinition]:
    block = extract_dictionary_block(source, "ROOM_DEFINITIONS")
    pattern = re.compile(r'"([^"]+)":\s*\{(.*?)\n\t\}', re.S)
    rooms: List[RoomDefinition] = []
    for room_id, body in pattern.findall(block):
        rooms.append(
            RoomDefinition(
                room_id=room_id,
                name=find_string(body, "name"),
                category=find_string(body, "category"),
                tier=find_int(body, "tier"),
                footprint=find_int(body, "footprint"),
                sprite=find_string(body, "sprite"),
            )
        )
    return rooms


def extract_dictionary_block(source: str, const_name: str) -> str:
    marker = f"const {const_name} := {{"
    start = source.find(marker)
    if start == -1:
        raise ValueError(f"Could not locate {const_name} in {CATALOG_PATH}")
    index = start + len(marker) - 1
    depth = 0
    while index < len(source):
        char = source[index]
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return source[start + len(marker) : index]
        index += 1
    raise ValueError(f"Could not parse dictionary block for {const_name}")


def find_string(body: str, key: str) -> str:
    match = re.search(rf'"{re.escape(key)}":\s*"([^"]+)"', body)
    if not match:
        raise ValueError(f'Missing string key "{key}" in catalog entry')
    return match.group(1)


def find_int(body: str, key: str) -> int:
    match = re.search(rf'"{re.escape(key)}":\s*(\d+)', body)
    if not match:
        raise ValueError(f'Missing integer key "{key}" in catalog entry')
    return int(match.group(1))


def render_room_sprite(room: RoomDefinition) -> Canvas:
    palette = CATEGORY_PALETTES.get(room.category, CATEGORY_PALETTES["hull"])
    canvas = Canvas(CANVAS, CANVAS)
    shell_w = int(CANVAS * (0.68 + 0.06 * min(room.footprint - 1, 1)))
    shell_h = int(CANVAS * (0.34 + 0.05 * min(room.tier - 1, 2)))
    left = (CANVAS - shell_w) // 2
    top = (CANVAS - shell_h) // 2
    right = left + shell_w
    bottom = top + shell_h
    radius = max(20, 24 + room.tier * 8)

    add_shadow(canvas, left, bottom, right)
    draw_shell(canvas, left, top, right, bottom, radius, palette)
    add_side_brackets(canvas, left, top, right, bottom, palette, room.tier)
    add_rivet_runs(canvas, left, top, right, bottom, palette)
    add_tier_markers(canvas, left, top, right, bottom, palette, room.tier)
    add_energy_glow(canvas, room, left, top, right, bottom, palette)
    add_category_features(canvas, room, left, top, right, bottom, palette)
    return canvas


def draw_shell(canvas: Canvas, left: int, top: int, right: int, bottom: int, radius: int, palette: Dict[str, Color]) -> None:
    canvas.fill_rounded_rect(left, top, right, bottom, radius, palette["dark"])
    canvas.fill_rounded_rect(left + 8, top + 8, right - 8, bottom - 8, max(8, radius - 8), palette["base"])
    canvas.fill_rounded_rect(left + 16, top + 16, right - 16, top + (bottom - top) // 2, max(8, radius - 12), lighten(palette["base"], 0.18))
    canvas.draw_line(left + 18, bottom - 18, right - 18, bottom - 18, darken(palette["dark"], 0.12), width=4)


def add_shadow(canvas: Canvas, left: int, bottom: int, right: int) -> None:
    canvas.fill_ellipse(left + 36, bottom + 12, right - 36, bottom + 42, (0, 0, 0, 70))


def add_side_brackets(canvas: Canvas, left: int, top: int, right: int, bottom: int, palette: Dict[str, Color], tier: int) -> None:
    bracket_h = 48 + tier * 10
    color = darken(palette["dark"], 0.05)
    for x in (left - 6, right - 20):
        canvas.fill_rounded_rect(x, top + 16, x + 24, top + 16 + bracket_h, 8, color)
        canvas.fill_rounded_rect(x, bottom - 16 - bracket_h, x + 24, bottom - 16, 8, color)


def add_rivet_runs(canvas: Canvas, left: int, top: int, right: int, bottom: int, palette: Dict[str, Color]) -> None:
    rivet = lighten(palette["dark"], 0.35)
    for x in range(left + 32, right - 20, 34):
        canvas.fill_ellipse(x - 3, top + 18, x + 3, top + 24, rivet)
        canvas.fill_ellipse(x - 3, bottom - 24, x + 3, bottom - 18, rivet)


def add_tier_markers(canvas: Canvas, left: int, top: int, right: int, bottom: int, palette: Dict[str, Color], tier: int) -> None:
    x = right - 28 - tier * 26
    for _ in range(tier):
        canvas.fill_rounded_rect(x, top + 24, x + 16, top + 34, 4, palette["accent"])
        x += 26


def add_energy_glow(canvas: Canvas, room: RoomDefinition, left: int, top: int, right: int, bottom: int, palette: Dict[str, Color]) -> None:
    cx = (left + right) // 2
    cy = (top + bottom) // 2
    glow = palette["glow"]
    if room.category in {"power", "science"}:
        canvas.fill_ellipse(cx - 72, cy - 72, cx + 72, cy + 72, glow)
    elif room.category in {"propulsion", "mining"}:
        canvas.fill_ellipse(right - 96, cy - 34, right - 10, cy + 34, glow)
    else:
        canvas.fill_rounded_rect(cx - 110, cy - 20, cx + 110, cy + 20, 20, glow)


def add_category_features(canvas: Canvas, room: RoomDefinition, left: int, top: int, right: int, bottom: int, palette: Dict[str, Color]) -> None:
    cx = (left + right) // 2
    cy = (top + bottom) // 2
    accent = palette["accent"]
    light = lighten(palette["base"], 0.24)
    dark = palette["dark"]

    if room.category == "propulsion":
        canvas.fill_rounded_rect(left + 34, cy - 42, cx + 34, cy + 42, 18, light)
        canvas.draw_line(left + 52, cy, right - 86, cy, accent, width=8)
        canvas.fill_ellipse(right - 104, cy - 46, right - 26, cy + 46, dark)
        canvas.fill_ellipse(right - 88, cy - 28, right - 26, cy + 28, accent)
    elif room.category == "power":
        canvas.fill_rounded_rect(cx - 86, cy - 86, cx + 86, cy + 86, 28, darken(light, 0.08))
        canvas.fill_ellipse(cx - 48, cy - 48, cx + 48, cy + 48, accent)
        canvas.fill_ellipse(cx - 20, cy - 20, cx + 20, cy + 20, light)
        for x in (cx - 98, cx - 62, cx + 62, cx + 98):
            canvas.draw_line(x, cy - 56, x, cy + 56, accent, width=6)
    elif room.category == "fuel":
        for x in (cx - 92, cx + 16):
            canvas.fill_rounded_rect(x, cy - 88, x + 72, cy + 88, 28, light)
            canvas.draw_line(x + 36, cy - 72, x + 36, cy + 72, accent, width=4)
        canvas.draw_line(cx - 10, cy, cx + 10, cy, accent, width=10)
        canvas.fill_rounded_rect(left + 38, cy - 14, left + 104, cy + 14, 10, dark)
    elif room.category == "storage":
        crates = [(cx - 118, cy - 66, 70, 122), (cx - 20, cy - 52, 70, 108), (cx + 78, cy - 38, 70, 94)]
        for x, y, w, h in crates:
            canvas.fill_rounded_rect(x, y, x + w, y + h, 12, light)
            canvas.draw_line(x + 14, y + 18, x + w - 14, y + 18, accent, width=4)
        canvas.fill_rounded_rect(right - 82, cy - 76, right - 38, cy + 76, 10, dark)
    elif room.category == "mining":
        canvas.fill_rounded_rect(left + 34, cy - 24, cx + 42, cy + 24, 16, light)
        canvas.draw_line(cx + 26, cy, right - 56, cy - 54, accent, width=7)
        canvas.draw_line(cx + 26, cy, right - 56, cy + 54, accent, width=7)
        canvas.fill_ellipse(right - 84, cy - 24, right - 34, cy + 24, dark)
    elif room.category == "navigation":
        canvas.fill_ellipse(cx - 132, cy - 112, cx - 22, cy - 2, light)
        canvas.draw_line(cx - 76, cy - 56, cx + 18, cy + 12, accent, width=6)
        canvas.fill_rounded_rect(cx + 12, cy - 72, right - 34, cy + 56, 18, dark)
        canvas.draw_line(cx + 28, cy - 18, right - 54, cy - 18, accent, width=4)
        canvas.draw_line(cx + 28, cy + 10, right - 72, cy + 10, accent, width=4)
    elif room.category == "hull":
        for y in (cy - 64, cy, cy + 64):
            canvas.draw_line(left + 42, y, right - 42, y, dark, width=9)
        for x in (left + 96, cx, right - 96):
            canvas.draw_line(x, top + 28, x, bottom - 28, accent, width=4)
        canvas.fill_rounded_rect(cx - 42, cy - 42, cx + 42, cy + 42, 12, (0, 0, 0, 0))
        canvas.draw_line(cx - 42, cy - 42, cx + 42, cy - 42, accent, width=4)
        canvas.draw_line(cx - 42, cy + 42, cx + 42, cy + 42, accent, width=4)
        canvas.draw_line(cx - 42, cy - 42, cx - 42, cy + 42, accent, width=4)
        canvas.draw_line(cx + 42, cy - 42, cx + 42, cy + 42, accent, width=4)
    elif room.category == "science":
        canvas.fill_rounded_rect(left + 34, cy - 70, cx + 24, cy + 70, 18, light)
        for x in (left + 56, left + 96, left + 136):
            canvas.fill_ellipse(x, cy - 18, x + 18, cy, accent)
        canvas.fill_rounded_rect(cx + 18, cy - 86, right - 30, cy + 86, 22, dark)
        canvas.fill_ellipse(cx + 54, cy - 46, right - 48, cy + 46, accent)
    elif room.category == "communication":
        mast_x = cx - 8
        canvas.draw_line(mast_x, bottom - 48, mast_x, top + 42, light, width=8)
        canvas.fill_ellipse(mast_x - 92, top + 24, mast_x + 92, top + 118, accent)
        canvas.fill_rounded_rect(left + 40, cy + 20, right - 58, bottom - 38, 18, dark)
        canvas.draw_line(mast_x, top + 96, right - 54, top + 52, accent, width=5)
    elif room.category == "life_support":
        canvas.fill_rounded_rect(left + 44, cy - 84, cx - 18, cy + 84, 28, light)
        canvas.fill_rounded_rect(cx + 8, cy - 74, right - 42, cy + 74, 22, dark)
        for x in (left + 74, left + 114, cx + 36, cx + 76):
            canvas.draw_line(x, cy - 58, x, cy + 58, accent, width=4)
        canvas.fill_ellipse(right - 146, cy - 58, right - 58, cy + 26, accent)


def lighten(color: Color, amount: float) -> Color:
    r, g, b, a = color
    return (
        min(255, int(r + (255 - r) * amount)),
        min(255, int(g + (255 - g) * amount)),
        min(255, int(b + (255 - b) * amount)),
        a,
    )


def darken(color: Color, amount: float) -> Color:
    r, g, b, a = color
    factor = max(0.0, 1.0 - amount)
    return (int(r * factor), int(g * factor), int(b * factor), a)


if __name__ == "__main__":
    main()
