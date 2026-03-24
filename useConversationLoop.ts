// ═══════════════════════════════════════════════════════
//  hooks/useConversationLoop.ts
//  The core React hook driving the entire conversation engine
// ═══════════════════════════════════════════════════════

import { useState, useRef, useCallback } from 'react';
import {
  ConversationState,
  Speaker,
  SteeringCommand,
  PHASES,
} from '../types';
import {
  createInitialState,
  appendTurn,
  shouldAdvancePhase,
  advancePhase,
  isEpisodeComplete,
  mergeExtractedState,
  applySteeringCommand,
  setFinalConcept,
} from '../engine/stateModel';

// ── PLUGGABLE SERVICE LAYER ────────────────────────────
// In development: import from mockService
// In production:  import from claudeService
//
// import { generateTurn, extractState, generateFinalSummary } from '../services/claudeService';
import { generateTurn, extractState, generateFinalSummary } from '../services/mockService';

import { speak, stopSpeaking, pauseSpeaking, resumeSpeaking } from '../services/ttsService';

// ═══════════════════════════════════════════════════════

const MAX_TURNS = 18;
const STATE_EXTRACTION_EVERY = 3; // extract every N turns

type LoopStatus = 'idle' | 'playing' | 'paused' | 'generating' | 'complete';

export interface ConversationLoopAPI {
  state: ConversationState | null;
  status: LoopStatus;
  currentSpeaker: Speaker | null;
  start: (topic: string, mode?: string) => void;
  play: () => void;
  pause: () => void;
  restart: () => void;
  steer: (cmd: SteeringCommand) => void;
  progressPct: number;
}

function speakerForTurn(turnIndex: number): Speaker {
  return turnIndex % 2 === 0 ? 'visionary' : 'operator';
}

function delay(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════

export function useConversationLoop(): ConversationLoopAPI {
  const [state, setState] = useState<ConversationState | null>(null);
  const [status, setStatus] = useState<LoopStatus>('idle');
  const [currentSpeaker, setCurrentSpeaker] = useState<Speaker | null>(null);

  // Refs so the async loop can always read current values
  const stateRef   = useRef<ConversationState | null>(null);
  const statusRef  = useRef<LoopStatus>('idle');
  const loopActive = useRef(false);

  const syncState = (s: ConversationState) => {
    stateRef.current = s;
    setState(s);
  };

  const syncStatus = (st: LoopStatus) => {
    statusRef.current = st;
    setStatus(st);
  };

  // ── CORE LOOP ──────────────────────────────────────

  const runLoop = useCallback(async () => {
    loopActive.current = true;

    while (loopActive.current) {
      // ── Wait while paused ──
      while (statusRef.current === 'paused' && loopActive.current) {
        await delay(200);
      }
      if (!loopActive.current) break;

      const s = stateRef.current!;
      if (isEpisodeComplete(s, MAX_TURNS)) break;

      const speaker = speakerForTurn(s.turnCount);
      setCurrentSpeaker(speaker);
      syncStatus('generating');

      // ── Generate turn text ──
      let text: string;
      try {
        text = await generateTurn(s, speaker);
      } catch (err) {
        console.error('Generation error:', err);
        await delay(1000);
        continue;
      }

      if (!loopActive.current) break;

      // ── Commit to state ──
      let updated = appendTurn(s, { speaker, text });

      // ── Advance phase if thresholds met ──
      if (shouldAdvancePhase(updated)) {
        updated = advancePhase(updated);
      }

      syncState(updated);
      syncStatus('playing');

      // ── Speak the turn ──
      await speak({
        speaker,
        text,
        onStart: () => setCurrentSpeaker(speaker),
        onEnd:   () => setCurrentSpeaker(null),
      });

      if (!loopActive.current) break;

      // ── Extract state every N turns ──
      if (updated.turnCount % STATE_EXTRACTION_EVERY === 0) {
        try {
          const extracted = await extractState(updated);
          const withExtracted = mergeExtractedState(updated, extracted);
          syncState(withExtracted);
          updated = withExtracted;
        } catch (err) {
          console.warn('State extraction failed:', err);
        }
      }

      // ── Brief pause between turns ──
      await delay(350);
    }

    // ── Episode complete ──
    const final = stateRef.current!;
    if (isEpisodeComplete(final, MAX_TURNS) || !loopActive.current) {
      try {
        const concept = await generateFinalSummary(final);
        const withConcept = setFinalConcept(final, concept);
        syncState(withConcept);
      } catch (err) {
        console.warn('Final summary failed:', err);
      }
    }

    loopActive.current = false;
    setCurrentSpeaker(null);
    syncStatus('complete');
  }, []);

  // ── PUBLIC API ────────────────────────────────────

  const start = useCallback((topic: string, mode = 'business') => {
    loopActive.current = false;
    stopSpeaking();
    const initial = createInitialState(topic, mode);
    syncState(initial);
    syncStatus('playing');
    setCurrentSpeaker(null);
    // Small delay to let React settle before starting loop
    setTimeout(() => runLoop(), 100);
  }, [runLoop]);

  const play = useCallback(() => {
    if (statusRef.current === 'paused') {
      syncStatus('playing');
      resumeSpeaking();
    }
  }, []);

  const pause = useCallback(() => {
    if (statusRef.current === 'playing' || statusRef.current === 'generating') {
      syncStatus('paused');
      pauseSpeaking();
    }
  }, []);

  const restart = useCallback(() => {
    loopActive.current = false;
    stopSpeaking();
    const topic = stateRef.current?.topic ?? '';
    const mode  = stateRef.current?.mode ?? 'business';
    setTimeout(() => start(topic, mode), 200);
  }, [start]);

  const steer = useCallback((cmd: SteeringCommand) => {
    if (!stateRef.current || statusRef.current === 'complete') return;
    const updated = applySteeringCommand(stateRef.current, cmd);
    syncState(updated);
  }, []);

  const progressPct = state
    ? Math.min(100, (state.turnCount / MAX_TURNS) * 100)
    : 0;

  return { state, status, currentSpeaker, start, play, pause, restart, steer, progressPct };
}
