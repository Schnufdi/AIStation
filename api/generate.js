export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const { system, messages, maxTokens } = req.body || {};
  if (!messages?.length) return res.status(400).json({ error: 'messages required' });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens || 300,
      system,
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return res.status(response.status).json({ error: err });
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';
  return res.status(200).json({ text });
}
