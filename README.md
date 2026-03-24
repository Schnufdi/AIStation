# Unscripted — Live AI Conversation Engine

A podcast-like interface where two AI hosts generate, debate, and shape a business idea in real time. The user listens like a podcast but can steer the direction with live controls.

---

## Quick Start (Browser Prototype)

Open `index.html` directly in your browser. No server needed.

- Uses browser text-to-speech for audio
- Uses a mock conversation engine (pre-written dialogue shaped to phase)
- Full UI, state panel, steering controls, and final summary all work

---

## Full Next.js Project Setup

### 1. Create the project

```bash
npx create-next-app@latest unscripted --typescript --tailwind --app
cd unscripted
```

### 2. Copy source files

Copy everything from `src/` into your new project's `src/` directory.

### 3. Install dependencies

```bash
npm install
```

### 4. Environment variables

Create `.env.local`:

```
# Claude API (Anthropic)
ANTHROPIC_API_KEY=sk-ant-...

# ElevenLabs TTS
ELEVENLABS_API_KEY=...

# Voice IDs (find at https://elevenlabs.io/voice-library)
ELEVENLABS_VOICE_VISIONARY=EXAVITQu4vr4xnSDxMaL
ELEVENLABS_VOICE_OPERATOR=pNInz6obpgDQGcFmaJgB
```

### 5. Create API proxy routes

These keep your API keys server-side. Create these files:

**`/app/api/claude/route.ts`** — see comment block in `src/services/claudeService.ts`

**`/app/api/tts/route.ts`** — see comment block in `src/services/ttsService.ts`

### 6. Switch from mock to real services

In `src/hooks/useConversationLoop.ts`, change:

```ts
// FROM:
import { generateTurn, extractState, generateFinalSummary } from '../services/mockService';

// TO:
import { generateTurn, extractState, generateFinalSummary } from '../services/claudeService';
```

In `src/services/ttsService.ts`, change:

```ts
const TTS_PROVIDER: TtsProvider = 'elevenlabs'; // was 'browser'
```

### 7. Run

```bash
npm run dev
```

---

## Architecture Overview

```
src/
  types/
    index.ts               ← All shared types and the ConversationState shape

  engine/
    stateModel.ts          ← State factory, phase logic, steering handlers
    promptTemplates.ts     ← All prompts for host generation and state extraction
    phaseLogic.ts          ← Phase threshold rules

  services/
    claudeService.ts       ← Real Claude API integration (swap in when ready)
    ttsService.ts          ← TTS abstraction (browser + ElevenLabs)
    mockService.ts         ← Development mock (no API keys needed)

  hooks/
    useConversationLoop.ts ← Main React hook: generates → speaks → extracts → repeats

  components/
    (plug your React components in here)
```

---

## Conversation Loop

```
start()
  └─ createInitialState()
  └─ runLoop() ──────────────────────────────────────────────────────┐
       │                                                              │
       ├─ speakerForTurn(turnCount)        ← alternates V / O        │
       ├─ generateTurn(state, speaker)     ← Claude or mock          │
       ├─ appendTurn(state, entry)         ← updates transcript      │
       ├─ shouldAdvancePhase() → advancePhase()                      │
       ├─ speak(text, speaker)             ← ElevenLabs or browser   │
       ├─ extractState() every 3 turns     ← Claude or mock          │
       └─ loop ────────────────────────────────────────────────────┘

  until: isEpisodeComplete()
  then:  generateFinalSummary() → render FinalConcept card
```

---

## Steering Commands

| Button | Effect |
|--------|--------|
| Lock that in | Promotes front-runner to lockedPrinciples |
| Go deeper | Continues exploring current front-runner |
| You're off track | Redirects to strongest unresolved thread |
| Challenge that | Stress-tests current logic |
| Compare top two | Forces direct comparison |
| More practical | Shifts to execution/pricing/launch |
| More original | Widens search, avoids generic angles |
| Kill that | Discards front-runner, moves on |
| Move on | Advances phase |
| Wrap it up | Jumps to wrap phase |

---

## Adding New Episode Modes

1. Add the mode to `EpisodeMode` in `types/index.ts`
2. Add phase guidance in `promptTemplates.ts` `buildTurnPrompt()`
3. Add mock dialogue banks in `mockService.ts`
4. Register the mode in the UI topic selector

---

## Voice Recommendations (ElevenLabs)

| Host | Character | Suggested Voice |
|------|-----------|-----------------|
| Visionary | Warm, curious, slightly faster | Sarah / Rachel / Bella |
| Operator | Measured, dry, slightly slower | Adam / Daniel / Josh |

Find voice IDs at [elevenlabs.io/voice-library](https://elevenlabs.io/voice-library)

---

## Cost Estimates

| Service | Usage per episode | Approx cost |
|---------|------------------|-------------|
| Claude Sonnet | ~18 turns × ~200 tokens | ~$0.01 |
| ElevenLabs Turbo | ~18 turns × ~50 words | ~$0.04 |
| **Total per episode** | | **~$0.05** |
