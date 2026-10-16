"""Writes the B1 master SVGs (Oxeegen half-discs + spark) into oxeegen/assets."""
import sys, os
OUT = sys.argv[1]

LEFT = 'M362 252.2 A300 300 0 0 0 362 771.8 Z'
RIGHT = 'M662 252.2 A300 300 0 0 1 662 771.8 Z'
cx = cy = 512; h = 240; w = 125; p = 24
SPARK = (f'M{cx} {cy-h} Q{cx+p} {cy-p} {cx+w} {cy} Q{cx+p} {cy+p} {cx} {cy+h} '
         f'Q{cx-p} {cy+p} {cx-w} {cy} Q{cx-p} {cy-p} {cx} {cy-h} Z')
GLYPH = f'<path d="{LEFT}"/><path d="{RIGHT}"/><path d="{SPARK}"/>'


def grad(id_, a, b, user=False):
    units = ' gradientUnits="userSpaceOnUse" x1="212" y1="212" x2="812" y2="812"' if user else ' x1="0" y1="0" x2="1" y2="1"'
    return f'<linearGradient id="{id_}"{units}><stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/></linearGradient>'


def svg(name, defs, body, vb='0 0 1024 1024'):
    with open(os.path.join(OUT, name), 'w') as f:
        f.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}"><defs>{defs}</defs>{body}</svg>\n')


TILE = '<rect width="1024" height="1024" rx="230" fill="url(#bg)"/>'

# Main icon: brand gradient tile, white glyph
svg('icon.svg', grad('bg', '#4A44E2', '#7F5CFB'), TILE + f'<g fill="#fff">{GLYPH}</g>')
# Dark: near-black tile, half-discs carry the brand gradient, spark white
svg('icon-dark.svg', grad('fg', '#6A64F2', '#9F7CFF', user=True),
    '<rect width="1024" height="1024" rx="230" fill="#18181B"/>'
    f'<g fill="url(#fg)"><path d="{LEFT}"/><path d="{RIGHT}"/></g><path fill="#fff" d="{SPARK}"/>')
# Dev: same geometry drained of chroma, so a dev run is told apart in the dock
svg('icon-dev.svg', grad('bg', '#5A5870', '#7C7796'), TILE + f'<g fill="#fff">{GLYPH}</g>')
# Mono: glyph only, transparent, for title bar / tray / template images
svg('icon-mono.svg', '', f'<g fill="#fff">{GLYPH}</g>', vb='202 202 620 620')
svg('icon-mono-black.svg', '', f'<g fill="#000">{GLYPH}</g>', vb='202 202 620 620')
