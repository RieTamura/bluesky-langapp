import { getApiKey } from '../stores/apiKeys';
import { ANTHROPIC_VERSION } from '../config/apiVersions';

export async function generateExampleSentence(word: string, level: number): Promise<string> {
  const key = await getApiKey('anthropic');
  if (!key) throw new Error('No Anthropic API key configured');

  // Use Anthropic messages endpoint. The header expected is x-api-key and an anthropic-version header.
  // NOTE: The exact anthropic-version value may be adjusted to match the account/API version in use.
  const endpoint = 'https://api.anthropic.com/v1/messages';
  const prompt = `Create one short example sentence using the word \"${word}\" for learner level ${level}.`;

  const body = {
    model: 'claude-sonnet-4',
    // messages array: using a user-role message containing the prompt
    messages: [
      {
        role: 'user',
        // Some Anthropic clients expect content as an array of content objects; include a simple text object
        content: [
          {
            type: 'output_text',
            text: prompt,
          },
        ],
      },
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

  // Preferred: extract data.messages[0].content[0].text
  try {
    if (Array.isArray(data?.messages) && data.messages[0]) {
      const first = data.messages[0];
      if (Array.isArray(first.content) && first.content[0] && (first.content[0].text || first.content[0].text === '')) {
        return first.content[0].text;
      }
      // sometimes content may be a string
      if (typeof first.content === 'string') return first.content;
    }
  } catch (e) {
    // fall through to other shapes
  }

  // Fallbacks for older response shapes
  if (typeof data === 'string') return data;
  if (data.completion) return data.completion;
  if (data.output && typeof data.output === 'string') return data.output;
  if (Array.isArray(data.choices) && data.choices[0]) return data.choices[0].text || JSON.stringify(data.choices[0]);

  return JSON.stringify(data);
}
