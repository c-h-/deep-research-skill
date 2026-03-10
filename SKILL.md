---
name: deep-research
description: >
  Performs in-depth, multi-step web research producing comprehensive reports with citations.
  Use when the user needs thorough analysis across multiple sources - API integrations,
  technical documentation, market research, or any complex query requiring synthesis of
  many sources. NOT for quick fact lookups (use web search instead).
---

# Deep Research Skill

Invokes OpenAI Deep Research or Perplexity Sonar for comprehensive, citation-rich research reports.

## When to Use

**Use for:** Complex integration guides, multi-source technical analysis, questions where "check the docs" is insufficient.

**Don't use for:** Quick facts, simple questions, time-sensitive queries (< 1 min).

## Critical: Prompt Quality

**Over-share context in your research prompt.** The API won't ask clarifying questions — it needs everything upfront to deliver high-value results.

Bad: "Research Stripe API"
Good: "Research Stripe webhook integration. Cover: 1) API docs location, 2) Auth methods with setup steps, 3) Key endpoints for event types, 4) SDKs, 5) Webhook verification, 6) Rate limits, 7) Code examples, 8) Edge cases and gotchas, 9) Testing environments. Include inline citations."

## Model Selection

**Default to o4-mini-deep-research (cost-effective). Use o3-deep-research only for hardest problems.**

| Need | Model | Time | Cost |
|------|-------|------|------|
| General research | o4-mini-deep-research | 5-30 min | ~$0.50 |
| Technical documentation | o4-mini-deep-research | 5-30 min | ~$0.50 |
| API research with citations | o4-mini-deep-research | 5-30 min | ~$0.50 |
| Mission-critical analysis | o3-deep-research | 5-30 min | ~$2.50 |
| Hardest reasoning problems | o3-deep-research | 5-30 min | ~$2.50 |

## Invocation

```bash
# Basic usage (saves to file)
npx tsx /path/to/deep-research-skill/client.ts openai "Your detailed query" -v -o ./output/report.md

# With proxy (any OpenAI-compatible endpoint)
OPENAI_BASE_URL=http://your-proxy:4000/v1 npx tsx /path/to/deep-research-skill/client.ts openai "Your query" -v -o ./report.md

# Perplexity alternative (better for real-time/news)
npx tsx /path/to/deep-research-skill/client.ts perplexity "Your query" -v -o ./report.md
```

## Environment Variables

- `OPENAI_API_KEY` — Required for OpenAI provider
- `OPENAI_BASE_URL` — Optional. Route through any OpenAI-compatible proxy.
- `PERPLEXITY_API_KEY` — Required for Perplexity provider

## OpenClaw Integration

1. **Save reports** to a known location (e.g., an Obsidian vault, a docs directory)
2. **Announce completion** via your configured channel with a link to the report
3. **Use descriptive filenames:** kebab-case (e.g., `stripe-webhooks-guide.md`)

## Timeouts

**Always use a 45-minute timeout.** Deep research can take 30+ minutes. Shorter timeouts waste API calls when the process is killed before completion.

- `exec` tool: `timeout: 2700` (45 min)
- `sessions_spawn`: `runTimeoutSeconds: 2700`

## Shell Environment

OpenClaw's `exec` tool doesn't run through a login shell, so env vars from `~/.zshrc` or `~/.bashrc` won't be available. Source your profile first:

```bash
source ~/.zshrc && npx tsx /path/to/deep-research-skill/client.ts openai "Your query" -v -o "output.md"
```

## Output Quality Expectations

Reports include: executive summary, detailed sections, code examples, edge cases/gotchas, and a sources list with clickable citations.

**Anti-pattern:** "Stripe has a REST API. Check their docs."
**Expected:** Detailed auth flows, endpoint examples, SDK usage, rate limits, common pitfalls — all with citations.
