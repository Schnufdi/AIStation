// ═══════════════════════════════════════════════════════
//  engine/stateModel.ts
//  ConversationState factory, updaters, and phase logic
// ═══════════════════════════════════════════════════════

import {
  ConversationState,
  ExtractedState,
  FinalConcept,
  Phase,
  PHASES,
  SteeringCommand,
  TranscriptEntry,
} from '../types';

// ── FACTORY ────────────────────────────────────────────

export function createInitialState(topic: string, mode: string): ConversationState {
  return {
    topic,
    mode,
    phaseIndex: 0,
    turnCount: 0,
    transcript: [],
    candidateIdeas: [],
    frontRunners: [],
    rejectedIdeas: [],
    lockedPrinciples: [],
    openQuestions: [],
    customerHypothesis: '',
    businessModelHypothesis: '',
    keyRisks: [],
    pendingSteering: null,
    isComplete: false,
    finalConcept: null,
  };
}

// ── TRANSCRIPT ─────────────────────────────────────────

let _idCounter = 0;
export function appendTurn(
  state: ConversationState,
  entry: Omit<TranscriptEntry, 'id' | 'timestamp'>
): ConversationState {
  const newEntry: TranscriptEntry = {
    ...entry,
    id: `turn-${++_idCounter}`,
    timestamp: Date.now(),
  };
  return {
    ...state,
    transcript: [...state.transcript, newEntry],
    turnCount: state.turnCount + 1,
    pendingSteering: null, // consumed after each turn
  };
}

// ── PHASE PROGRESSION ──────────────────────────────────

// Natural turn thresholds for automatic phase advancement
const PHASE_TURN_THRESHOLDS: Record<number, number> = {
  0: 2,   // opening → exploration at turn 2
  1: 6,   // exploration → narrowing at turn 6
  2: 10,  // narrowing → business-design at turn 10
  3: 14,  // business-design → wrap at turn 14
};

export function shouldAdvancePhase(state: ConversationState): boolean {
  const threshold = PHASE_TURN_THRESHOLDS[state.phaseIndex];
  return threshold !== undefined && state.turnCount >= threshold && state.phaseIndex < PHASES.length - 1;
}

export function advancePhase(state: ConversationState): ConversationState {
  const newPhaseIndex = Math.min(state.phaseIndex + 1, PHASES.length - 1);
  return { ...state, phaseIndex: newPhaseIndex };
}

export function isEpisodeComplete(state: ConversationState, maxTurns = 18): boolean {
  return (
    state.phaseIndex === PHASES.length - 1 && state.turnCount >= maxTurns
  );
}

// ── STATE EXTRACTION MERGE ─────────────────────────────

export function mergeExtractedState(
  state: ConversationState,
  extracted: ExtractedState
): ConversationState {
  return {
    ...state,
    candidateIdeas: extracted.candidateIdeas ?? state.candidateIdeas,
    frontRunners: extracted.frontRunners ?? state.frontRunners,
    keyRisks: extracted.keyRisks ?? state.keyRisks,
    openQuestions: extracted.openQuestions ?? state.openQuestions,
    customerHypothesis: extracted.customerHypothesis || state.customerHypothesis,
    businessModelHypothesis: extracted.businessModelHypothesis || state.businessModelHypothesis,
  };
}

// ── STEERING COMMAND HANDLERS ──────────────────────────

export const STEERING_PROMPT_MAP: Record<SteeringCommand, string> = {
  'lock-that-in':
    'Lock that in — treat the current leading idea as confirmed. Build around it.',
  'go-deeper':
    'Go deeper on the current front-runner. Explore it more fully.',
  'off-track':
    "You're off track — return to the strongest unresolved commercial question.",
  'challenge-that':
    'Challenge that — stress test the current logic. Surface weaknesses and contradictions.',
  'compare-top-two':
    'Compare the top two ideas directly: customer demand, business model, differentiation, ease of launch.',
  'more-practical':
    'Get more practical — focus on launch steps, pricing, operations, real-world viability.',
  'more-original':
    'Be more original — push away from generic categories toward a less obvious or sharper angle.',
  'kill-that':
    'Kill the current idea. Move on to the next strongest option.',
  'move-on':
    'Move on — progress the conversation to the next useful stage.',
  'wrap-it-up':
    'Wrap it up — move toward final concept lock, summarise, give a verdict.',
};

export function applySteeringCommand(
  state: ConversationState,
  cmd: SteeringCommand
): ConversationState {
  let updated = { ...state, pendingSteering: STEERING_PROMPT_MAP[cmd] };

  switch (cmd) {
    case 'lock-that-in':
      if (updated.frontRunners.length > 0) {
        const idea = updated.frontRunners[0];
        if (!updated.lockedPrinciples.includes(idea)) {
          updated = { ...updated, lockedPrinciples: [...updated.lockedPrinciples, idea] };
        }
      }
      break;

    case 'kill-that':
      updated = {
        ...updated,
        frontRunners: [],
        rejectedIdeas: [...updated.rejectedIdeas, ...updated.frontRunners],
      };
      break;

    case 'wrap-it-up':
      updated = { ...updated, phaseIndex: PHASES.length - 1 };
      break;

    case 'move-on':
      if (updated.phaseIndex < PHASES.length - 1) {
        updated = { ...updated, phaseIndex: updated.phaseIndex + 1 };
      }
      break;

    default:
      break;
  }

  return updated;
}

// ── FINAL CONCEPT ──────────────────────────────────────

export function setFinalConcept(
  state: ConversationState,
  concept: FinalConcept
): ConversationState {
  return { ...state, finalConcept: concept, isComplete: true };
}
