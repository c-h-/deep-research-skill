#!/usr/bin/env -S npx tsx
/**
 * Deep Research Client
 *
 * A standalone client for performing deep research using OpenAI Deep Research
 * or Perplexity Sonar APIs. Designed to be invoked by AI agents.
 *
 * Usage:
 *   npx tsx client.ts openai "Your research query"
 *   npx tsx client.ts perplexity "Your research query"
 *
 * Environment Variables:
 *   OPENAI_API_KEY - Required for OpenAI Deep Research
 *   PERPLEXITY_API_KEY - Required for Perplexity Sonar
 *   OPENAI_BASE_URL - Optional proxy (any OpenAI-compatible endpoint)
 */

import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types
// ============================================================================

export interface ResearchResult {
  provider: 'openai' | 'perplexity';
  query: string;
  report: string;
  sources: Source[];
  reasoning_summary?: string;
  duration_ms: number;
  timestamp: string;
}

export interface Source {
  title: string;
  url: string;
}

export interface CLIOptions {
  provider: 'openai' | 'perplexity';
  query: string;
  output?: string;
  background?: boolean;
  verbose?: boolean;
}

// ============================================================================
// OpenAI Deep Research
// ============================================================================

async function runOpenAIDeepResearch(
  query: string,
  verbose: boolean = false
): Promise<ResearchResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY environment variable is not set.\n' +
        "Set it with: export OPENAI_API_KEY='sk-...'"
    );
  }

  const baseURL = process.env.OPENAI_BASE_URL;
  const openai = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
  const startTime = Date.now();

  if (verbose) {
    console.error('[OpenAI] Starting deep research request...');
    console.error(`[OpenAI] Query: ${query.substring(0, 100)}...`);
    if (baseURL) {
      console.error(`[OpenAI] Using proxy: ${baseURL}`);
    }
  }

  // System instructions for structured research output
  const systemInstructions = `You are a professional research analyst preparing a comprehensive, structured report.

Your research should be:
- Thorough: Cover all aspects of the topic with depth
- Well-sourced: Include inline citations for every major claim
- Actionable: Provide specific details, code examples, and step-by-step guidance where applicable
- Structured: Use clear sections with headers
- Complete: Include edge cases, limitations, and gotchas

Format your output as a well-structured markdown report with:
1. Executive summary
2. Detailed sections covering all aspects
3. Code examples where relevant
4. A "Sources" section at the end listing all referenced URLs`;

  // Create the deep research request
  // Using the responses API with background mode for long-running tasks
  const response = await openai.responses.create({
    model: 'o4-mini-deep-research',
    instructions: systemInstructions,
    input: query,
    tools: [
      { type: 'web_search_preview' },
      { type: 'code_interpreter', container: { type: 'auto' } }
    ],
    reasoning: { summary: 'auto' },
    background: true // Run in background for long tasks
  });

  if (verbose) {
    console.error(`[OpenAI] Request submitted, ID: ${response.id}`);
    console.error(
      '[OpenAI] Polling for completion (this may take 5-30 minutes)...'
    );
  }

  // Poll for completion
  const responseId = response.id;
  let result: OpenAI.Responses.Response;
  let pollCount = 0;

  do {
    await sleep(5000); // Wait 5 seconds between polls
    pollCount++;

    result = await openai.responses.retrieve(responseId);

    if (verbose && pollCount % 6 === 0) {
      // Log every 30 seconds
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.error(
        `[OpenAI] Still running... (${elapsed}s elapsed, status: ${result.status})`
      );
    }
  } while (result.status !== 'completed' && result.status !== 'failed');

  if (result.status === 'failed') {
    throw new Error(`OpenAI Deep Research failed: ${JSON.stringify(result)}`);
  }

  const duration_ms = Date.now() - startTime;

  if (verbose) {
    console.error(`[OpenAI] Completed in ${Math.round(duration_ms / 1000)}s`);
  }

  // Extract the final report and sources from the response
  const { report, sources, reasoning_summary } = extractOpenAIResults(result);

  return {
    provider: 'openai',
    query,
    report,
    sources,
    reasoning_summary,
    duration_ms,
    timestamp: new Date().toISOString()
  };
}

