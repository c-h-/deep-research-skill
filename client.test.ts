import { describe, it, expect } from 'vitest';
import { parseArgs, formatOutput, type ResearchResult } from './client.js';

describe('parseArgs', () => {
  it('parses provider as first argument', () => {
    const result = parseArgs(['openai', 'test query']);
    expect(result.provider).toBe('openai');
    expect(result.query).toBe('test query');
  });

  it('parses perplexity provider', () => {
    const result = parseArgs(['perplexity', 'test query']);
    expect(result.provider).toBe('perplexity');
  });

  it('defaults to openai when no provider specified', () => {
    const result = parseArgs(['test query']);
    expect(result.provider).toBe('openai');
    expect(result.query).toBe('test query');
  });

  it('parses --output flag', () => {
    const result = parseArgs(['openai', 'query', '--output', 'report.md']);
    expect(result.output).toBe('report.md');
  });

  it('parses -o shorthand', () => {
    const result = parseArgs(['openai', 'query', '-o', 'report.md']);
    expect(result.output).toBe('report.md');
  });

  it('parses --verbose flag', () => {
    const result = parseArgs(['openai', 'query', '--verbose']);
    expect(result.verbose).toBe(true);
  });

  it('parses -v shorthand', () => {
    const result = parseArgs(['openai', 'query', '-v']);
    expect(result.verbose).toBe(true);
  });

  it('parses --background flag', () => {
    const result = parseArgs(['openai', 'query', '--background']);
    expect(result.background).toBe(true);
  });

  it('parses -b shorthand', () => {
    const result = parseArgs(['openai', 'query', '-b']);
    expect(result.background).toBe(true);
  });

  it('parses multiple flags together', () => {
    const result = parseArgs([
      'perplexity',
      'my research query',
      '-v',
      '-o',
      'out.md',
      '-b'
    ]);
    expect(result.provider).toBe('perplexity');
    expect(result.query).toBe('my research query');
    expect(result.verbose).toBe(true);
    expect(result.output).toBe('out.md');
    expect(result.background).toBe(true);
  });

  it('handles empty args', () => {
    const result = parseArgs([]);
    expect(result.provider).toBe('openai');
    expect(result.query).toBe('');
  });
});

describe('formatOutput', () => {
  const baseResult: ResearchResult = {
    provider: 'openai',
    query: 'Test research query',
    report: 'This is the research report content.',
    sources: [],
    duration_ms: 60000,
    timestamp: '2024-01-15T10:30:00.000Z'
  };

  it('includes header with provider name', () => {
    const output = formatOutput(baseResult);
    expect(output).toContain('# Deep Research Report');
    expect(output).toContain('**Provider:** OpenAI Deep Research');
  });

  it('formats perplexity provider correctly', () => {
    const result = { ...baseResult, provider: 'perplexity' as const };
    const output = formatOutput(result);
    expect(output).toContain('**Provider:** Perplexity Sonar');
  });

  it('includes timestamp', () => {
    const output = formatOutput(baseResult);
    expect(output).toContain('**Generated:** 2024-01-15T10:30:00.000Z');
  });

  it('formats duration in seconds', () => {
    const output = formatOutput(baseResult);
    expect(output).toContain('**Duration:** 60 seconds');
  });

  it('includes query section', () => {
    const output = formatOutput(baseResult);
    expect(output).toContain('## Research Query');
    expect(output).toContain('Test research query');
  });

  it('includes report section', () => {
    const output = formatOutput(baseResult);
    expect(output).toContain('## Report');
    expect(output).toContain('This is the research report content.');
  });

  it('includes reasoning summary when present', () => {
    const result = { ...baseResult, reasoning_summary: 'Summary of reasoning' };
    const output = formatOutput(result);
    expect(output).toContain('## Reasoning Summary');
    expect(output).toContain('Summary of reasoning');
  });

  it('excludes reasoning summary section when not present', () => {
    const output = formatOutput(baseResult);
    expect(output).not.toContain('## Reasoning Summary');
  });

  it('formats sources as markdown links', () => {
    const result: ResearchResult = {
      ...baseResult,
      sources: [
        { title: 'Source 1', url: 'https://example.com/1' },
        { title: 'Source 2', url: 'https://example.com/2' }
      ]
    };
    const output = formatOutput(result);
    expect(output).toContain('## Sources');
    expect(output).toContain('- [Source 1](https://example.com/1)');
    expect(output).toContain('- [Source 2](https://example.com/2)');
  });

  it('excludes sources section when no sources', () => {
    const output = formatOutput(baseResult);
    expect(output).not.toContain('## Sources');
  });
});
