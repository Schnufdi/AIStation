// ═══════════════════════════════════════════════════════
//  services/claudeService.ts
//  Text generation via Claude API
//
//  SETUP:
//    1. Set NEXT_PUBLIC_ANTHROPIC_API_KEY in .env.local
//       (or route through a Next.js API route for security)
//    2. Call generateTurn() and extractState() from the engine
//
//  PRODUCTION NOTE:
//    For security, route API calls through /api/claude
//    rather than calling Anthropic directly from the browser.
//    A Next.js API route example is included below.
// ═══════════════════════════════════════════════════════

import {
  ConversationState,
  ExtractedState,
  FinalConcept,
  Speaker,
} from '../types';

import {
  HOST_SYSTEM_PROMPTS,
  buildTurnPrompt,
  buildStateExtractionPrompt,
  buildFinalSummaryPrompt,
} from '../engine/promptTemplates';

// ── CONFIG ─────────────────────────────────────────────

const CLAUDE_MODEL = 'claude-opus-4-5';
const CLAUDE_ENDPOINT = '/api/claude'; // proxy route (recommended)
// Direct endpoint (for dev only, exposes key):
// const CLAUDE_ENDPOINT = 'https://api.anthropic.com/v1/messages';

// ── CORE API CALL ──────────────────────────────────────

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function callClaude(
  system: string,
  messages: ClaudeMessage[],
  maxTokens = 300
): Promise<string> {
  const res = await fetch(CLAUDE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const textBlock = data.content?.find((b: { type: string }) => b.type === 'text');
  if (!textBlock) throw new Error('No text block in Claude response');
  return textBlock.text as string;
}

// ── TURN GENERATION ────────────────────────────────────

export async function generateTurn(
  state: ConversationState,
  speaker: Speaker
): Promise<string> {
  const system = HOST_SYSTEM_PROMPTS[speaker];
  const userPrompt = buildTurnPrompt(state, speaker);

  const text = await callClaude(system, [{ role: 'user', content: userPrompt }], 300);
  return text.trim();
}

// ── STATE EXTRACTION ───────────────────────────────────

export async function extractState(
  state: ConversationState
): Promise<ExtractedState> {
  const system =
    'You extract structured business-discovery state from conversations. Respond only with valid JSON. No markdown.';
  const userPrompt = buildStateExtractionPrompt(state);

  const raw = await callClaude(system, [{ role: 'user', content: userPrompt }], 500);

  try {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned) as ExtractedState;
  } catch {
    console.warn('Failed to parse state extraction JSON:', raw);
    return {
      candidateIdeas: state.candidateIdeas,
      frontRunners: state.frontRunners,
      keyRisks: state.keyRisks,
      openQuestions: state.openQuestions,
      customerHypothesis: state.customerHypothesis,
      businessModelHypothesis: state.businessModelHypothesis,
    };
  }
}

// ── FINAL SUMMARY GENERATION ───────────────────────────

export async function generateFinalSummary(
  state: ConversationState
): Promise<FinalConcept> {
  const system =
    'You write business concept summaries as JSON. Respond only with valid JSON. No markdown.';
  const userPrompt = buildFinalSummaryPrompt(state);

  const raw = await callClaude(system, [{ role: 'user', content: userPrompt }], 600);

  try {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned) as FinalConcept;
  } catch {
    console.warn('Failed to parse final summary JSON:', raw);
    return {
      name: state.frontRunners[0] ?? 'Unnamed Concept',
      pitch: 'A business idea developed through live AI conversation.',
      customer: state.customerHypothesis || 'To be defined',
      revenueModel: state.businessModelHypothesis || 'To be defined',
      biggestRisk: state.keyRisks[0] ?? 'Execution risk',
      mvp: 'Start small, validate fast.',
      verdict: 'pivot',
    };
  }
}

/* ══════════════════════════════════════════════════════
   NEXT.JS API ROUTE — /app/api/claude/route.ts
   Copy this into your Next.js project.
   This keeps your API key server-side.
   ══════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

*/
