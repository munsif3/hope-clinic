# Hope Clinic

A private web app for a solo, home-based Unani practice: patient records, consultations with structured prescriptions, printed patient handouts, follow-ups, appointment scheduling and optional medicine stock.

Live at https://hope-clinic.web.app (staff sign-in only).

## Documentation

Start with [docs/foundation](docs/foundation/README.md):

- [Business Requirements](docs/foundation/BRD.md)
- [Software Requirements](docs/foundation/SRS.md)
- [Technical Design](docs/foundation/TDD.md)
- [Data Protection and Security Assessment](docs/foundation/DATA_PROTECTION.md)

Release and verification steps are in [docs/RELEASE.md](docs/RELEASE.md). Guidance for AI coding agents is in [AGENTS.md](AGENTS.md).

## Stack

React 19, Vite, React Router, Tailwind CSS, Firebase Authentication, Cloud Firestore, Firebase Hosting, vite-plugin-pwa.

## Getting started

Requires Node 22+. Java and Google Chrome are needed for emulator and browser tests.

```bash
npm install
cp .env.example .env.local   # fill in Firebase web config (never commit)
npm run dev
```

For a local demo with synthetic data and no connection to production, start the Firebase emulators, seed them with `node tests/seed-demo.mjs`, and run the dev server with `VITE_USE_EMULATORS=true`. Details in [docs/IMPLEMENTATION_01.md](docs/IMPLEMENTATION_01.md).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run lint` | ESLint |
| `npm test` | Unit and render tests |
| `npm run test:integration` | Firestore rules and service tests on emulators |
| `npm run test:browser` | Playwright journey |
| `npm run verify` | Full release verification; writes a receipt |
| `npm run deploy` | Deploys rules, indexes and hosting, only with a fresh matching receipt |

## Data handling

This app holds real patient health records. Use synthetic data for all development and testing, never log patient details, and read the [Data Protection assessment](docs/foundation/DATA_PROTECTION.md) before changing access, storage or hosting.
