// ═══════════════════════════════════════════════════════
//  services/ttsService.ts
//  Text-to-speech abstraction layer
//
//  SETUP:
//    1. Set ELEVENLABS_API_KEY in .env.local
//    2. Set voice IDs for each host below
//    3. Switch TTS_PROVIDER to 'elevenlabs'
//
//  PROVIDERS:
//    'browser'     — Web Speech API (free, low quality, works now)
//    'elevenlabs'  — ElevenLabs (high quality, requires API key)
//    'mock'        — Silent, for testing
// ═══════════════════════════════════════════════════════

import { Speaker } from '../types';

// ── CONFIG ─────────────────────────────────────────────

type TtsProvider = 'browser' | 'elevenlabs' | 'mock';

const TTS_PROVIDER: TtsProvider = 'browser'; // ← change to 'elevenlabs' in production

// ElevenLabs voice IDs for each host
// Find voice IDs at: https://elevenlabs.io/voice-library
const ELEVENLABS_VOICE_IDS: Record<Speaker, string> = {
  visionary: 'your-visionary-voice-id', // e.g. 'EXAVITQu4vr4xnSDxMaL' (Sarah)
  operator:  'your-operator-voice-id',  // e.g. 'pNInz6obpgDQGcFmaJgB' (Adam)
};

const ELEVENLABS_MODEL = 'eleven_turbo_v2'; // low-latency model
const ELEVENLABS_ENDPOINT = '/api/tts';     // proxy route

// ── SPEAK INTERFACE ────────────────────────────────────

export interface SpeakOptions {
  speaker: Speaker;
  text: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: Error) => void;
}

export async function speak(options: SpeakOptions): Promise<void> {
  const { speaker, text, onStart, onEnd, onError } = options;

  onStart?.();

  try {
    switch (TTS_PROVIDER) {
      case 'elevenlabs':
        await speakElevenLabs(speaker, text);
        break;
      case 'browser':
        await speakBrowser(speaker, text);
        break;
      case 'mock':
        await mockSpeak(text);
        break;
    }
    onEnd?.();
  } catch (err) {
    console.error('TTS error:', err);
    onError?.(err instanceof Error ? err : new Error(String(err)));
    onEnd?.(); // always resolve
  }
}

export function stopSpeaking(): void {
  if (TTS_PROVIDER === 'browser' && typeof window !== 'undefined') {
    window.speechSynthesis?.cancel();
  }
  // ElevenLabs: stop the currently playing audio element
  if (currentAudioElement) {
    currentAudioElement.pause();
    currentAudioElement.currentTime = 0;
  }
}

export function pauseSpeaking(): void {
  if (TTS_PROVIDER === 'browser' && typeof window !== 'undefined') {
    window.speechSynthesis?.pause();
  }
  currentAudioElement?.pause();
}

export function resumeSpeaking(): void {
  if (TTS_PROVIDER === 'browser' && typeof window !== 'undefined') {
    window.speechSynthesis?.resume();
  }
  currentAudioElement?.play();
}

// ── BROWSER TTS ────────────────────────────────────────

function getBrowserVoice(speaker: Speaker): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined') return null;
  const voices = window.speechSynthesis.getVoices();

  if (speaker === 'visionary') {
    return (
      voices.find(v => v.name.includes('Samantha')) ??
      voices.find(v => v.name.includes('Karen')) ??
      voices.find(v => v.name.includes('Victoria')) ??
      voices.find(v => v.lang === 'en-GB' && v.name.toLowerCase().includes('female')) ??
      voices.find(v => v.lang.startsWith('en')) ??
      voices[0] ??
      null
    );
  } else {
    return (
      voices.find(v => v.name.includes('Daniel')) ??
      voices.find(v => v.name.includes('Alex')) ??
      voices.find(v => v.name.includes('Oliver')) ??
      voices.find(v => v.lang === 'en-GB') ??
      voices.find(v => v.lang.startsWith('en')) ??
      voices[0] ??
      null
    );
  }
}

function speakBrowser(speaker: Speaker, text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve();
      return;
    }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    const voice = getBrowserVoice(speaker);
    if (voice) utt.voice = voice;
    utt.rate   = speaker === 'visionary' ? 1.0 : 0.95;
    utt.pitch  = speaker === 'visionary' ? 1.05 : 0.9;
    utt.volume = 1.0;
    utt.onend  = () => resolve();
    utt.onerror = () => resolve();
    window.speechSynthesis.speak(utt);
  });
}

// ── ELEVENLABS TTS ─────────────────────────────────────

let currentAudioElement: HTMLAudioElement | null = null;

async function speakElevenLabs(speaker: Speaker, text: string): Promise<void> {
  const voiceId = ELEVENLABS_VOICE_IDS[speaker];

  // Call via Next.js API proxy to keep API key server-side
  const res = await fetch(ELEVENLABS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voiceId, text, model: ELEVENLABS_MODEL }),
  });

  if (!res.ok) {
    throw new Error(`ElevenLabs error: ${res.status}`);
  }

  const audioBlob = await res.blob();
  const audioUrl  = URL.createObjectURL(audioBlob);

  return new Promise((resolve) => {
    currentAudioElement = new Audio(audioUrl);
    currentAudioElement.onended = () => {
      URL.revokeObjectURL(audioUrl);
      resolve();
    };
    currentAudioElement.onerror = () => resolve();
    currentAudioElement.play();
  });
}

/*
  NEXT.JS API ROUTE — /app/api/tts/route.ts
  Copy this into your project.

  import { NextRequest, NextResponse } from 'next/server';

  export async function POST(req: NextRequest) {
    const { voiceId, text, model } = await req.json();

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        },
        body: JSON.stringify({
          text,
          model_id: model ?? 'eleven_turbo_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: 'TTS failed' }, { status: res.status });
    }

    const audio = await res.arrayBuffer();
    return new NextResponse(audio, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audio.byteLength),
      },
    });
  }
*/

// ── MOCK TTS ───────────────────────────────────────────

function mockSpeak(text: string): Promise<void> {
  // Simulate speaking duration (roughly 150 words/min)
  const words = text.split(' ').length;
  const ms = (words / 150) * 60_000;
  return new Promise(resolve => setTimeout(resolve, Math.max(ms, 800)));
}
