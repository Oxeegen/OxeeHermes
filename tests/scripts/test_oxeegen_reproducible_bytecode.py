"""Baked bytecode is the same from one build to the next (Oxee Hermes delta updates).

uv installs the venv with --compile-bytecode, which writes timestamp pycs. compileall judged
those up to date and kept them, so the payload shipped pycs stamped with each build's install
time instead of the unchecked-hash ones the bake promises: every release then "changed" the
~4,600 venv pycs, and a delta update (only the changed files) carried them all.
"""

import os
import py_compile
import sys
from pathlib import Path

from scripts.bundles.bytecode import bake_bytecode


def _payload(root: Path) -> Path:
    (root / "hermes-agent" / "pkg").mkdir(parents=True)
    (root / "hermes-agent" / "pkg" / "__init__.py").write_text("")
    tag = f"python{sys.version_info.major}.{sys.version_info.minor}"
    for env, name in (("venv", "dep.py"), ("pm-runtime", "pmdep.py")):
        site = root / env / "lib" / tag / "site-packages"
        site.mkdir(parents=True)
        source = site / name
        source.write_text("VALUE = 2\n")
        # What uv --compile-bytecode leaves behind: a timestamp pyc of the install time.
        py_compile.compile(str(source), invalidation_mode=py_compile.PycInvalidationMode.TIMESTAMP)
    return root


def _venv_pyc(root: Path) -> Path:
    return next(root.glob("venv/lib/python*/site-packages/__pycache__/dep*.pyc"))


def test_a_preinstalled_timestamp_pyc_is_rebaked_as_unchecked_hash(tmp_path):
    root = _payload(tmp_path)

    bake_bytecode(root, Path(sys.executable))

    assert _venv_pyc(root).read_bytes()[4:8] == b"\x01\x00\x00\x00"


def test_two_builds_of_the_same_sources_bake_identical_pycs(tmp_path):
    first = _payload(tmp_path / "first")
    second = _payload(tmp_path / "second")
    source = next(second.glob("venv/lib/python*/site-packages/dep.py"))
    stamp = source.stat()
    os.utime(source, (stamp.st_atime + 3600, stamp.st_mtime + 3600))

    bake_bytecode(first, Path(sys.executable))
    bake_bytecode(second, Path(sys.executable))

    assert _venv_pyc(first).read_bytes() == _venv_pyc(second).read_bytes()
