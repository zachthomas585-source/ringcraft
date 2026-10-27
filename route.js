import { generateText } from 'ai';
import {
  MAX_ROUNDS,
  SESSION_TYPES,
  STANCES,
  computeRound,
  computeSummary,
  formatDuration,
  isLiveOpponent,
  pct,
  positionLabel,
} from '../../../lib/metrics.js';
import { buildInsights } from '../../../lib/insights.js';

export const maxDuration = 60;

// Any model ID from the AI Gateway model list works here. Set AI_MODEL in
// your Vercel project's environment variables to swap it without touching code.
const MODEL = process.env.AI_MODEL || 'anthropic/claude-sonnet-4.6';

const SYSTEM = `You are an experienced boxing coach and sports scientist reviewing a boxer's round-by-round training data.
You speak like a good coach in the corner: direct, specific, encouraging, no waffle.

Write your coaching in exactly this structure, using markdown headings (##) and bullet points:

## The verdict
Two or three sentences: how the session went and the single biggest thing holding them back.

## What's working
Two or three bullets.

## Fix first
Up to three bullets, most important first. Each one names the round(s) and the number that shows the problem, then what to change.

## Punch selection
Two or three bullets on shot choice (head vs body, volume vs accuracy, leads vs power shots), using their stance and opponent notes if given.

## Energy and pacing
Two or three bullets on where energy is being wasted (missed punches, movement without a return, heart-rate climb, breathing) and how to pace the rounds.

## Next session
Three or four bullets that make a concrete plan: specific drills with rounds and durations that target the "Fix first" points.

Rules:
- Quote their actual numbers and round numbers. Never invent data that is not provided.
- If something important is missing (for example no heart rate), say what to track next time in one short line.
- Bag work, pad work and shadow boxing have no live opponent, so do not judge accuracy or ring position for those.
- "Heartbeats per landed punch" is average heart rate multiplied by round minutes, divided by punches landed. Lower is more efficient.
- Do not give medical advice or diagnose anything. If heart rate or breathing numbers look unusual, suggest checking with a qualified professional.
- Use British English. Keep it under 450 words.`;

const clean = (value, max = 160) =>
  String(value ?? '')
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, max);

const labelFor = (options, value) => options.find((o) => o.value === value)?.label ?? 'Not given';

function describeRound(r) {
  const parts = [
    `R${r.round} (${formatDuration(r.duration)})`,
    `thrown ${r.thrown}`,
    `landed ${r.head} head / ${r.body} body`,
    `missed ${r.missed}${r.missedIsEstimate ? ' (thrown minus landed)' : ''}`,
    `accuracy ${pct(r.accuracy)}`,
    `${r.output.toFixed(1)} punches/min`,
  ];
  if (r.avgHr !== null) parts.push(`avg HR ${r.avgHr}${r.maxHr !== null ? `, max ${r.maxHr}` : ''}`);
  if (r.breaths !== null) parts.push(`${r.breaths} breaths/min`);
  if (r.defence !== null) parts.push(`${r.defence} slips and dodges`);
  if (r.position) parts.push(`mostly ${positionLabel(r.position, true)}`);
  if (r.beatsPerLanded !== null) parts.push(`${Math.round(r.beatsPerLanded)} heartbeats per landed punch`);
  return parts.join('; ');
}

function describePhase(p) {
  const bits = [`${p.label}: ${p.output?.toFixed(1) ?? '–'} punches/min`, `accuracy ${pct(p.accuracy)}`];
  if (p.beatsPerLanded !== null) bits.push(`${Math.round(p.beatsPerLanded)} heartbeats per landed punch`);
  if (p.defencePerMin !== null) bits.push(`${p.defencePerMin.toFixed(1)} slips and dodges/min`);
  if (p.breaths !== null) bits.push(`${Math.round(p.breaths)} breaths/min`);
  return bits.join(', ');
}

function buildPrompt(meta, rounds, summary, flags) {
  const live = isLiveOpponent(meta.sessionType);
  const lines = [
    `Session type: ${labelFor(SESSION_TYPES, meta.sessionType)}${live ? ' (live opponent)' : ' (no live opponent)'}`,
    `Stance: ${labelFor(STANCES, meta.stance)}`,
    `Weight class: ${clean(meta.weightClass, 40) || 'Not given'}`,
    `Rest between rounds: ${clean(meta.restSec, 6) ? `${clean(meta.restSec, 6)} seconds` : 'Not given'}`,
    `Their goal for the session: ${clean(meta.goal) || 'Not given'}`,
  ];
  if (live) lines.push(`Opponent or partner: ${clean(meta.opponent) || 'Not given'}`);

  lines.push('', 'Rounds:', ...rounds.map(describeRound), '');
  lines.push(
    `Totals: ${summary.rounds} rounds, ${summary.thrown} thrown, ${summary.landed} landed (${summary.head} head, ${summary.body} body), accuracy ${pct(summary.accuracy)}, ${summary.output.toFixed(1)} punches/min, body share ${pct(summary.bodyShare)}${summary.avgHr !== null ? `, average HR ${Math.round(summary.avgHr)}, peak HR ${summary.peakHr}` : ''}.`,
  );
  if (summary.hasSplit) {
    lines.push('First half vs second half:', describePhase(summary.early), describePhase(summary.late));
  }
  if (flags.length) {
    lines.push(
      '',
      'The app has already shown them these quick flags, so go deeper than restating them:',
      ...flags.map((f) => `- ${f.title}`),
    );
  }
  return lines.join('\n');
}

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'Send the session as JSON.' }, { status: 400 });
  }

  if (JSON.stringify(payload ?? {}).length > 20000) {
    return Response.json({ error: 'That session is too large to analyse. Keep it to 15 rounds.' }, { status: 413 });
  }

  const meta = payload?.meta && typeof payload.meta === 'object' ? payload.meta : {};
  const rawRounds = Array.isArray(payload?.rounds) ? payload.rounds.slice(0, MAX_ROUNDS) : [];
  const rounds = rawRounds.map((r, i) => computeRound(r ?? {}, i)).filter((r) => r.valid);
  const summary = computeSummary(rounds);

  if (!summary) {
    return Response.json(
      { error: 'Add at least one round with punches thrown, then ask for coaching.' },
      { status: 400 },
    );
  }

  try {
    const { text } = await generateText({
      model: MODEL,
      system: SYSTEM,
      prompt: buildPrompt(meta, rounds, summary, buildInsights(summary, meta)),
      maxOutputTokens: 1400,
    });
    return Response.json({ advice: text });
  } catch (error) {
    console.error('Coach request failed:', error);
    const message = String(error?.message ?? '');
    const notConnected = /auth|oidc|api key|token|unauthor|forbidden|401|403/i.test(message);
    const noCredit = /credit|balance|quota|payment|402/i.test(message);
    let friendly = 'The AI coach could not finish this analysis. Try again in a moment.';
    if (notConnected) {
      friendly =
        'The AI coach is not connected yet. On Vercel it connects automatically after a redeploy; locally, add AI_GATEWAY_API_KEY to .env.local.';
    } else if (noCredit) {
      friendly = 'The AI Gateway is out of credit. Check the AI Gateway tab in your Vercel dashboard.';
    }
    return Response.json({ error: friendly }, { status: 502 });
  }
}
