# Engine V3 FINAL Candidate

Branch: `engine/v3-source-native-fidelity`

Baseline checkpoint: `94c4fddccde5d714f6ca9a247b87a0a9ef833f75`

Current FINAL RC commit target: `9a632d745974e6032c7f9e02adf876a53044b4e9`

Core invariants:
- immutable source-native baseline
- runtime freeze + dependency graph
- non-destructive edit delta
- runtime delta bridge + navigation guard
- click-to-edit selector inspector
- visual editor controls
- semantic editable map with unknown-preserve rule
- single renderer authority for editor/clean preview/export
- local project persistence + lifecycle manifest
- package ZIP export
- regression gate before merge
- no production Supabase writes from lab
- Fetch lifecycle = INSERT/new UUID
- Template Edit lifecycle = UPDATE/same UUID

Do not merge to `main` until the FINAL regression gate and visual interaction smoke tests pass.
