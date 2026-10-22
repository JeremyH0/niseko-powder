# src/features

One folder per user-facing feature. Pages compose features; features don't import each
other's internals (share through `src/ui/`, `src/lib/` or `src/config/` instead).

```
src/features/<feature-name>/
  <Feature>.astro        # entry component(s) used by pages
  strings.ts             # defineMessages({ en: {...} }) — all copy for this feature
  <helper>.ts            # small pure helpers
  <helper>.test.ts       # tests live next to the code
  README.md              # optional: what it is, its flag, its data
```

Planned: `verdict` (the answer), `right-now`, `forecast`, `season-tracker`, `links`.
Unfinished features ship behind a flag in `src/config/flags.ts`.
