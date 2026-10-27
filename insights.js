import { isLiveOpponent } from './metrics.js';

// Thresholds are deliberately simple so you can tune them as you learn
// what "normal" looks like for you.
export const THRESHOLDS = {
  outputFade: -0.2, // 20% fewer punches per minute late vs early
  outputHolds: -0.08, // within 8% counts as holding up
  accuracyDrop: -0.05, // 5 percentage points
  lowAccuracy: 0.25,
  highAccuracy: 0.4,
  lowBodyShare: 0.2,
  costRise: 1.4, // a landed punch costs 40% more heartbeats late
  defenceRise: 1.2,
  hrDrift: 12, // bpm from first round to last
  breathingRise: 1.25,
};

const TONE_ORDER = { fix: 0, watch: 1, good: 2 };
const percent = (v) => `${Math.round(Math.abs(v) * 100)}%`;
const whole = (v) => Math.round(v);

function listRounds(rounds) {
  if (rounds.length === 1) return `round ${rounds[0]}`;
  const head = rounds.slice(0, -1).join(', ');
  return `rounds ${head} and ${rounds[rounds.length - 1]}`;
}

export function buildInsights(summary, meta = {}) {
  if (!summary) return [];
  const t = THRESHOLDS;
  const live = isLiveOpponent(meta.sessionType);
  const { early, late } = summary;
  const notes = [];

  if (summary.outputChange !== null) {
    if (summary.outputChange <= t.outputFade) {
      notes.push({
        tone: 'fix',
        title: 'Your output fades late',
        body: `You threw ${percent(summary.outputChange)} fewer punches a minute in ${late.label} than in ${early.label} (${whole(early.output)} down to ${whole(late.output)}). That is usually pacing and conditioning rather than technique: build rounds that finish as hard as they start.`,
      });
    } else if (summary.outputChange > t.outputHolds) {
      const direction =
        summary.outputChange >= 0
          ? `went up ${percent(summary.outputChange)}`
          : `only dropped ${percent(summary.outputChange)}`;
      notes.push({
        tone: 'good',
        title: 'Your engine holds up',
        body: `Your punch rate ${direction} from ${early.label} to ${late.label}. That is a solid base to add pressure on.`,
      });
    }
  }

  if (live && summary.accuracyChange !== null && summary.accuracyChange <= t.accuracyDrop) {
    notes.push({
      tone: 'fix',
      title: 'Accuracy drops when you tire',
      body: `You landed ${percent(early.accuracy)} in ${early.label} and ${percent(late.accuracy)} in ${late.label}. Tired punches get wider and slower, so shorten up late: straight shots and fewer, sharper combinations.`,
    });
  }

  if (early.beatsPerLanded !== null && late.beatsPerLanded !== null && late.beatsPerLanded >= early.beatsPerLanded * t.costRise) {
    notes.push({
      tone: 'fix',
      title: 'Each landed punch costs you more',
      body: `In ${early.label} a landed punch cost about ${whole(early.beatsPerLanded)} heartbeats. By ${late.label} it cost ${whole(late.beatsPerLanded)}. You are working harder for less, so that is where to look for wasted energy.`,
    });
  }

  if (live && summary.accuracy !== null && summary.thrown >= 30) {
    if (summary.accuracy < t.lowAccuracy) {
      notes.push({
        tone: 'watch',
        title: 'Plenty thrown, not much landing',
        body: `Only ${percent(summary.accuracy)} of your punches landed. Every miss costs energy and leaves you open. Set up with the jab and feints before committing to power shots.`,
      });
    } else if (summary.accuracy >= t.highAccuracy) {
      notes.push({
        tone: 'good',
        title: 'Your shot selection is sharp',
        body: `${percent(summary.accuracy)} of your punches landed, which is a high rate against a live opponent.`,
      });
    }
  }

  if (live && summary.bodyShare !== null && summary.landed >= 10 && summary.bodyShare < t.lowBodyShare) {
    notes.push({
      tone: 'watch',
      title: 'You are head-hunting',
      body: `Only ${percent(summary.bodyShare)} of your landed punches went to the body. Body shots are harder to miss, slow your opponent down and bring the guard down for head shots later.`,
    });
  }

  if (
    early.defencePerMin !== null &&
    late.defencePerMin !== null &&
    late.defencePerMin >= early.defencePerMin * t.defenceRise &&
    (summary.outputChange ?? 0) < -0.1
  ) {
    notes.push({
      tone: 'watch',
      title: 'More defending, less punching',
      body: `Your slips and dodges went from ${early.defencePerMin.toFixed(1)} to ${late.defencePerMin.toFixed(1)} a minute while your punch rate dropped. Movement with no return burns energy and scores nothing. Aim to fire back after every slip.`,
    });
  }

  if (live && summary.pushedBack.length >= 2) {
    notes.push({
      tone: 'watch',
      title: 'You are getting pushed back',
      body: `You spent ${listRounds(summary.pushedBack)} mostly on the ropes or in a corner. Work on pivots and stepping off at angles rather than backing straight up.`,
    });
  }

  if (summary.hrDrift !== null && summary.hrDrift >= t.hrDrift) {
    const rest = meta.restSec ? ` with ${meta.restSec} seconds' rest` : '';
    notes.push({
      tone: 'watch',
      title: 'Your heart rate climbs every round',
      body: `Average heart rate rose ${whole(summary.hrDrift)} bpm from your first round to your last${rest}. Slow, deep breathing in the corner and relaxing your shoulders between exchanges both help you recover.`,
    });
  }

  if (early.breaths !== null && late.breaths !== null && late.breaths >= early.breaths * t.breathingRise) {
    notes.push({
      tone: 'watch',
      title: 'Your breathing gets ragged',
      body: `Breathing went from ${whole(early.breaths)} to ${whole(late.breaths)} breaths a minute. Breathe out on every punch and through the nose when you are not exchanging.`,
    });
  }

  return notes.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone]);
}
