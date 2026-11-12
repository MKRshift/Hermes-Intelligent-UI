#!/usr/bin/env python3
"""Apply full upstream Thesys OpenUI renderer to a Hermes Desktop SOURCE checkout.
Idempotent within supported anchor constraints; never patch an installed signed binary.
"""
from pathlib import Path
import sys, os, json, shutil, datetime, re

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'vendor/thesys-lib'
if len(sys.argv)<2:
    raise SystemExit('Usage: python3 source/apply_patch.py /path/to/hermes-agent')
repo=Path(sys.argv[1]).expanduser().resolve()
entry=repo/'apps/desktop/src/components/assistant-ui/markdown-text.tsx'
manifest=repo/'apps/desktop/package.json'
if not entry.is_file() or not manifest.is_file():
    raise SystemExit('Not a Hermes Agent source checkout. Expected apps/desktop/src/components/assistant-ui/markdown-text.tsx')
orig=entry.read_text()
if 'HermesOpenUI' in orig:
    print('OpenUI renderer already integrated. No duplicate patch applied.')
    raise SystemExit(0)
needle="import { ArtifactCard } from './artifact-card'"
if orig.count(needle)!=1 or orig.count('SyntaxHighlighter: (props: SyntaxHighlighterProps) => {')!=1:
    raise SystemExit('Incompatible Hermes version. No changes made; check docs/ARCHITECTURE.md.')
backup=repo/'.hermes-openui-backups'/datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
backup.mkdir(parents=True,exist_ok=True)
shutil.copy2(entry,backup/'markdown-text.tsx')
shutil.copy2(manifest,backup/'package.json')
new=orig.replace(needle,"import { HermesOpenUI } from './openui-bridge'\n"+needle)
slot='SyntaxHighlighter: (props: SyntaxHighlighterProps) => {'
replacement="""SyntaxHighlighter: (props: SyntaxHighlighterProps) => {
          // Source-level integration: OpenUI Lang is rendered with the genuine
          // @openuidev/react-lang runtime and original Thesys component library.
          // Foreign chat previews and scratchpads NEVER execute these widgets.
          if (!previewOnly && !scratchpad && /^(openui|openui-lang|oui)$/i.test(props.language || '')) {
            return <HermesOpenUI response={props.code} isStreaming={isStreaming} />
          }
"""
new=new.replace(slot,replacement)
if new==orig or new.count('HermesOpenUI')!=2:
    raise SystemExit('Unable to patch Hermes markdown renderer. Backup at '+str(backup))
bridge_dest=entry.parent/'openui-bridge.tsx'
lib_dest=repo/'apps/desktop/src/components/assistant-ui/thesys-lib'
if bridge_dest.exists() or lib_dest.exists():
    raise SystemExit('Existing OpenUI files detected. No replacement performed. Restore originals or back them up first.')
try:
    shutil.copytree(SOURCE,lib_dest)
    shutil.copy2(ROOT/'bridge/openui-bridge.tsx',bridge_dest)
    # CSS is imported by bridge component; custom source library imports its own CSS.
    bridge_content=bridge_dest.read_text()
    bridge_dest.write_text("import './openui-styles.css'\n"+bridge_content)
    shutil.copy2(ROOT/'bridge/openui-styles.css',entry.parent/'openui-styles.css')
    entry.write_text(new)
    data=json.loads(manifest.read_text())
    for name, version in {
        '@openuidev/react-lang':'^1.0.0',
        '@openuidev/lang-core':'^1.0.0',
        'zod':'^4.4.3',
        'maplibre-gl':'^6.13.0',
    }.items():
        data.setdefault('dependencies',{})[name]=version
    manifest.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    (backup/'check.txt').write_text(f'Original markdown-text.tsx and package.json.\nCheckout: {repo}\n')
    (backup/'restore.command').write_text('#!/bin/bash\nset -euo pipefail\ncp "'+str(backup/'markdown-text.tsx')+'" "'+str(entry)+'"\ncp "'+str(backup/'package.json')+'" "'+str(manifest)+'"\nrm -f "'+str(bridge_dest)+'" "'+str(entry.parent/'openui-styles.css')+'"\nrm -rf "'+str(lib_dest)+'"\necho "Source restored. Run pnpm install to resolve the original lockfile."\n')
    os.chmod(backup/'restore.command',0o755)
    print('Applied real OpenUI source integration. Backup:',backup)
    print('Next: cd',repo,'&& pnpm install --no-frozen-lockfile && cd apps/desktop && pnpm run dev')
except BaseException:
    entry.write_text(orig)
    shutil.copy2(backup/'package.json',manifest)
    shutil.rmtree(lib_dest,ignore_errors=True)
    for f in [bridge_dest,entry.parent/'openui-styles.css']:
        f.unlink(missing_ok=True)
    raise
