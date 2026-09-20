# IndoLegalBench — Client

Frontend for IndoLegalBench, Veritask's internal platform for writing,
reviewing, versioning and running Indonesian legal test cases against several
AI products at once.

Built with Next.js (App Router), TypeScript and Tailwind CSS.

## Related repositories

| Repo | Contents |
|---|---|
| `IndoLegalBench-client` | This repo. Next.js frontend |
| `IndoLegalBench-server` | FastAPI backend. Owns the OpenAPI contract |

## Getting started

Requires Node.js 20 or newer.

```bash
git clone https://github.com/veritaskai-labs/IndoLegalBench-client.git
cd IndoLegalBench-client
npm install
cp .env.example .env.local   # fill in the values
npm run dev
```

The app runs at http://localhost:3000.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Production build. CI runs this on every PR |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint. CI runs this on every PR |

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before your first commit. The rules
that catch people out most often:

- Branch from `staging`, never from `main`
- Name branches `<type>/<pbi>-<description>`, e.g. `feat/pbi3-case-editor`
- Open PRs against `staging`, one PR per sub task
- Every PR needs one approval and a green CI run
- Never commit `.env.local`, credentials or API keys

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs lint, test and
build on every push and pull request touching `main` or `staging`.
