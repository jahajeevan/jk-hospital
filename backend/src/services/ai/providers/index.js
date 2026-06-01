import { env } from '../../../config/env.js';
import { geminiProvider } from './geminiProvider.js';
import { ollamaProvider } from './ollamaProvider.js';

const providers = {
  ollama: ollamaProvider,
  gemini: geminiProvider
};

export const getAiProvider = () => providers[env.aiProvider] || ollamaProvider;

export const listAiProviders = () =>
  Object.values(providers).map((provider) => ({
    name: provider.name,
    model: provider.model,
    active: provider.name === getAiProvider().name
  }));
