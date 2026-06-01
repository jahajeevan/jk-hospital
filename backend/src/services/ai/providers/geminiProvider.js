import { env } from '../../../config/env.js';

export const geminiProvider = {
  name: 'gemini',
  model: env.geminiModel,

  async generate({ prompt }) {
    if (!env.geminiApiKey) {
      const error = new Error('Gemini provider is selected but GEMINI_API_KEY is not configured.');
      error.statusCode = 503;
      throw error;
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': env.geminiApiKey
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.25 }
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload?.error?.message || 'Gemini AI failed to respond.');
      error.statusCode = response.status >= 500 ? 503 : response.status;
      throw error;
    }

    const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n').trim();
    if (!text) {
      const error = new Error('Gemini returned an empty response.');
      error.statusCode = 502;
      throw error;
    }
    return text;
  }
};
