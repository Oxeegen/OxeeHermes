"""Oxeegen: commit and canary bundles package the committed Oxeegen icons, never the Nous render."""

from scripts.bundles.desktop import oxeegen_icons


def test_flavored_render_is_replaced_by_the_committed_oxeegen_icons(tmp_path):
    desktop = tmp_path / "apps/desktop"
    for name, data in {
        "assets/icon.ico": b"oxeegen ico",
        "assets/appx/Square44x44Logo.png": b"oxeegen tile",
        "packaging/dmg-volume.icns": b"oxeegen icns",
        "public/apple-touch-icon.png": b"oxeegen touch",
    }.items():
        (desktop / name).parent.mkdir(parents=True, exist_ok=True)
        (desktop / name).write_bytes(data)

    rendered = tmp_path / "products/icons/apps/desktop"
    for name in ("assets/icon.ico", "assets/appx/Square44x44Logo.png", "assets/icon.icon/Assets/art-light.png",
                 "packaging/dmg-volume.icns", "public/apple-touch-icon.png"):
        (rendered / name).parent.mkdir(parents=True, exist_ok=True)
        (rendered / name).write_bytes(b"nous girl + commit badge")

    oxeegen_icons(desktop, rendered)

    assert (rendered / "assets/icon.ico").read_bytes() == b"oxeegen ico"
    assert (rendered / "assets/appx/Square44x44Logo.png").read_bytes() == b"oxeegen tile"
    assert not (rendered / "assets/icon.icon/Assets/art-light.png").exists()
    assert (rendered / "packaging/dmg-volume.icns").read_bytes() == b"oxeegen icns"
    assert (rendered / "public/apple-touch-icon.png").read_bytes() == b"oxeegen touch"
