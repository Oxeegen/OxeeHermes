"""Derives the dark-theme Oxeegen logo from the official one (oxeegen.fr, 1200 x 231, grey #333333
lettering, violet #5E4AF5 mark): white lettering, the mark unchanged.
Both head the Oxeegen library's section in Capabilities (apps/desktop/src/oxeegen/library-section.tsx).

usage: uv run --no-project --with pillow python oxeegen/scripts/oxeegen_logo.py oxeegen/assets/wordmark
"""
import os
import sys

from PIL import Image

folder = sys.argv[1]
WHITE = (0xFF, 0xFF, 0xFF)

logo = Image.open(os.path.join(folder, 'oxeegen-logo-light.png')).convert('RGBA')
logo.putdata([(r, g, b, a) if b - r > 60 else (*WHITE, a) for r, g, b, a in logo.get_flattened_data()])
logo.save(os.path.join(folder, 'oxeegen-logo-dark.png'), optimize=True)
