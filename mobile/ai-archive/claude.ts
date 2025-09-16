// @ts-nocheck
/* eslint-disable */
// Archived original: src/services/claude.ts
// This file was archived because AI features are temporarily disabled.

import { getApiKey } from '../stores/apiKeys';
import { ANTHROPIC_VERSION } from '../config/apiVersions';

export async function generateExampleSentence(word: string, level: number): Promise<string> {
  const key = await getApiKey('anthropic');
  if (!key) throw new Error('No Anthropic API key configured');

  const endpoint = 'https://api.anthropic.com/v1/messages';
  const prompt = `Create one short example sentence using the word "${word}" for learner level ${level}.`;

  const body = {
    model: 'claude-3-5-sonnet-latest',
    messages: [
      { role: 'system', content: 'You are a concise and helpful language tutor. Provide a single short example sentence.' },
      { role: 'user', content: prompt },
    ],
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API error: ${res.status} ${text}`);
  }

  const data = await res.json();
  try {
    if (Array.isArray(data?.choices) && data.choices[0]?.message) {
      const msg = data.choices[0].message;
      const content = msg.content;
      if (typeof content === 'string') return content;
      if (Array.isArray(content) && content[0]) {
        if (typeof content[0].text === 'string') return content[0].text;
        if (typeof content[0].content === 'string') return content[0].content;
      }
    }

    if (Array.isArray(data?.messages) && data.messages[0]) {
      const first = data.messages[0];
      if (typeof first.content === 'string') return first.content;
      if (Array.isArray(first.content) && first.content[0]) {
        if (typeof first.content[0].text === 'string') return first.content[0].text;
        if (typeof first.content[0].content === 'string') return first.content[0].content;
      }
    }

    if (typeof data === 'string') return data;
    if (data.completion) return data.completion;
    if (data.output && typeof data.output === 'string') return data.output;
    if (Array.isArray(data.choices) && data.choices[0]) return data.choices[0].text || JSON.stringify(data.choices[0]);
  } catch (e) {}

  return JSON.stringify(data);
}
