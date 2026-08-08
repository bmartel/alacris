---
title: AI agents
description: A drop-in AGENTS.md that teaches coding agents the Alacris conventions — with or without a build system.
sidebar:
  order: 6
---

If you build with Claude Code, Cursor, Copilot, or any other coding agent,
give the agent the same conventions this documentation teaches you. Alacris
ships a ready-made instructions file for that:

<p>
  <a href="/alacris/AGENTS.md" download="AGENTS.md"><strong>⬇ Download AGENTS.md</strong></a>
</p>

Put it in your project root as `AGENTS.md` — the emerging convention that
Claude Code, Cursor, Codex and others read automatically — or paste its
contents into `CLAUDE.md`, `.cursorrules`, or whatever your tool uses.

```bash
curl -o AGENTS.md https://bmartel.github.io/alacris/AGENTS.md
```

## What it covers

The file is self-contained — an agent needs no other context to produce
idiomatic Alacris code:

- **The mental model**, stated as hard rules: a function in `${}` is a live
  binding, `setup` runs once, there is no re-render.
- **Both setup paths** — a no-build import map and the npm/bundler route —
  and the instruction not to introduce a build step into a project that
  doesn't have one.
- **Project organization**: one component per file, tag-name prefixes, where
  stores, contexts and shared style tokens live.
- **The full binding syntax**, `each` and keying, `store` / `selector`,
  context, and the styling and theming contract (`vars`, `::part`, never
  `!important`).
- **Security rules** the agent must not break — no untrusted `.innerHTML`,
  scheme-validate URLs, keep runtime values out of `css` templates. See
  [Security](../security/) for the model behind them.
- **A wrong → right table** of the mistakes agents (and people) actually
  make, and a verification checklist to run before declaring a task done.

## For search and retrieval

The site also serves [`llms.txt`](/alacris/llms.txt) — a machine-readable map
of this documentation following the [llms.txt convention](https://llmstxt.org/) —
so agents that fetch documentation on demand can find the right page in one
hop.
