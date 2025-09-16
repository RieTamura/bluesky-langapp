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

  // Normalize various Claude/Anthropic-like response shapes into a single string.
  const normalizeResponse = (d: any): string => {
    try {
      if (typeof d === 'string') return d;

      // Common: choices[].message with content string or array
      if (Array.isArray(d?.choices) && d.choices[0]) {
        const choice = d.choices[0];
        if (choice.message) {
          const c = choice.message.content;
          if (typeof c === 'string') return c;
          if (Array.isArray(c) && c[0]) {
            const first = c[0];
            if (typeof first === 'string') return first;
            if (typeof first.text === 'string') return first.text;
            if (typeof first.content === 'string') return first.content;
          }
        }
        if (typeof choice.text === 'string') return choice.text;
      }

      // Some responses place messages at top-level `messages` array
      if (Array.isArray(d?.messages) && d.messages[0]) {
        const first = d.messages[0];
        const c = first.content;
        if (typeof c === 'string') return c;
        if (Array.isArray(c) && c[0]) {
          const f = c[0];
          if (typeof f === 'string') return f;
          if (typeof f.text === 'string') return f.text;
          if (typeof f.content === 'string') return f.content;
        }
      }

      if (typeof d.output === 'string') return d.output;
      if (typeof d.completion === 'string') return d.completion;
      if (typeof d.text === 'string') return d.text;

      if (Array.isArray(d?.output) && d.output[0]) {
        const o = d.output[0];
        if (typeof o === 'string') return o;
        if (typeof o.text === 'string') return o.text;
      }
    } catch (e) {
      // fallthrough to stringify below
    }

    return JSON.stringify(d);
  };

  return normalizeResponse(data);
}
