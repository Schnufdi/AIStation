// ═══════════════════════════════════════════════════════
//  services/mockService.ts
//  Development mock that simulates Claude responses
//  Replace with claudeService.ts imports when ready
// ═══════════════════════════════════════════════════════

import { ConversationState, ExtractedState, FinalConcept, Speaker, PHASES } from '../types';

function delay(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}

// ── MOCK CONVERSATION BANKS ────────────────────────────
// Keyed by phase. Each entry has speaker + text.
// In production, Claude generates these dynamically.

const MOCK_DIALOGUE: Record<string, Array<{ speaker: Speaker; text: string }>> = {
  opening: [
    { speaker: 'visionary', text: "Okay, so we're starting with nothing. Which I actually love — blank canvas, no constraints. Let's not start with 'what's a good idea'. Let's start with: what are people quietly suffering about that nobody's built the right thing for yet?" },
    { speaker: 'operator', text: "I like that. Suffering is a better starting point than desire. With desire you're creating demand. With frustration, the demand already exists — you're just removing something that shouldn't be there." },
    { speaker: 'visionary', text: "Right. So where does your gut take you? What's a category that feels like it's been attacked a hundred times and still isn't solved?" },
    { speaker: 'operator', text: "Local services. Trades. Finding someone good to fix things, renovate things. Checkatrade, Rated People — they've all had a go. But that market still feels completely broken from both sides." },
  ],
  exploration: [
    { speaker: 'visionary', text: "The trust problem is everywhere in that space. You never really know if someone is good until they've done the job — and by then it's too late." },
    { speaker: 'operator', text: "The deeper issue might be that the platforms profit from the search, not the outcome. They have no incentive to actually make the match better. That's a structural problem." },
    { speaker: 'visionary', text: "What if you flipped it — instead of the customer hunting for tradespeople, the tradespeople compete for verified, pre-screened jobs? Flips the power dynamic entirely." },
    { speaker: 'operator', text: "I've seen variations of that. The question is always: who pays, and when? Tradespeople are notoriously reluctant to pay upfront for leads that might not convert." },
    { speaker: 'visionary', text: "Fair. But what about the other end of the market — there's a whole professional-class of people who would genuinely pay a premium for a concierge-style home management service. Not a marketplace. An account manager." },
    { speaker: 'operator', text: "Now that's interesting. You're describing something more like a membership model. Fixed monthly fee, they handle everything — sourcing, vetting, scheduling, payment. Homeowners who earn well but are time-poor." },
  ],
  narrowing: [
    { speaker: 'visionary', text: "I keep coming back to the word 'trusted'. That's genuinely scarce in this space. The whole category is low-trust — and that's a brand opportunity if someone owns it properly." },
    { speaker: 'operator', text: "The market is there. People already spend money on this — they're just spending it inefficiently and anxiously. You're not creating a new behaviour, you're improving an existing one." },
    { speaker: 'visionary', text: "So the positioning is almost like — imagine having a property manager for your home. Not just for landlords. For everyone who owns a decent place and wants it run properly." },
    { speaker: 'operator', text: "I'd push on the renter angle though. Renters often can't choose contractors anyway. The real customer is probably the homeowner in their late thirties, dual income, property they care about, no time." },
    { speaker: 'visionary', text: "That's a really clear person. And they exist in every major city. They're probably already spending money on a cleaner, a gardener — they're used to outsourcing domestic life." },
    { speaker: 'operator', text: "Right. This isn't a stretch for them behaviourally. It's just filling a gap that nobody's filled properly at the premium end." },
  ],
  'business-design': [
    { speaker: 'visionary', text: "So let's give it a shape. A home care membership — let's call it something like 'Harbour'. The brand should feel reliable and slightly premium, not corporate." },
    { speaker: 'operator', text: "I like Harbour actually. It's aspirational but warm. The pitch almost writes itself: your home, always in good hands." },
    { speaker: 'visionary', text: "Members get a dedicated account manager, a vetted network of tradespeople, proactive reminders for seasonal maintenance, and one-call resolution for anything that breaks." },
    { speaker: 'operator', text: "Pricing. I'd say £99-149 a month at launch. Cheap enough to feel like a no-brainer for the target customer, but meaningful enough to fund real service quality." },
    { speaker: 'visionary', text: "The big risk is the supply side. If you can't deliver on the trades quickly and consistently, the whole promise collapses. You'd need a vetted network before you even open to members." },
    { speaker: 'operator', text: "Launch in one city. London first. Build 30-50 quality tradespeople across key trades. Onboard members slowly. Don't try to scale before the model works." },
  ],
  wrap: [
    { speaker: 'visionary', text: "I think we've landed somewhere real here. It's not a moonshot — it's a business you could actually build with a small team and meaningful capital." },
    { speaker: 'operator', text: "The market's proven — people spend money on homes. The category is broken — nobody owns the premium trust position. The model is simple — membership plus margin on services. I'd pursue this." },
    { speaker: 'visionary', text: "Harbour. Home management, done properly. For people who've earned the right to stop worrying about it." },
    { speaker: 'operator', text: "And that, ladies and gentlemen, is a business. Let's call it." },
  ],
};

