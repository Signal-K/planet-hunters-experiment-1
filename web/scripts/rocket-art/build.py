#!/usr/bin/env python3
"""Rocket art for SSL-427: one silhouette per rocket, drawn twice (closed
exterior and open cutaway) so the hangar, mission setup, launch and mining all
show the same ship. Output: public/game/assets/ships/*.png (needs rsvg-convert).
Run from web/: python3 scripts/rocket-art/build.py"""
import subprocess, pathlib, tempfile

INK, PAPER, PAPER2, ICE, BLUE, GREEN = '#0f2436', '#f4f8fc', '#dfeaf4', '#c4dcee', '#42a6df', '#1a8c7e'
OUT = pathlib.Path('public/game/assets/ships')

# name: (hull top, hull bottom, booster pods x-ranges, stripe colour)
MODELS = {
    'sr1': dict(top=90, bot=410, pods=[(500, 800)], stripe=GREEN),
    'sr2': dict(top=76, bot=424, pods=[(380, 620), (660, 900)], stripe='#c9482b'),
}

def silhouette(m, cutaway):
    top, bot, mid = m['top'], m['bot'], 250
    s = f'stroke="{INK}" stroke-width="7" stroke-linejoin="round"'
    body = PAPER2 if cutaway else PAPER
    parts = []
    # side boosters sit behind the hull
    for (x0, x1) in m['pods']:
        for (y0, y1, cap) in ((top - 62, top + 4, top - 62), (bot - 4, bot + 62, bot + 62)):
            parts.append(f'<rect x="{x0}" y="{y0}" width="{x1-x0}" height="{y1-y0}" rx="16" fill="{ICE}" {s}/>')
            tip = -1 if y0 < top else 1
            parts.append(f'<polygon points="{x0},{y0 if tip<0 else y1} {x0-46},{(y0+y1)//2} {x0},{y1 if tip<0 else y0}" fill="{ICE}" {s}/>')
    # tail fins
    parts.append(f'<polygon points="880,{top} 1010,{top-70} 1010,{top+20} 990,{top+60}" fill="{ICE}" {s}/>')
    parts.append(f'<polygon points="880,{bot} 1010,{bot+70} 1010,{bot-20} 990,{bot-60}" fill="{ICE}" {s}/>')
    # nozzle and aft taper
    parts.append(f'<polygon points="1000,{mid-95} 1190,{mid-130} 1190,{mid+130} 1000,{mid+95}" fill="{BLUE}" {s}/>')
    parts.append(f'<polygon points="880,{top} 1040,{mid-100} 1040,{mid+100} 880,{bot}" fill="{ICE}" {s}/>')
    # nose cone and hull body
    parts.append(f'<polygon points="6,{mid} 124,{top+40} 124,{bot-40}" fill="{ICE}" {s}/>')
    parts.append(f'<rect x="120" y="{top}" width="765" height="{bot-top}" rx="22" fill="{body}" {s}/>')
    if cutaway:
        # open bay: the room grid shows through, inset from the hull plating
        parts.append(f'<rect x="150" y="{top+30}" width="705" height="{bot-top-60}" rx="10" fill="#e9f3fa" stroke="{INK}" stroke-width="4" stroke-dasharray="14 10"/>')
    else:
        parts.append(f'<rect x="120" y="{mid-34}" width="765" height="68" fill="{m["stripe"]}" stroke="{INK}" stroke-width="7"/>')
        for x in (330, 640):
            parts.append(f'<rect x="{x}" y="{top}" width="34" height="{bot-top}" fill="{ICE}" {s}/>')
        parts.append(f'<circle cx="490" cy="{mid}" r="42" fill="{PAPER}" {s}/><circle cx="490" cy="{mid}" r="20" fill="{BLUE}" stroke="{INK}" stroke-width="5"/>')
    return ''.join(parts)

def render(name, m, cutaway):
    if cutaway:
        view, w, h, dest = '0 0 1200 500', 1200, 500, OUT / 'containers' / f'{name}_cutaway.png'
    else:
        view, w, h, dest = '0 0 1200 500', 960, 400, OUT / f'ship_{name}.png'
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}" width="{w}" height="{h}">{silhouette(m, cutaway)}</svg>'
    with tempfile.NamedTemporaryFile('w', suffix='.svg', delete=False) as f:
        f.write(svg)
    subprocess.run(['rsvg-convert', '-w', str(w), '-h', str(h), '-o', str(dest), f.name], check=True)

for name, m in MODELS.items():
    render(name, m, False)
    render(name, m, True)
