#!/usr/bin/env python3
"""Rocket art for SSL-427: one silhouette per rocket, drawn twice (closed
exterior and open cutaway) so the hangar, mission setup, launch and mining all
show the same ship. Output: public/game/assets/ships/*.png (needs rsvg-convert).
The hull spans the cutaway room grid (x 7-93%, y 13-84% of 1200x500).
Run from web/: python3 scripts/rocket-art/build.py"""
import subprocess, pathlib, tempfile

INK, BLUE = '#0f2436', '#42a6df'
OUT = pathlib.Path('public/game/assets/ships')

MODELS = {
    'sr1': dict(pods=[(560, 900)], stripe='#1a8c7e', stripe2='#14695f', windows=3),
    'sr2': dict(pods=[(420, 640), (680, 900)], stripe='#27a9c9', stripe2='#17718a', windows=4),
}
TOP, BOT, MID = 72, 428, 250

DEFS = f'''<defs>
<linearGradient id="hull" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0" stop-color="#d7e8f5"/><stop offset=".18" stop-color="#a9cce6"/>
 <stop offset=".6" stop-color="#7fb0d5"/><stop offset="1" stop-color="#5b8fb8"/></linearGradient>
<linearGradient id="pod" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0" stop-color="#b9d6ea"/><stop offset="1" stop-color="#6c9fc5"/></linearGradient>
<linearGradient id="nose" x1="0" y1="0" x2="1" y2="0">
 <stop offset="0" stop-color="#e6f1f9"/><stop offset="1" stop-color="#8dbbdb"/></linearGradient>
<linearGradient id="noz" x1="0" y1="0" x2="1" y2="0">
 <stop offset="0" stop-color="#2f86c0"/><stop offset="1" stop-color="#78c4f0"/></linearGradient>
<linearGradient id="bay" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0" stop-color="#a3c8e3"/><stop offset="1" stop-color="#cfe3f2"/></linearGradient>
</defs>'''

def exterior_and_shell(m, cutaway):
    s = f'stroke="{INK}" stroke-width="6" stroke-linejoin="round"'
    p = []
    for (x0, x1) in m['pods']:
        for up in (True, False):
            y0, y1 = (TOP - 46, TOP + 10) if up else (BOT - 10, BOT + 46)
            p.append(f'<rect x="{x0}" y="{y0}" width="{x1-x0}" height="{y1-y0}" rx="14" fill="url(#pod)" {s}/>')
            tx = (y0 + y1) / 2
            p.append(f'<polygon points="{x0},{y0+4} {x0-40},{tx} {x0},{y1-4}" fill="#e3f0f9" {s}/>')
            p.append(f'<line x1="{x0+30}" y1="{y0+14}" x2="{x1-30}" y2="{y0+14}" stroke="#ffffff" stroke-opacity=".55" stroke-width="5" stroke-linecap="round"/>')
    # tail fins
    p.append(f'<polygon points="930,{TOP+6} 1070,{TOP-58} 1082,{TOP-10} 1010,{TOP+70}" fill="url(#pod)" {s}/>')
    p.append(f'<polygon points="930,{BOT-6} 1070,{BOT+58} 1082,{BOT+10} 1010,{BOT-70}" fill="url(#pod)" {s}/>')
    # nozzle bell and aft taper
    p.append(f'<polygon points="1060,{MID-90} 1192,{MID-128} 1192,{MID+128} 1060,{MID+90}" fill="url(#noz)" {s}/>')
    for k in (-70, 0, 70):
        p.append(f'<line x1="1100" y1="{MID+k*0.8}" x2="1180" y2="{MID+k*1.05}" stroke="#ffffff" stroke-opacity=".5" stroke-width="5" stroke-linecap="round"/>')
    for x in (1090, 1130, 1165):
        p.append(f'<line x1="{x}" y1="{MID-100-(x-1060)*0.28:.0f}" x2="{x}" y2="{MID+100+(x-1060)*0.28:.0f}" stroke="{INK}" stroke-opacity=".5" stroke-width="3"/>')
    p.append(f'<polygon points="900,{TOP} 1070,{MID-92} 1070,{MID+92} 900,{BOT}" fill="url(#hull)" {s}/>')
    # nose cone
    p.append(f'<path d="M6,{MID} C40,{TOP+60} 70,{TOP+14} 112,{TOP} L112,{BOT} C70,{BOT-14} 40,{BOT-60} 6,{MID} Z" fill="url(#nose)" {s}/>')
    # hull body
    p.append(f'<rect x="100" y="{TOP}" width="820" height="{BOT-TOP}" rx="26" fill="url(#hull)" {s}/>')
    return ''.join(p)

