/*
 * Research engine for Quillosofi.
 *
 * Wraps base44.integrations.Core.InvokeLLM with a strict JSON response
 * schema so we get structured citations back instead of hoping the model
 * remembered to format them. The web tool is invoked via
 * `add_context_from_internet: true`.
 *
 * Returns: {
 *   answer: string,                 // markdown w/ inline [n] citations
 *   sources: Array<{
 *     n: number,                    // citation number
 *     title: string,
 *     url: string,
 *     snippet: string,              // brief excerpt (1-2 sentences)
 *     publisher?: string,           // optional site / domain
 *     published_at?: string,        // optional ISO date
 *   }>,
 *   followups: string[],            // suggested next questions
 * }
 */

import { base44 } from '@/api/base44Client';
import { smartInvoke } from '@/lib/llm';

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    answer: {
      type: 'string',
      description:
        'A thorough markdown answer to the question. Use inline numeric citations like [1] [2] for every factual claim. Do not put the citation number inside parentheses with anything else \u2014 it must appear as a standalone bracketed integer that maps 1:1 to entries in the sources array.',
    },
    sources: {
      type: 'array',
      description:
        'Every web source you used. The number in `n` must match the inline citation numbers in the answer. List sources in the order they are first cited.',
      items: {
        type: 'object',
        properties: {
          n: { type: 'integer' },
          title: { type: 'string' },
          url: { type: 'string' },
          snippet: { type: 'string', description: 'A 1-2 sentence excerpt that supports the cited claim.' },
          publisher: { type: 'string', description: 'The publication or site name (e.g. "The New York Times").' },
          published_at: { type: 'string', description: 'ISO 8601 date if known, e.g. "2025-04-01". Empty string if unknown.' },
        },
        required: ['n', 'title', 'url', 'snippet'],
      },
    },
    followups: {
      type: 'array',
      description: '2-4 short suggested follow-up questions the user might want to ask next.',
      items: { type: 'string' },
    },
  },
  required: ['answer', 'sources'],
};

const QUICK_PROMPT = (query) => `You are Quillosofi's Research mode \u2014 a careful, citation-first research assistant.

The user has asked the following question. Use the web context provided to you to write a focused answer (around 200-400 words) that cites every factual claim with inline [n] markers. Aim for ~5 high-quality sources. Prefer primary sources, recent reporting, and authoritative outlets.

User question: """${query}"""

Rules:
- Every factual claim MUST have an inline citation like [1] or [2].
- Citation numbers must map 1:1 to the sources array.
- Do not invent URLs. If you didn't actually use a source, don't cite it.
- If the question can't be answered well from web context, say so honestly in the answer.
- Suggest 2-4 followup questions the user might want next.`;

const DEEP_PROMPT = (query) => `You are Quillosofi's Research mode \u2014 a careful, citation-first research assistant operating in DEEP mode.

The user has asked a question that warrants a thorough, multi-angle synthesis. Use the web context provided to you to write a comprehensive answer (around 500-900 words) covering:
- The core answer with key facts and context
- Multiple perspectives or interpretations where relevant
- Important caveats, counterpoints, or open questions
- Historical or background context if it sharpens understanding

Aim for 8-15 high-quality sources spanning different publishers, viewpoints, and recency. Cite every factual claim with inline [n] markers.

User question: """${query}"""

Rules:
- Every factual claim MUST have an inline citation like [1] or [2].
- Citation numbers must map 1:1 to the sources array, listed in order of first citation.
- Do not invent URLs. If you didn't actually use a source, don't cite it.
- Use markdown headings (##) to break up long answers into 2-4 sections.
- Suggest 3-4 followup questions at the end.`;

export async function runResearch({ query, depth = 'quick' }) {
  if (!query || !query.trim()) throw new Error('Empty query');

  const prompt = depth === 'deep' ? DEEP_PROMPT(query) : QUICK_PROMPT(query);
  // Gemini Flash gives the snappiest research; for deep we let it churn
  // on a stronger model since the user is opting into extra wait time.
  const model = depth === 'deep' ? 'gpt_5_4' : 'gemini_3_flash';

  let res;
  try {
    res = await smartInvoke({
      prompt,
      model,
      add_context_from_internet: true,
      response_json_schema: RESPONSE_SCHEMA,
    });
  } catch (e) {
    throw new Error(`Research request failed: ${e?.message || e}`);
  }

  // Base44 returns the structured output in `data` when a schema is present,
  // but older builds put it under `output` or just stringify it. Cover all
  // the shapes defensively.
  let payload = res?.data ?? res?.output ?? res;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch { /* keep as string */ }
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('Research returned an unexpected response shape.');
  }

  const answer = String(payload.answer || '').trim();
  const sources = Array.isArray(payload.sources) ? payload.sources : [];
  const followups = Array.isArray(payload.followups) ? payload.followups : [];

  // Clean up sources: dedupe by URL, drop entries without one, ensure n is a
  // 1-based integer, sort by n.
  const seen = new Set();
  const cleanSources = [];
  for (const s of sources) {
    if (!s || !s.url || seen.has(s.url)) continue;
    seen.add(s.url);
    cleanSources.push({
      n: Number(s.n) || cleanSources.length + 1,
      title: String(s.title || s.url).trim(),
      url: String(s.url).trim(),
      snippet: String(s.snippet || '').trim(),
      publisher: s.publisher ? String(s.publisher).trim() : domainFromUrl(s.url),
      published_at: s.published_at ? String(s.published_at).trim() : '',
    });
  }
  cleanSources.sort((a, b) => a.n - b.n);

  return { answer, sources: cleanSources, followups };
}

export function domainFromUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
