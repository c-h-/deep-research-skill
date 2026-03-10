# Deep Research Skill

An [OpenClaw](https://github.com/openclaw/openclaw) skill for performing comprehensive, multi-step web research using OpenAI's Deep Research API or Perplexity Sonar. Produces citation-rich markdown reports.

## Quick Start

```bash
# Install dependencies
yarn install  # or npm install

# Set your API key
export OPENAI_API_KEY="sk-..."

# Run research (uses o4-mini-deep-research by default)
npx tsx client.ts openai "Research Stripe webhook integration..." -v -o ./report.md
```

## Usage

```bash
# OpenAI Deep Research (default, recommended)
npx tsx client.ts openai "Your research query" -v -o report.md

# Perplexity Sonar (alternative — better for real-time/news)
npx tsx client.ts perplexity "Your research query" -v -o report.md

# With a proxy (any OpenAI-compatible endpoint)
OPENAI_BASE_URL=http://localhost:4000/v1 npx tsx client.ts openai "Your query" -v -o report.md
```

### Options

| Flag | Description |
|------|-------------|
| `-o, --output <file>` | Save report to file (otherwise prints to stdout) |
| `-v, --verbose` | Print progress to stderr |
| `-b, --background` | Run in background mode |

## Model Selection

This skill defaults to **o4-mini-deep-research** — the best quality-to-cost ratio for technical research.

| Model | Cost/query | When to use |
|-------|-----------|-------------|
| **o4-mini-deep-research** | ~$0.50 | Default. Technical docs, API research, integration guides |
| **o3-deep-research** | ~$2.50 | Mission-critical analysis where o4-mini is insufficient |
| **Perplexity sonar-deep-research** | ~$0.58 | Real-time news, fresher data, streaming progress |

**Why o4-mini over o3?** Same quality for technical synthesis at 1/5th the cost. o4-mini produces more citations — critical for technical documentation. Reserve o3 for truly hard problems.

**Why o4-mini over Perplexity?** Better citation density, better structured outputs, same cost. Use Perplexity when you need fresher/real-time data.

To use o3-deep-research, edit the model name in `client.ts` line 91.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | For OpenAI | Your OpenAI API key |
| `OPENAI_BASE_URL` | No | Route through any OpenAI-compatible proxy |
| `PERPLEXITY_API_KEY` | For Perplexity | Your Perplexity API key |

## OpenClaw Skill Integration

Drop this into your OpenClaw skills directory and reference `SKILL.md` in your agent configuration. The skill tells the agent when and how to invoke deep research.

```bash
# Example: copy into your skills directory
cp -r deep-research-skill ~/.openclaw/skills/deep-research
```

## Output Format

Reports are structured markdown with:
- Executive summary
- Detailed sections with inline citations
- Code examples where relevant
- Reasoning summary (when available)
- Sources list with clickable links

## Development

```bash
yarn install          # Install dependencies
yarn test             # Run tests (vitest)
yarn typecheck        # TypeScript check
yarn lint             # ESLint
yarn lint:fix         # Auto-fix lint issues
```

## Files

| File | Description |
|------|-------------|
| `client.ts` | Main CLI — OpenAI and Perplexity deep research client |
| `client.test.ts` | Test suite (26 test cases) |
| `SKILL.md` | OpenClaw skill definition (agent instructions) |
| `README.md` | This file |

## License

MIT
