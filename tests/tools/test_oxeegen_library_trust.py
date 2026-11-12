"""Oxee Hermes: skills from Oxeegen's library install as trusted, through any hub source that serves them."""

import pytest

from tools.skills_guard import _resolve_trust_level


@pytest.mark.parametrize("source", [
    "Oxeegen/OxeeLibrary/skills/weekly-sales",
    "skills-sh/Oxeegen/OxeeLibrary/skills/weekly-sales",
])
def test_oxeegen_library_skills_are_trusted(source):
    assert _resolve_trust_level(source) == "trusted"


def test_a_lookalike_repository_is_not():
    assert _resolve_trust_level("Oxeegen/OxeeLibraryFake/skills/weekly-sales") == "community"