function extractOpenAIResults(response: OpenAI.Responses.Response): {
  report: string;
  sources: Source[];
  reasoning_summary?: string;
} {
  let report = '';
  const sources: Source[] = [];
  let reasoning_summary: string | undefined;

  // The output array contains the steps and final message
  if (response.output && Array.isArray(response.output)) {
    for (const item of response.output) {
      // Look for the final message content
      if (item.type === 'message' && item.content) {
        for (const content of item.content) {
          // Handle both output_text and text content types
          if (content.type === 'output_text') {
            report += content.text || '';
          } else if ('text' in content && typeof content.text === 'string') {
            // Use type guard for other text-like content
            report += content.text;
          }
        }

        // Extract annotations/citations if present
        for (const content of item.content) {
          const contentWithAnnotations = content as {
            annotations?: { url?: string; title?: string }[];
          };
          if (contentWithAnnotations.annotations) {
            for (const annotation of contentWithAnnotations.annotations) {
              if (annotation.url) {
                sources.push({
                  title: annotation.title || annotation.url,
                  url: annotation.url
                });
              }
            }
          }
        }
      }

      // Extract reasoning summary if available
      if (item.type === 'reasoning' && 'summary' in item && item.summary) {
        // Summary can be an array of Summary objects with text property
        const summaryItems = item.summary as Array<{ text?: string } | string>;
        reasoning_summary = summaryItems
          .map((s) => (typeof s === 'string' ? s : s.text || ''))
          .join('\n');
      }
    }
  }

  // Deduplicate sources
  const uniqueSources = sources.filter(
    (source, index, self) =>
      index === self.findIndex((s) => s.url === source.url)
  );

  return { report, sources: uniqueSources, reasoning_summary };
}

// ============================================================================
// Perplexity Sonar Deep Research
// ============================================================================

async function runPerplexityResearch(
  query: string,
  verbose: boolean = false
): Promise<ResearchResult> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error(
      'PERPLEXITY_API_KEY environment variable is not set.\n' +
        "Set it with: export PERPLEXITY_API_KEY='pplx-...'"
    );
  }

  const startTime = Date.now();

  if (verbose) {
    console.error('[Perplexity] Starting deep research request...');
    console.error(
      '[Perplexity] Note: Deep research can take 5-30+ minutes to complete'
    );
    console.error(`[Perplexity] Query: ${query.substring(0, 100)}...`);
  }

  const systemPrompt = `You are a professional research analyst. Provide comprehensive, well-structured research with:
- Detailed analysis with inline citations
- Code examples where applicable
- Clear sections with headers
- A sources list at the end

Be thorough but focused. Every claim should be supported by a citation.`;

  // Use streaming for progress feedback on long-running requests
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'sonar-deep-research',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      stream: true, // Enable streaming for long responses
      return_citations: true,
      return_related_questions: false
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Perplexity API error (${response.status}): ${errorText}`);
  }

  // Handle streaming response
  let fullContent = '';
  let citations: string[] = [];
  let lastProgressUpdate = Date.now();

  if (response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.trim() || line.trim() === 'data: [DONE]') continue;

          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              // Extract content delta
              if (data.choices?.[0]?.delta?.content) {
                fullContent += data.choices[0].delta.content;
              }

              // Extract citations
              if (data.citations) {
                citations = data.citations;
              }

              // Progress logging (every 30 seconds)
              if (verbose && Date.now() - lastProgressUpdate > 30000) {
                const elapsed = Math.round((Date.now() - startTime) / 1000);
                console.error(
                  `[Perplexity] Still researching... (${elapsed}s elapsed, ${Math.round(fullContent.length / 1000)}KB received)`
                );
                lastProgressUpdate = Date.now();
              }
            } catch {
              // Skip malformed JSON chunks
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  const duration_ms = Date.now() - startTime;

  if (verbose) {
    const durationMin = Math.round(duration_ms / 60000);
    const durationSec = Math.round((duration_ms % 60000) / 1000);
    console.error(
      `[Perplexity] Completed in ${durationMin > 0 ? `${durationMin}m ` : ''}${durationSec}s`
    );
  }

  const sources: Source[] = citations.map((url: string, i: number) => ({
    title: `Source ${i + 1}`,
    url
  }));

  return {
    provider: 'perplexity',
    query,
    report: fullContent,
    sources,
    duration_ms,
    timestamp: new Date().toISOString()
  };
}

// ============================================================================
// Utilities
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatOutput(result: ResearchResult): string {
  let output = '';

  // Header
  output += `# Deep Research Report\n\n`;
  output += `**Provider:** ${result.provider === 'openai' ? 'OpenAI Deep Research' : 'Perplexity Sonar'}\n`;
  output += `**Generated:** ${result.timestamp}\n`;
  output += `**Duration:** ${Math.round(result.duration_ms / 1000)} seconds\n\n`;
  output += `---\n\n`;

  // Query
  output += `## Research Query\n\n${result.query}\n\n`;
  output += `---\n\n`;

  // Main report
  output += `## Report\n\n${result.report}\n\n`;

  // Reasoning summary (if available)
  if (result.reasoning_summary) {
    output += `---\n\n`;
    output += `## Reasoning Summary\n\n${result.reasoning_summary}\n\n`;
  }

  // Sources
  if (result.sources.length > 0) {
    output += `---\n\n`;
    output += `## Sources\n\n`;
    for (const source of result.sources) {
      output += `- [${source.title}](${source.url})\n`;
    }
  }

  return output;
}

