# INITIATE

INITIATE is a brutalist, mobile-first oracle for executive function. It diagnoses activation resistance, reveals an oracle reading, offers one concrete micro-action, and keeps a local archive of transmissions, prediction errors, buried tasks, and memory patterns.

## Run

```bash
npm install
npm run dev
```

The MVP uses Vite, React, TypeScript, plain CSS, and localStorage. It has no backend, accounts, or AI calls.

## v2 Features

- Paralysis diagnostic engine
- Blockage-specific oracle cards
- Merged legacy oracle policy: intensity bands, gentler kind order, and too-hard adapter rules
- Resistance reframes
- False prophecy estimates and actuals
- Focus timer
- Interruption engine
- Field manual protocols
- Oracle memory
- Task graveyard
- Activation constellation

## Legacy Merge

The old `hgw3lls/initiate` version had a stronger execution engine: state-to-spread policy, card kinds, intensity bands, and an adapter that responds to `TOO_HARD` by reducing duration, reducing difficulty, downshifting to gentler action types, then offering two choices.

This version keeps the current mobile-first interface and ports those ideas into typed modules:

- `src/data/policy.ts` holds the legacy principles and adapter rules.
- `src/data/cards.ts` includes selected legacy cards as first-class oracle cards.
- `src/utils/adaptiveOracle.ts` applies adaptive draw and still-stuck behavior inside the current flow.
