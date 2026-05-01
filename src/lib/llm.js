/*
 * Direct LLM client for Quillosofi.
 *
 * Hits OpenRouter (https://openrouter.ai) directly from the renderer with
 * streaming. OpenRouter is the only LLM path.
 * Two surface APIs:
 *
 *   invokeLLM({ prompt, model, response_json_schema?, add_context_from_internet?, file_urls?, signal? })
 *     -> Promise<string | object>          // returns text, or parsed JSON if schema given
 *
 *   streamLLM({ prompt, model, ..., onDelta, signal })
 *     -> Promise<string>                   // resolves with full text after stream completes
 *
 * Both functions throw OPENROUTER_KEY_MISSING_ERROR if the user hasn't set
 * an API key yet. Callers should catch this and prompt them to add one in
 * Settings.
 *
 * Web grounding: when `add_context_from_internet` is true we append the
 * `:online` plugin suffix to the model slug, which OpenRouter routes
 * through its built-in web search.
 */

// =============================================================
// Key storage
// =============================================================
const KEY_STORAGE = 'quillosofi:openrouterKey';

export function getOpenRouterKey() {
  try {
    return localStorage.getItem(KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function setOpenRouterKey(key) {
  try {
    if (key && key.trim()) {
      localStorage.setItem(KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(KEY_STORAGE);
    }
  } catch (e) {
    console.warn('Could not save OpenRouter key:', e);
  }
}

export function hasOpenRouterKey() {
  return !!getOpenRouterKey();
}

export const OPENROUTER_KEY_MISSING_ERROR = 'OPENROUTER_KEY_MISSING';

// =============================================================
// Model translation
// =============================================================
// Map Quillosofi's internal model IDs to OpenRouter slugs.
// OpenRouter slugs: https://openrouter.ai/models
// Defaults are picked for a good speed/quality/cost balance.
const MODEL_MAP = {
  // Fast / cheap
  gemini_3_flash: 'google/gemini-2.5-flash',
  gpt_5_mini:     'openai/gpt-4o-mini',

  // Balanced
  gpt_5:          'openai/gpt-4o',
  gpt_5_4:        'openai/gpt-4.1',

  // Premium
  claude_sonnet_4_6: 'anthropic/claude-sonnet-4',
  claude_opus_4_7:   'anthropic/claude-opus-4',
};

const DEFAULT_MODEL = 'google/gemini-2.5-flash';

export function resolveModel(quillosofiId) {
  if (!quillosofiId) return DEFAULT_MODEL;
  return MODEL_MAP[quillosofiId] || quillosofiId; // allow raw OpenRouter slugs too
}

// =============================================================
// Message construction
// =============================================================
/**
 * Build the OpenAI-style messages payload from a Quillosofi prompt.
 * Quillosofi historically passes a single huge `prompt` string that bakes
 * in system instructions + history + the new user message. OpenRouter
 * accepts that as a single user message; the model still does the right
 * thing because the prompt is structured.
 *
 * If `file_urls` are provided we attach them as image_url parts (the most
 * widely supported multimodal shape).
 */
function buildMessages({ prompt, file_urls = [] }) {
  const text = String(prompt || '');
  if (!file_urls || !file_urls.length) {
    return [{ role: 'user', content: text }];
  }
  const parts = [{ type: 'text', text }];
  for (const url of file_urls) {
    if (typeof url === 'string' && url.trim()) {
      parts.push({ type: 'image_url', image_url: { url } });
    }
  }
  return [{ role: 'user', content: parts }];
}

// =============================================================
// Request builder
// =============================================================
function buildRequest({ prompt, model, response_json_schema, add_context_from_internet, file_urls, stream }) {
  const slug = resolveModel(model);
  // OpenRouter's `:online` plugin variant adds web grounding.
  const finalModel = add_context_from_internet ? `${slug}:online` : slug;

  const body = {
    model: finalModel,
    messages: buildMessages({ prompt, file_urls }),
    stream: !!stream,
  };

  if (response_json_schema) {
    body.response_format = {
      type: 'json_schema',
      json_schema: {
        name: 'quillosofi_response',
        strict: true,
        schema: response_json_schema,
      },
    };
  }

  return body;
}

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

// =============================================================
// smartInvoke: streaming when onDelta is given, single-shot otherwise.
// Throws OPENROUTER_KEY_MISSING_ERROR if no key is set — callers should
// catch this and prompt the user to add one in Settings.
// =============================================================
export async function smartInvoke({
  prompt, model, response_json_schema, add_context_from_internet,
  file_urls, signal, onDelta,
}) {
  if (onDelta) {
    return streamLLM({
      prompt, model, response_json_schema, add_context_from_internet,
      file_urls, signal, onDelta,
    });
  }
  return invokeLLM({
    prompt, model, response_json_schema, add_context_from_internet,
    file_urls, signal,
  });
}

function authHeaders() {
  const key = getOpenRouterKey();
  if (!key) {
    const err = new Error(OPENROUTER_KEY_MISSING_ERROR);
    err.code = OPENROUTER_KEY_MISSING_ERROR;
    throw err;
  }
  return {
    'Authorization': `Bearer ${key}`,
    // OpenRouter recommends these for analytics; safe to include.
    'HTTP-Referer': 'https://github.com/AlarkiusJay/Quillosofi',
    'X-Title': 'Quillosofi',
    'Content-Type': 'application/json',
  };
}

// =============================================================
// Non-streaming invoke
// =============================================================
/**
 * Single-shot LLM call. Resolves to a string (the model's reply text), or
 * to a parsed JSON object if response_json_schema was provided.
 */
export async function invokeLLM(opts) {
  const body = buildRequest({ ...opts, stream: false });
  const headers = authHeaders();

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: opts?.signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`OpenRouter ${res.status}: ${errText.slice(0, 400)}`);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content || '';

  if (opts?.response_json_schema) {
    try {
      return JSON.parse(content);
    } catch {
      return content; // fall back to raw text if parse fails
    }
  }
  return content;
}

// =============================================================
// Streaming invoke
// =============================================================
/**
 * Streaming LLM call. Calls onDelta(chunk, fullSoFar) for each token batch.
 * Resolves with the full concatenated text once the stream ends.
 *
 * Streams use OpenAI's SSE format:
 *   data: {"choices":[{"delta":{"content":"hello"}}]}
 *   data: [DONE]
 */
export async function streamLLM({ onDelta, ...opts }) {
  const body = buildRequest({ ...opts, stream: true });
  const headers = authHeaders();

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: opts?.signal,
  });

  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => '');
    throw new Error(`OpenRouter ${res.status}: ${errText.slice(0, 400)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Process complete SSE events. Each event ends with \n\n; we accumulate
    // until we see one and then drain.
    let sep;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const chunk = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);

      // Each chunk may contain multiple `data: ...` lines.
      for (const line of chunk.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const event = JSON.parse(payload);
          const delta = event?.choices?.[0]?.delta?.content || '';
          if (delta) {
            full += delta;
            try { onDelta?.(delta, full); } catch (_) {}
          }
        } catch {
          // Skip malformed chunks; OpenRouter sometimes sends keep-alive
          // comments which are not JSON.
        }
      }
    }
  }

  return full;
}