def exterior_details(m):
    s = f'stroke="{INK}" stroke-width="5"'
    p = [f'<rect x="100" y="{MID-36}" width="820" height="72" fill="{m["stripe"]}" {s}/>',
         f'<rect x="100" y="{MID+14}" width="820" height="22" fill="{m["stripe2"]}" stroke="{INK}" stroke-width="5"/>']
    for x in (330, 620):
        p.append(f'<rect x="{x}" y="{TOP}" width="30" height="{BOT-TOP}" fill="#cfe3f2" {s}/>')
    for x in (190, 400, 700, 850):
        for y in (TOP + 22, BOT - 22):
            p.append(f'<circle cx="{x}" cy="{y}" r="5" fill="{INK}" fill-opacity=".55"/>')
    n = m['windows']; x0 = 410 if n == 3 else 370; gap = 64
    for i in range(n):
        cx = x0 + i * gap + 30
        p.append(f'<circle cx="{cx}" cy="{MID-4}" r="24" fill="#eaf4fb" {s}/><circle cx="{cx}" cy="{MID-4}" r="13" fill="{BLUE}" stroke="{INK}" stroke-width="4"/>')
    # hazard chevrons on the nose collar
    for i in range(5):
        x = 112 + i * 0
        y = TOP + 18 + i * 62
        p.append(f'<polygon points="104,{y} 128,{y} 148,{y+18} 124,{y+18}" fill="#f2c230" stroke="{INK}" stroke-width="3"/>')
    # access hatch, vent slats and seam lines on the upper hull
    p.append(f'<rect x="210" y="{TOP+36}" width="86" height="54" rx="8" fill="#cfe3f2" {s}/><circle cx="283" cy="{TOP+63}" r="5" fill="{INK}"/>')
    for k in range(5):
        p.append(f'<line x1="{690+k*26}" y1="{TOP+34}" x2="{690+k*26}" y2="{TOP+82}" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>')
    for y in (TOP + 104, BOT - 104):
        p.append(f'<line x1="110" y1="{y}" x2="910" y2="{y}" stroke="{INK}" stroke-opacity=".28" stroke-width="3"/>')
    # lower belly highlight and shadow panels
    p.append(f'<rect x="210" y="{BOT-80}" width="86" height="44" rx="8" fill="#6c9fc5" {s}/>')
    p.append(f'<rect x="420" y="{BOT-70}" width="180" height="30" rx="8" fill="#6c9fc5" {s}/>')
    # antenna mast with dish on top of the hull
    p.append(f'<line x1="520" y1="{TOP}" x2="520" y2="{TOP-26}" stroke="{INK}" stroke-width="6" stroke-linecap="round"/>')
    p.append(f'<path d="M494,{TOP-30} Q520,{TOP-6} 546,{TOP-30} Z" fill="#e3f0f9" {s}/>')
    return ''.join(p)

def cutaway_bay(m):
    # open hull: bay interior with bulkheads, ribs and cable runs, room grid sits on top
    x0, x1, y0, y1 = 150, 1010, 98, 402
    p = [f'<rect x="{x0}" y="{y0}" width="{x1-x0}" height="{y1-y0}" rx="12" fill="url(#bay)" stroke="{INK}" stroke-width="5"/>']
    for x in range(x0 + 70, x1, 70):
        p.append(f'<line x1="{x}" y1="{y0}" x2="{x}" y2="{y1}" stroke="#5b8fb8" stroke-opacity=".45" stroke-width="3"/>')
    for y in (y0 + 76, y0 + 152, y0 + 228):
        p.append(f'<line x1="{x0}" y1="{y}" x2="{x1}" y2="{y}" stroke="#5b8fb8" stroke-opacity=".45" stroke-width="3"/>')
    for x in (x0 + 140, x0 + 420, x0 + 700):
        p.append(f'<rect x="{x}" y="{y0-8}" width="22" height="{y1-y0+16}" fill="#6c9fc5" stroke="{INK}" stroke-width="5"/>')
    # conduits along the ceiling, floor deck plates and pipe runs
    for y, col in ((y0 + 14, '#2f86c0'), (y0 + 26, '#27a9c9'), (y1 - 14, '#1a8c7e')):
        p.append(f'<line x1="{x0+8}" y1="{y}" x2="{x1-8}" y2="{y}" stroke="{col}" stroke-width="6" stroke-linecap="round"/>')
    for x in range(x0 + 40, x1 - 20, 120):
        p.append(f'<circle cx="{x}" cy="{y0+14}" r="6" fill="#e3f0f9" stroke="{INK}" stroke-width="3"/>')
    for x in range(x0 + 20, x1 - 40, 60):
        p.append(f'<rect x="{x}" y="{y1-8}" width="48" height="8" fill="#6c9fc5" stroke="{INK}" stroke-width="2"/>')
    # fuel tank hints at the aft end and a cockpit window at the nose
    p.append(f'<rect x="{x1-92}" y="{y0+40}" width="76" height="{y1-y0-80}" rx="30" fill="#8dbbdb" stroke="{INK}" stroke-width="4"/>')
    p.append(f'<line x1="{x1-54}" y1="{y0+52}" x2="{x1-54}" y2="{y1-52}" stroke="#ffffff" stroke-opacity=".5" stroke-width="5" stroke-linecap="round"/>')
    p.append(f'<line x1="{x0+10}" y1="{MID}" x2="{x1-10}" y2="{MID}" stroke="{m["stripe"]}" stroke-width="6" stroke-dasharray="3 12" stroke-linecap="round"/>')
    return ''.join(p)

def silhouette(m, cutaway):
    body = exterior_and_shell(m, cutaway)
    return body + (cutaway_bay(m) if cutaway else exterior_details(m))

def render(name, m, cutaway):
    if cutaway:
        w, h, dest = 1200, 500, OUT / 'containers' / f'{name}_cutaway.png'
    else:
        w, h, dest = 960, 400, OUT / f'ship_{name}.png'
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" width="{w}" height="{h}">{DEFS}{silhouette(m, cutaway)}</svg>'
    with tempfile.NamedTemporaryFile('w', suffix='.svg', delete=False) as f:
        f.write(svg)
    subprocess.run(['rsvg-convert', '-w', str(w), '-h', str(h), '-o', str(dest), f.name], check=True)

for name, m in MODELS.items():
    render(name, m, False)
    render(name, m, True)
