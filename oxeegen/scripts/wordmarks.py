"""Composes the Oxee Hermes wordmarks from the icon geometry and outlined text.

usage: python oxeegen/scripts/wordmarks.py <outlines dir> <out dir>
The outlines dir holds out-Oxee.txt / out-Hermes.txt / out-Oxee Hermes.txt
from outline_text.py (Geist SemiBold, 68 px, tracking -2).
"""
import os
import sys

src, out = sys.argv[1], sys.argv[2]


def outline(name):
    with open(os.path.join(src, f'out-{name}.txt')) as f:
        width, d = f.read().split('\n', 1)
    return float(width), d.strip()


W_OX, OX = outline('Oxee')
W_HE, HE = outline('Hermes')
W_ALL, _ = outline('Oxee Hermes')
HE_X = W_ALL - W_HE  # where "Hermes" starts once the space is shaped in

ICON = ('<rect width="1024" height="1024" rx="230" fill="url(#oxg)"/><g fill="#fff">'
        '<path d="M362 252.2 A300 300 0 0 0 362 771.8 Z"/><path d="M662 252.2 A300 300 0 0 1 662 771.8 Z"/>'
        '<path d="M512 272 Q536 488 637 512 Q536 536 512 752 Q488 536 387 512 Q488 488 512 272 Z"/></g>')
GRAD = ('<linearGradient id="oxg" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="#4A44E2"/><stop offset="1" stop-color="#7F5CFB"/></linearGradient>')

# Same ink as the OxeePhone wordmarks
THEMES = {
    'light': ('#18181B', '#5E4AF5'),
    'dark': ('#F4F4F5', '#8E80FF'),
}


def write(name, vb, body):
    with open(os.path.join(out, name), 'w') as f:
        f.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}"><defs>{GRAD}</defs>{body}</svg>\n')


def words(x, y, ink, accent, s=1.0):
    return (f'<g transform="translate({x} {y}) scale({s})">'
            f'<path fill="{ink}" d="{OX}"/>'
            f'<g transform="translate({HE_X:.2f} 0)"><path fill="{accent}" d="{HE}"/></g></g>')


for theme, (ink, accent) in THEMES.items():
    # Horizontal: 100 px icon, text on the OxeePhone baseline
    w = 124 + W_ALL + 4
    write(f'oxee-hermes-wordmark-{theme}.svg', f'0 0 {w:.0f} 100',
          f'<g transform="scale(0.097656)">{ICON}</g>' + words(124, 72, ink, accent))
    # Stacked: icon above, text centred below
    sw = W_ALL + 40
    write(f'oxee-hermes-stacked-{theme}.svg', f'0 0 {sw:.0f} 270',
          f'<g transform="translate({(sw - 160) / 2:.1f} 0) scale(0.15625)">{ICON}</g>' + words(20, 250, ink, accent))
    # Text only (no icon), for places that already show the icon
    write(f'oxee-hermes-text-{theme}.svg', f'0 0 {W_ALL + 4:.0f} 72',
          words(2, 56, ink, accent))
