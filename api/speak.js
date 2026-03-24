export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { text, speaker } = req.body;

  // Your two voice IDs — find these on elevenlabs.io/voice-library
  const VOICES = {
    v: 'cgSgspJ2msm6clMCkdW9',  // Charlotte — warm, expressive (Visionary)
    o: 'NFG5qt843uXKj4pFvR7C',  // Daniel — measured, clear (Operator)
  };

  const voiceId = VOICES[speaker] || VOICES.v;

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2',
        voice_settings: {
          stability: 0.4,          // lower = more expressive, more human
          similarity_boost: 0.75,
          style: 0.35,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    return res.status(500).json({ error: 'TTS failed' });
  }

  const audio = await response.arrayBuffer();
  res.setHeader('Content-Type', 'audio/mpeg');
  res.send(Buffer.from(audio));
}
