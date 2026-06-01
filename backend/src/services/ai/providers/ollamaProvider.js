import { env } from '../../../config/env.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseOllamaResponse = (payload) => {
  const text = String(payload?.response || '').trim();
  if (!text) {
    const error = new Error('Ollama returned an empty response.');
    error.statusCode = 502;
    throw error;
  }
  return text;
};

export const ollamaProvider = {
  name: 'ollama',
  model: env.ollamaModel,

  async generate({ prompt, options = {} }) {
    const url = `${env.ollamaBaseUrl.replace(/\/$/, '')}/api/generate`;
    let lastError;

    for (let attempt = 0; attempt <= env.ollamaRetries; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), env.ollamaTimeoutMs);

      try {
        const response = await fetch(url, {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: env.ollamaModel,
            prompt,
            stream: false,
            options: {
              temperature: options.temperature ?? 0.25,
              top_p: options.topP ?? 0.9,
              num_predict: options.maxTokens ?? 700
            }
          })
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          const error = new Error(payload?.error || 'Local Ollama AI failed to respond.');
          error.statusCode = response.status >= 500 ? 503 : response.status;
          throw error;
        }

        return parseOllamaResponse(payload);
      } catch (error) {
        lastError = error;
        if (attempt < env.ollamaRetries) await sleep(350 * (attempt + 1));
      } finally {
        clearTimeout(timeout);
      }
    }

    const message =
      lastError?.name === 'AbortError'
        ? 'Local AI timed out. Please try again in a moment.'
        : 'Local Ollama AI is unavailable. Make sure Ollama is running on port 11434.';
    const error = new Error(message);
    error.statusCode = 503;
    error.cause = lastError;
    throw error;
  }
};
