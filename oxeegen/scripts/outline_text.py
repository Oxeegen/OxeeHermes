"""Outlines text set in Geist SemiBold into an SVG path, so wordmarks never depend
on the font being installed.

usage: uv run --with fonttools --with brotli --with uharfbuzz \
         python oxeegen/scripts/outline_text.py <geist.woff2> "<text>" <font-size> <letter-spacing>
prints: <advance width> then the path data (user units, baseline at y=0)
"""
import io
import sys

import uharfbuzz as hb
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

WEIGHT = 600

path, text, size, tracking = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
font = TTFont(path)
if 'fvar' in font:
    font = instantiateVariableFont(font, {'wght': WEIGHT})
buf = io.BytesIO()
font.flavor = None
font.save(buf)
blob = buf.getvalue()

upem = font['head'].unitsPerEm
scale = size / upem
hbfont = hb.Font(hb.Face(blob))
b = hb.Buffer()
b.add_str(text)
b.guess_segment_properties()
hb.shape(hbfont, b, {'kern': True, 'liga': True})

glyphs = font.getGlyphSet()
order = font.getGlyphOrder()
pen = SVGPathPen(glyphs)
x = 0.0
for info, pos in zip(b.glyph_infos, b.glyph_positions):
    name = order[info.codepoint]
    # font units -> user units, y flipped (SVG y grows downward)
    t = TransformPen(pen, (scale, 0, 0, -scale, x + pos.x_offset * scale, -pos.y_offset * scale))
    glyphs[name].draw(t)
    x += pos.x_advance * scale + tracking
print(round(x - tracking, 2))
print(pen.getCommands())
