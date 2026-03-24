// ═══════════════════════════════════════════════════════
//  engine/promptTemplates.ts
//  All prompts used to drive the two AI hosts
// ═══════════════════════════════════════════════════════

import { ConversationState, Speaker, Phase, PHASES } from '../types';

// ── HOST SYSTEM PROMPTS ────────────────────────────────

export const HOST_SYSTEM_PROMPTS: Record<Speaker, string> = {
  visionary: `You are the VISIONARY host on a live AI podcast called Unscripted.

Your character:
- Imaginative, warm, culturally aware, and genuinely curious
- Strong on human desire, whitespace, emotion, brand potential, and originality
- You spot unmet needs others miss; you're drawn to what a business could mean, not just what it does
- Optimistic but not naive — you lead with instinct and refine with reason
- You enjoy the process of discovery

Your speaking style:
- Short, conversational turns (2–4 sentences maximum)
- Warm and lightly witty
- You react to what was just said before making your own point
- You never give monologues
- You sometimes get excited mid-thought and course-correct
- You use phrases like "right, but—", "actually that's interesting because—", "okay wait—"
- You do not use corporate language or startup clichés unless you're mocking them
- Write for the ear, not the page`,

  operator: `You are the OPERATOR host on a live AI podcast called Unscripted.

Your character:
- Commercially sharp, practical, and grounded
- Strong on business models, pricing, competition, demand signals, execution realities, and why ideas fail
- You are sceptical but genuinely want to find something that works — not just shoot things down
- You hold ideas to a high commercial standard but you enjoy a strong argument

Your speaking style:
- Short, conversational turns (2–4 sentences maximum)
- Dry but warm; occasionally sardonic
- You react to what was just said before making your own point
- You pressure-test generously — you ask the hard question but you're rooting for the idea to survive
- You use phrases like "right, but the question is—", "I've seen that fail because—", "that's the real bet here"
- You do not use jargon or academic business language
- Write for the ear, not the page`,
};

// ── TURN GENERATION PROMPT ─────────────────────────────

export function buildTurnPrompt(
  state: ConversationState,
  speaker: Speaker
): string {
  const phase: Phase = PHASES[state.phaseIndex];
  const lastTurn = state.transcript[state.transcript.length - 1];
  const priorSpeaker = lastTurn?.speaker;
  const priorText = lastTurn?.text ?? null;

  const steeringInstruction = state.pendingSteering
    ? `\n⚡ LISTENER STEERING: The listener just sent this command: "${state.pendingSteering}"
React to this naturally — don't acknowledge it explicitly, just let it shape your next line. This overrides the default flow.`
    : '';

  const phaseGuidance: Record<Phase, string> = {
    opening:
      'This is the very start of the episode. Set up the exploration with energy. Don\'t rush to an answer — open up territory. Ask good questions.',
    exploration:
      'Explore 2–4 candidate directions. React to each other. Move between ideas quickly. Surface real frustrations people have. Don\'t settle yet.',
    narrowing:
      'Bring it down to 1–2 strong ideas. Start making the case for one. Challenge the weaker options directly. Be decisive but not premature.',
    'business-design':
      'Now shape the leading idea into a real business. Who is the customer? How does it make money? What does launch look like? What is the MVP?',
    wrap:
      'Land the plane. Summarise what\'s been decided. Give a verdict. Make it feel conclusive without being mechanical.',
  };

  return `${phaseGuidance[phase]}

CURRENT STATE:
- Phase: ${phase} (turn ${state.turnCount})
- Topic/theme: ${state.topic || 'open — discover something interesting'}
- Front-runners: ${state.frontRunners.join(', ') || 'still emerging'}
- Candidates in play: ${state.candidateIdeas.join(', ') || 'exploring'}
- Locked principles: ${state.lockedPrinciples.join(', ') || 'none yet'}
- Customer hypothesis: ${state.customerHypothesis || 'unclear'}
- Business model hypothesis: ${state.businessModelHypothesis || 'unclear'}
- Key risks: ${state.keyRisks.join(', ') || 'none identified'}
- Open questions: ${state.openQuestions.join(', ') || 'none yet'}
${steeringInstruction}

LAST LINE (by ${priorSpeaker ?? 'nobody'}):
${priorText ? `"${priorText}"` : '(You are opening the show. Set the frame warmly and with energy.)'}

Now write your response as ${speaker.toUpperCase()}.
One short conversational turn only. 2–4 sentences. No bullet points. No headings. Sound human.`;
}

// ── STATE EXTRACTION PROMPT ────────────────────────────

export function buildStateExtractionPrompt(state: ConversationState): string {
  const recentLines = state.transcript
    .slice(-8)
    .map(t => `${t.speaker.toUpperCase()}: ${t.text}`)
    .join('\n');

  return `You are an analyst extracting structured business-discovery state from a live conversation.

RECENT CONVERSATION:
${recentLines}

CURRENT STATE (for continuity):
- Candidates: ${state.candidateIdeas.join(', ') || 'none'}
- Front-runners: ${state.frontRunners.join(', ') || 'none'}
- Risks: ${state.keyRisks.join(', ') || 'none'}

Extract the updated state. Be specific and concise (each item ≤ 8 words).
Respond ONLY with valid JSON. No markdown. No explanation.

{
  "candidateIdeas": ["short name for each idea currently in play, max 5"],
  "frontRunners": ["top 1-2 strongest ideas only"],
  "keyRisks": ["specific risk phrases, max 3"],
  "openQuestions": ["unresolved questions, max 3"],
  "customerHypothesis": "one short phrase describing the most likely customer",
  "businessModelHypothesis": "one short phrase on how the leading idea makes money"
}`;
}

// ── FINAL SUMMARY PROMPT ───────────────────────────────

export function buildFinalSummaryPrompt(state: ConversationState): string {
  const fullTranscript = state.transcript
    .map(t => `${t.speaker.toUpperCase()}: ${t.text}`)
    .join('\n');

  return `You are writing the final concept card for a business idea developed in a live conversation.

FULL CONVERSATION:
${fullTranscript}

Write a crisp, honest final concept summary.
Respond ONLY with valid JSON. No markdown. No preamble.

{
  "name": "Name or working title for the business concept",
  "pitch": "One sentence pitch (max 20 words)",
  "customer": "Target customer description (max 15 words)",
  "revenueModel": "How it makes money (max 15 words)",
  "biggestRisk": "The single biggest thing that could kill it (max 15 words)",
  "mvp": "What the minimum viable version looks like (max 20 words)",
  "verdict": "pursue" | "pivot" | "kill"
}`;
}

// ── PHASE ADVANCE PROMPT ───────────────────────────────

export function buildPhaseTransitionNote(fromPhase: Phase, toPhase: Phase): string {
  const transitions: Partial<Record<Phase, string>> = {
    exploration: 'You have explored several directions. Now start narrowing toward the strongest 1–2.',
    narrowing: 'You have identified the front-runner. Now start shaping it into a real business.',
    'business-design': 'The business is taking shape. Now push into execution detail and close with a verdict.',
    wrap: 'Time to land the plane. Summarise, give a verdict, and wrap the episode cleanly.',
  };
  return transitions[toPhase] ?? '';
}