export function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {
    provider: 'openai',
    query: '',
    background: false,
    verbose: false
  };

  let i = 0;

  // First arg is provider
  if (args[i] === 'openai' || args[i] === 'perplexity') {
    options.provider = args[i] as 'openai' | 'perplexity';
    i++;
  }

  // Remaining args
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--output' || arg === '-o') {
      options.output = args[++i];
    } else if (arg === '--background' || arg === '-b') {
      options.background = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (!arg.startsWith('-')) {
      // This is the query
      options.query = arg;
    }

    i++;
  }

  return options;
}

function printUsage(): void {
  console.log(`
Deep Research Client

Usage:
  npx tsx client.ts <provider> "query" [options]

Providers:
  openai      Use OpenAI Deep Research (o4-mini-deep-research by default)
              Cost-effective, extensive citations, takes 5-30 minutes
  perplexity  Use Perplexity Sonar (sonar-deep-research)
              Alternative option, real-time data, streaming progress

Options:
  --output, -o <file>   Save report to file instead of stdout
  --background, -b      Run in background (for long queries)
  --verbose, -v         Print progress to stderr

Environment Variables:
  OPENAI_API_KEY        Required for OpenAI provider
  OPENAI_BASE_URL       Optional proxy URL (any OpenAI-compatible endpoint)
  PERPLEXITY_API_KEY    Required for Perplexity provider

Examples:
  npx tsx client.ts openai "Research Stripe webhook integration" -v -o report.md
  npx tsx client.ts perplexity "Latest AI research trends" -v
  npx tsx client.ts openai "API integration guide" -o report.md -v
`);
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  const options = parseArgs(args);

  if (!options.query) {
    console.error('Error: No query provided');
    printUsage();
    process.exit(1);
  }

  try {
    let result: ResearchResult;

    if (options.provider === 'openai') {
      result = await runOpenAIDeepResearch(options.query, options.verbose);
    } else {
      result = await runPerplexityResearch(options.query, options.verbose);
    }

    const output = formatOutput(result);

    if (options.output) {
      const outputPath = path.resolve(options.output);
      fs.writeFileSync(outputPath, output, 'utf-8');
      console.log(`Report saved to: ${outputPath}`);
    } else {
      console.log(output);
    }
  } catch (error) {
    console.error(
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

// Only run main() when executed directly, not when imported
const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('client.ts');

if (isMainModule) {
  void main();
}
