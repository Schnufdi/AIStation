// ═══════════════════════════════════════════════════════
//  types/index.ts — Core type definitions
// ═══════════════════════════════════════════════════════

export type Speaker = 'visionary' | 'operator';

export type Phase =
  | 'opening'
  | 'exploration'
  | 'narrowing'
  | 'business-design'
  | 'wrap';

export const PHASES: Phase[] = [
  'opening',
  'exploration',
  'narrowing',
  'business-design',
  'wrap',
];

export const PHASE_LABELS: Record<Phase, string> = {
  opening: 'Opening',
  exploration: 'Exploring',
  narrowing: 'Narrowing',
  'business-design': 'Building',
  wrap: 'Wrapping',
};

export type SteeringCommand =
  | 'lock-that-in'
  | 'go-deeper'
  | 'off-track'
  | 'challenge-that'
  | 'compare-top-two'
  | 'more-practical'
  | 'more-original'
  | 'kill-that'
  | 'move-on'
  | 'wrap-it-up';

export interface TranscriptEntry {
  id: string;
  speaker: Speaker;
  text: string;
  timestamp: number;
}

export interface FinalConcept {
  name: string;
  pitch: string;
  customer: string;
  revenueModel: string;
  biggestRisk: string;
  mvp: string;
  verdict: 'pursue' | 'pivot' | 'kill';
}

export interface ConversationState {
  topic: string;
  mode: string;
  phaseIndex: number;
  turnCount: number;
  transcript: TranscriptEntry[];

  // Business discovery state
  candidateIdeas: string[];
  frontRunners: string[];
  rejectedIdeas: string[];
  lockedPrinciples: string[];
  openQuestions: string[];
  customerHypothesis: string;
  businessModelHypothesis: string;
  keyRisks: string[];

  // Engine state
  pendingSteering: string | null;
  isComplete: boolean;
  finalConcept: FinalConcept | null;
}

export interface ExtractedState {
  candidateIdeas: string[];
  frontRunners: string[];
  keyRisks: string[];
  openQuestions: string[];
  customerHypothesis: string;
  businessModelHypothesis: string;
}

export interface AudioQueueItem {
  id: string;
  speaker: Speaker;
  text: string;
  audioUrl?: string;       // populated after TTS
  audioBuffer?: ArrayBuffer;
}

export type EpisodeMode = 'business' | 'strategy' | 'product';
