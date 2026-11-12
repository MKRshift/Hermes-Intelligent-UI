import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location(
    "source_overlay", Path(__file__).resolve().parents[1] / "source/apply_patch.py"
)
overlay = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(overlay)


class TestSourcePatch(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.repo = Path(tmp.name, "hermes").resolve()
        self.repo.mkdir()
        self.git("init", "-q")
        self.git("config", "user.email", "test@example.invalid")
        self.git("config", "user.name", "Hermes OpenUI test")
        self.lockfile = self.repo / "pnpm-lock.yaml"
        self.lockfile.write_text("before\n")
        self.git("add", ".")
        self.git("commit", "-qm", "Hermes fixture")
        source = Path(tmp.name, "source")
        source.mkdir()
        (source / "hermes-revision.txt").write_text(self.git("rev-parse", "HEAD"))
        self.lockfile.write_text("after\n")
        (source / "hermes-desktop.patch").write_text(self.git("diff"))
        self.git("restore", "pnpm-lock.yaml")

        self.bridge = Path(tmp.name, "bridge.tsx")
        self.bridge.write_text("OpenUI bridge\n")
        self.target = overlay.TRANSCRIPT / "openui-bridge.tsx"
        for replacement in (
            patch.object(overlay, "ROOT", source.parent),
            patch.object(overlay, "payload", return_value=[(self.bridge, self.target)]),
        ):
            replacement.start()
            self.addCleanup(replacement.stop)

    def git(self, *args):
        return subprocess.check_output(["git", "-C", self.repo, *args], text=True)

    def test_install_repeat_and_restore_lockfile(self):
        overlay.install(self.repo)
        overlay.install(self.repo)
        self.assertEqual(self.lockfile.read_text(), "after\n")
        self.assertEqual((self.repo / self.target).read_bytes(), self.bridge.read_bytes())
        overlay.restore(self.repo)
        self.assertEqual(self.git("status", "--porcelain"), "")

    def test_refuses_to_restore_over_changed_bridge(self):
        overlay.install(self.repo)
        bridge = self.repo / self.target
        bridge.write_text("local change\n")
        with self.assertRaisesRegex(ValueError, "missing or changed"):
            overlay.restore(self.repo)
        self.assertEqual(bridge.read_text(), "local change\n")
        self.assertEqual(self.lockfile.read_text(), "after\n")

    def test_conflicting_lockfile_leaves_checkout_untouched(self):
        self.lockfile.write_text("local change\n")
        with self.assertRaises(ValueError):
            overlay.install(self.repo)
        self.assertEqual(self.lockfile.read_text(), "local change\n")
        self.assertFalse((self.repo / self.target).exists())
        self.assertFalse((self.repo / overlay.RECEIPT).exists())


if __name__ == "__main__":
    unittest.main()
