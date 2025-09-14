import { getApiKey } from '../stores/apiKeys';

export async function generateExampleSentence(word: string, level: number): Promise<string> {
  const key = await getApiKey('anthropic');
  if (!key) throw new Error('No Anthropic API key configured');

  // Placeholder endpoint - update if Anthropic provides a specific Sonnet 4 URL
  const endpoint = 'https://api.anthropic.com/v1/complete';
  const prompt = `Create one short example sentence using the word \"${word}\" for learner level ${level}.`;

  const body = {
    model: 'claude-sonnet-4',
    prompt,
    max_tokens: 60,
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API error: ${res.status} ${text}`);
  }

  const data = await res.json();
  // Handle possible response shapes
  if (typeof data === 'string') return data;
  if (data.completion) return data.completion;
  if (data.output && typeof data.output === 'string') return data.output;
  if (Array.isArray(data.choices) && data.choices[0]) return data.choices[0].text || JSON.stringify(data.choices[0]);

  return JSON.stringify(data);
}