// ── MOCK STATE BY PHASE ────────────────────────────────

const MOCK_STATE_BY_PHASE: Record<string, ExtractedState> = {
  opening: {
    candidateIdeas: ['Home management membership', 'Trades marketplace'],
    frontRunners: [],
    keyRisks: ['Trust gap in local services'],
    openQuestions: ['Who pays?', 'Which end of the market?'],
    customerHypothesis: 'Emerging',
    businessModelHypothesis: 'Unclear',
  },
  exploration: {
    candidateIdeas: ['Home management membership', 'Trades concierge', 'Premium trades marketplace'],
    frontRunners: ['Home management membership'],
    keyRisks: ['Supply-side build-out', 'Tradesperson acquisition cost'],
    openQuestions: ['Membership vs commission?', 'Renter vs owner?'],
    customerHypothesis: 'Time-poor homeowner',
    businessModelHypothesis: 'Monthly subscription',
  },
  narrowing: {
    candidateIdeas: ['Harbour — home care membership'],
    frontRunners: ['Harbour — home care membership'],
    keyRisks: ['Trade network quality', 'City-by-city scaling'],
    openQuestions: ['Launch city?', 'How many founding members?'],
    customerHypothesis: 'Dual-income homeowner, 35-50, property-conscious, London',
    businessModelHypothesis: '£99-149/month membership',
  },
  'business-design': {
    candidateIdeas: ['Harbour'],
    frontRunners: ['Harbour'],
    keyRisks: ['Trade network before launch', 'Service consistency at scale'],
    openQuestions: ['Founding member target?'],
    customerHypothesis: 'Urban homeowner, 35-55, dual income, London-first',
    businessModelHypothesis: '£120/month membership + margin on trade referrals',
  },
  wrap: {
    candidateIdeas: ['Harbour'],
    frontRunners: ['Harbour'],
    keyRisks: ['Operational quality at scale'],
    openQuestions: [],
    customerHypothesis: 'Urban homeowner, dual income, 35-55',
    businessModelHypothesis: 'Membership + trade margin',
  },
};

// ── MOCK FINAL SUMMARY ─────────────────────────────────

const MOCK_FINAL: FinalConcept = {
  name: 'Harbour',
  pitch: 'A home care membership for time-poor urban homeowners — one trusted account, done.',
  customer: 'Dual-income homeowners, 35-55, London-first, already outsourcing domestic life.',
  revenueModel: '£120/month membership + margin on vetted trade referrals.',
  biggestRisk: 'Supply-side quality — the whole proposition collapses without a vetted trade network at launch.',
  mvp: 'One city, 50 vetted tradespeople, 100 founding members at £99/month. Manual ops first.',
  verdict: 'pursue',
};

// ── PUBLIC MOCK API ────────────────────────────────────

export async function generateTurn(state: ConversationState, speaker: Speaker): Promise<string> {
  await delay(500 + Math.random() * 700);

  const phase = PHASES[state.phaseIndex];
  const bank  = MOCK_DIALOGUE[phase] ?? MOCK_DIALOGUE['exploration'];

  // Rotate through turns matching the speaker
  const matching = bank.filter(t => t.speaker === speaker);
  if (matching.length === 0) {
    const fallback = bank[state.turnCount % bank.length];
    return fallback.text;
  }

  const idx = Math.floor(state.turnCount / 2) % matching.length;
  return matching[idx].text;
}

export async function extractState(state: ConversationState): Promise<ExtractedState> {
  await delay(150);
  const phase = PHASES[state.phaseIndex];
  return MOCK_STATE_BY_PHASE[phase] ?? MOCK_STATE_BY_PHASE['exploration'];
}

export async function generateFinalSummary(_state: ConversationState): Promise<FinalConcept> {
  await delay(800);
  return MOCK_FINAL;
}
