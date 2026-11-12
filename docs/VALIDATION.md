# Validation — 12 November 2026

- All 48 entries in the supplied SHA256SUMS.txt passed before changes.
- Python unittest discovery: 3 source-patcher tests passed (install/idempotence/restore, incompatible anchors, missing checkout).
- Composer plugin passed Node module syntax checking.
- The patcher accepted fetched current Hermes transcript/package files in an isolated temporary fixture. This checks patch anchors only, not compilation or runtime behavior.
- Reference commits and archive digest are in SOURCE-RECORD.json.

No Hermes installation was modified or launched. No full dependency installation, TypeScript build, actual renderer test, live streaming test or feature-parity test was performed. The supplied archive's existing limitations remain applicable. SHA256SUMS.txt records the original archive files, not the later planning changes to README.

Run baseline checks:

```sh
python3 -m unittest discover -s tests -v
node --input-type=module --check < extension/plugin.js
```

A proposed CI workflow is retained as `ci-workflow.example.yml`. GitHub refused workflow publication because the active credential lacks workflow scope, so automated checks are not enabled. The equivalent checks above ran locally.
