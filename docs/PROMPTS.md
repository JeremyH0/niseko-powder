# Prompts for Claude Code

Paste these one at a time. Wait for Claude Code to finish and report, test what it tells you,
then paste the next one. Tip: start each phase in **plan mode** (Shift+Tab in Claude Code) so you
can approve the plan before it writes code.

---

## Kickoff (Phase 0)

```
Read CLAUDE.md and every file in docs/ carefully. This project is a free, non-commercial website
answering "Is it a powder day in Niseko?" with live JMA and Open-Meteo data, built to keep growing
with new features for years.

Do Phase 0 only, exactly as described in docs/ROADMAP.md:
- verify the hosting plan against the current official Astro and Cloudflare docs (free plan only),
- scaffold the project into this folder without deleting CLAUDE.md or docs/,
- set up the "Built to grow" folder structure, Vitest, wrangler config, git,
- write scripts/probe-data.ts, run it, and save real responses to tests/fixtures/,
- write docs/ARCHITECTURE.md,
- propose 5 brand names with domains to check.

Start by showing me your plan. When Phase 0 is done, stop and report: what you built, how I can
test it, decisions you made for me, and any questions. Don't start Phase 1 until I say go.
```

## Phase 1 — Data pipeline
```
Go for Phase 1 in docs/ROADMAP.md (data pipeline, no UI). Use the fixtures from Phase 0 for tests.
Show me your plan first. At the end, stop and report, including exactly how I trigger the cron
locally and what output I should see.
```

## Phase 2 — Homepage MVP
```
Go for Phase 2 in docs/ROADMAP.md. Function first, plain styling — design comes in Phase 3.
It must work with JavaScript disabled. Deploy to a workers.dev URL at the end and give me the link
and the redeploy steps. Plan first, then stop and report.
```

## Phase 3 — Art direction & motion
```
Go for Phase 3 in docs/ROADMAP.md. Before writing code, propose 2 art-direction options
(typography pairing, palette, mood, how the live snowfall behaves) and wait for my choice.
This is my portfolio piece: aim for luxury-hospitality quality, but keep Lighthouse mobile ≥ 95.
```

## Phase 4 — Season tracker
```
Go for Phase 4 in docs/ROADMAP.md. Verify the JMA past-data source for Kutchan first and tell me
what you found before writing the seed script. Plan first, then stop and report.
```

## Phase 5 — Reach
```
Go for Phase 5 in docs/ROADMAP.md. Ask me about Simplified vs Traditional Chinese before starting
the translation part. Plan first, then stop and report.
```

## Phase 6 — Launch
```
Go for Phase 6 in docs/ROADMAP.md. Walk me through connecting my custom domain step by step,
propose free alerting options, then write the case-study draft. Stop and report.
```

---

## Add a feature (reuse forever)

```
I want to add a feature: <describe it, or name it from docs/FEATURES.md>.

1. Re-read CLAUDE.md ("Built to grow") and docs/ARCHITECTURE.md.
2. Propose a short plan: which feature folder, any new provider/job/config, UI placement, tests,
   and whether it should ship behind a flag first. Flag anything that could cost money or break
   the Open-Meteo non-commercial terms.
3. Wait for my OK, then build it in src/features/<name>/ with tests.
4. Update docs/FEATURES.md (move to "Shipped" with today's date if released) and
   docs/ARCHITECTURE.md if the structure changed. Commit.
5. Report: what changed, how to test, how to turn it on/off.
```

## Health check (run every few weeks)

```
Do a project health check: run the tests and build, check the data jobs ran recently, look for
outdated dependencies (don't upgrade majors without asking), check Lighthouse on the homepage,
and re-verify the endpoints in docs/DATA_SOURCES.md still return the expected shape.
Report findings and suggest fixes; don't change anything until I approve.
```
