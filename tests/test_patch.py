import unittest,tempfile,shutil,subprocess,json
from pathlib import Path
R=Path(__file__).resolve().parents[1]
PATCH=R/'source/apply_patch.py'
class TestSourcePatch(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.repo=Path(self.tmp.name)/'hermes-agent'
  self.d=self.repo/'apps/desktop/src/components/assistant-ui';self.d.mkdir(parents=True)
  (self.d/'markdown-text.tsx').write_text("import { ArtifactCard } from './artifact-card'\nconst components = { SyntaxHighlighter: (props: SyntaxHighlighterProps) => { return null } }\n")
  (self.repo/'apps/desktop/package.json').write_text(json.dumps({'name':'hermes','dependencies':{'react':'19.3.0'}}))
 def tearDown(self): self.tmp.cleanup()
 def run_patch(self):
  return subprocess.run(['python3',str(PATCH),str(self.repo)],capture_output=True,text=True)
 def test_installs_real_components_and_actions(self):
  r=self.run_patch();self.assertEqual(r.returncode,0,r.stderr)
  c=(self.d/'markdown-text.tsx').read_text()
  self.assertIn('HermesOpenUI',c)
  self.assertIn("/^(openui|openui-lang|oui)$/i",c)
  self.assertIn('!previewOnly && !scratchpad',c)
  lib=self.d/'thesys-lib'
  self.assertIn('createLibrary', (lib/'library.ts').read_text())
  self.assertTrue((lib/'components/map/map.tsx').exists())
  self.assertTrue((lib/'components/html-view.tsx').exists())
  deps=json.loads((self.repo/'apps/desktop/package.json').read_text())['dependencies']
  self.assertIn('@openuidev/react-lang',deps)
  second=self.run_patch();self.assertEqual(second.returncode,0)
  self.assertEqual(c,(self.d/'markdown-text.tsx').read_text())
  restore=sorted((self.repo/'.hermes-openui-backups').glob('*/restore.command'))[-1]
  subprocess.run(['bash',str(restore)],check=True,capture_output=True)
  self.assertNotIn('HermesOpenUI',(self.d/'markdown-text.tsx').read_text())
  self.assertNotIn('@openuidev/react-lang',json.loads((self.repo/'apps/desktop/package.json').read_text())['dependencies'])
 def test_refuses_incompatible_hermes_without_source_mutation(self):
  p=self.d/'markdown-text.tsx';p.write_text('incompatible version\n')
  r=self.run_patch();self.assertNotEqual(r.returncode,0)
  self.assertEqual(p.read_text(),'incompatible version\n')
  self.assertFalse((self.d/'thesys-lib').exists())
 def test_refuses_unknown_source(self):
  p=self.repo/'apps/desktop/package.json';p.unlink()
  r=self.run_patch();self.assertNotEqual(r.returncode,0)
if __name__ == '__main__': unittest.main(verbosity=2)
