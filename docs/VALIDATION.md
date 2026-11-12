# Validation

## Pinned Desktop build — 12 November 2026

Hermes revision `e3bf4be5df04cf72dab4914b073361c71af1dbe1`, Apple silicon macOS, Node 26.13.1, pnpm 12.15.0, Electron 44.9.3, and Hermes-managed Python 3.14.9.

- The installer applied the source overlay to a clean checkout and installed with the frozen lockfile. Repeat application verifies the overlay. Restore returned the checkout to its original Git status.
- The Desktop TypeScript checks and production build passed. The archive's dangling import of the Thesys prompt-generation module was removed; the pre-generated composer prompt is unchanged.
- In the built Hermes Electron app, an isolated local inference fixture streamed a fenced OpenUI reply. The transcript rendered a real chart and form. Moving the slider from 3 to 4 changed the total from 375 to 500 NOK; the follow-up button drafted the updated value and form payload. The fixture recorded no second prompt.
- Three local overlay tests and the composer plugin syntax check passed.

[See the chart, form and unsent draft in the test window](evidence/openui-transcript.png).

The model reply was scripted. Live provider generation and the Visual mode prompt were not tested. Editing a control before its message settles can still lose the input; the interaction test waits for the reply to finish. Identical blocks can still share persisted state. Image search, street routing and broad component parity remain unverified. The installed Hermes app and its chat profile were not used for the test.

## Repeat the smoke test

Run these from the integration repository. Use a dedicated checkout and provision a source interpreter with Hermes's development setup. The test fixture isolates the Electron profile, starts a local mock inference provider and strips credentials.

```sh
./Install_Source_Integration.command /path/to/hermes-source
cp tests/desktop/openui-smoke.spec.ts /path/to/hermes-source/apps/desktop/e2e/
cd /path/to/hermes-source
export HERMES_HOME="$PWD/.openui-test-home"
export HERMES_RUNTIME_DIR="$PWD/.openui-test-tools"
cd apps/desktop
../../scripts/run-in-hermes-env bash -c '
  export HERMES_DESKTOP_PYTHON="${__HERMES_TEST_PYTHON:?}"
  pnpm run typecheck &&
    pnpm run build &&
    pnpm exec playwright test openui-smoke.spec.ts --reporter=list
'
```

Local overlay checks:

```sh
python3 -m unittest discover -s tests -v
node --input-type=module --check < extension/plugin.js
```

The sample CI workflow remains inactive because the GitHub credential lacks workflow scope. The original archive checksums are recorded on `main`; see [source provenance](SOURCE-RECORD.json) for its archive digest.
