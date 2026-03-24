export default async function handler(req, res) {
  const { voiceId, text } = req.body;

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
        model_id: 'eleven_turbo_v2',        // fastest, lowest latency
        voice_settings: {
          stability: 0.45,                  // lower = more expressive
          similarity_boost: 0.75,
          style: 0.3,                       // adds character variation
          use_speaker_boost: true
        },
      }),
    }
  );

  const audio = await response.arrayBuffer();
  res.setHeader('Content-Type', 'audio/mpeg');
  res.send(Buffer.from(audio));
}
