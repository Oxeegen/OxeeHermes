"""Packs PNGs into .ico (PNG-compressed entries) and .icns, matching upstream's layout."""
import struct, sys, os
d = sys.argv[1]


def png(name):
    with open(os.path.join(d, name), 'rb') as f:
        return f.read()


def ico(prefix, out):
    sizes = [16, 24, 32, 48, 64, 128, 256]
    blobs = [png(f'{prefix}-{s}.png') for s in sizes]
    head = struct.pack('<HHH', 0, 1, len(sizes))
    off = 6 + 16 * len(sizes)
    entries = b''
    for s, b in zip(sizes, blobs):
        dim = 0 if s >= 256 else s
        entries += struct.pack('<BBBBHHII', dim, dim, 0, 0, 1, 32, len(b), off)
        off += len(b)
    with open(os.path.join(d, out), 'wb') as f:
        f.write(head + entries + b''.join(blobs))


def icns(prefix, out):
    # type -> pixel size (ic11..ic14 are the @2x slots)
    types = [('ic07', 128), ('ic08', 256), ('ic09', 512), ('ic10', 1024),
             ('ic11', 32), ('ic12', 64), ('ic13', 512), ('ic14', 1024)]
    body = b''
    for t, s in types:
        b = png(f'{prefix}-{s}.png')
        body += t.encode() + struct.pack('>I', len(b) + 8) + b
    with open(os.path.join(d, out), 'wb') as f:
        f.write(b'icns' + struct.pack('>I', len(body) + 8) + body)


ico('icon', 'icon.ico')
ico('icon-dark', 'icon-dark.ico')
icns('icon', 'icon.icns')
icns('icon-dark', 'icon-dark.icns')
print('ico/icns ok')
