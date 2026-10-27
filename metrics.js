// All the maths behind Ringcraft lives here so the page and the AI coach
// work from exactly the same numbers.

export const MAX_ROUNDS = 15;
export const DEFAULT_DURATION = '3:00';

export const EMPTY_ROUND = Object.freeze({
  duration: DEFAULT_DURATION,
  thrown: '',
  head: '',
  body: '',
  missed: '',
  avgHr: '',
  maxHr: '',
  breaths: '',
  defence: '',
  position: '',
});

export const DEFAULT_META = Object.freeze({
  sessionType: 'sparring',
  stance: 'orthodox',
  weightClass: '',
  restSec: '60',
  goal: '',
  opponent: '',
});

export const SESSION_TYPES = [
  { value: 'sparring', label: 'Sparring' },
  { value: 'fight', label: 'Fight' },
  { value: 'pads', label: 'Pad work' },
  { value: 'bag', label: 'Bag work' },
  { value: 'shadow', label: 'Shadow boxing' },
];

export const STANCES = [
  { value: 'orthodox', label: 'Orthodox' },
  { value: 'southpaw', label: 'Southpaw' },
  { value: 'switch', label: 'Switch hitter' },
];

export const POSITIONS = [
  { value: '', label: '–', long: 'not tracked' },
  { value: 'centre', label: 'Centre', long: 'in the centre' },
  { value: 'ropes', label: 'Ropes', long: 'on the ropes' },
  { value: 'corner', label: 'Corner', long: 'in a corner' },
  { value: 'mixed', label: 'Mixed', long: 'all over the ring' },
];

// Accuracy and shot selection only mean something against a live opponent.
export function isLiveOpponent(sessionType) {
  return sessionType === 'sparring' || sessionType === 'fight';
}

export function toNumber(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (text === '') return null;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// Accepts "3:00", "180" (seconds) or "3" (minutes; any plain number up to 15).
export function parseDuration(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (text === '') return null;
  if (text.includes(':')) {
    const [m, s] = text.split(':');
    const minutes = Number(m || 0);
    const seconds = Number(s || 0);
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;
    const total = minutes * 60 + seconds;
    return total > 0 ? total : null;
  }
  const n = Number(text);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n <= 15 ? n * 60 : n;
}

export function formatDuration(totalSeconds) {
  if (!Number.isFinite(totalSeconds)) return '–';
  const s = Math.round(totalSeconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function normalisePosition(value) {
  const text = String(value ?? '').toLowerCase();
  if (text.includes('cent')) return 'centre';
  if (text.includes('rope')) return 'ropes';
  if (text.includes('corner')) return 'corner';
  if (text.includes('mix')) return 'mixed';
  return '';
}

export function positionLabel(value, long = false) {
  const match = POSITIONS.find((p) => p.value === value) ?? POSITIONS[0];
  return long ? match.long : match.label;
}

export function pct(value) {
  return value === null || value === undefined ? '–' : `${Math.round(value * 100)}%`;
}

export function computeRound(raw = {}, index = 0) {
  const duration = parseDuration(raw.duration) ?? 180;
  const minutes = duration / 60;
  const thrown = toNumber(raw.thrown);
  const head = toNumber(raw.head) ?? 0;
  const body = toNumber(raw.body) ?? 0;
  const landed = head + body;
  const missedInput = toNumber(raw.missed);
  const missed = missedInput ?? (thrown !== null ? Math.max(thrown - landed, 0) : null);
  const avgHr = toNumber(raw.avgHr);
  const maxHr = toNumber(raw.maxHr);
  const breaths = toNumber(raw.breaths);
  const defence = toNumber(raw.defence);
  const valid = thrown !== null && thrown > 0;

  return {
    round: index + 1,
    valid,
    duration,
    minutes,
    thrown,
    head,
    body,
    landed,
    missed,
    missedIsEstimate: missedInput === null,
    landedExceedsThrown: valid && landed > thrown,
    accuracy: valid ? Math.min(landed / thrown, 1) : null,
    output: valid && minutes > 0 ? thrown / minutes : null,
    bodyShare: landed > 0 ? body / landed : null,
    avgHr,
    maxHr,
    breaths,
    defence,
    defencePerMin: defence !== null && minutes > 0 ? defence / minutes : null,
    // Total heartbeats in the round divided by punches that landed.
    // A rough "energy price" of each scoring shot: lower is more efficient.
    beatsPerLanded: avgHr !== null && landed > 0 ? (avgHr * minutes) / landed : null,
    position: normalisePosition(raw.position),
  };
}

const sum = (list, key) => list.reduce((total, r) => total + (r[key] ?? 0), 0);

function average(list, key) {
  const values = list.filter((r) => r[key] !== null && r[key] !== undefined);
  return values.length ? sum(values, key) / values.length : null;
}

function punchRate(list) {
  const minutes = sum(list, 'minutes');
  return minutes > 0 ? sum(list, 'thrown') / minutes : null;
}

function accuracyOf(list) {
  const thrown = sum(list, 'thrown');
  return thrown > 0 ? sum(list, 'landed') / thrown : null;
}

function beatsPerLandedOf(list) {
  const withHr = list.filter((r) => r.avgHr !== null && r.landed > 0);
  const landed = sum(withHr, 'landed');
  if (!landed) return null;
  return withHr.reduce((total, r) => total + r.avgHr * r.minutes, 0) / landed;
}

function defencePerMinOf(list) {
  const tracked = list.filter((r) => r.defence !== null);
  const minutes = sum(tracked, 'minutes');
  return tracked.length && minutes > 0 ? sum(tracked, 'defence') / minutes : null;
}

function spanLabel(list) {
  if (!list.length) return '';
  const first = list[0].round;
  const last = list[list.length - 1].round;
  return first === last ? `round ${first}` : `rounds ${first}–${last}`;
}

function phase(list) {
  return {
    label: spanLabel(list),
    output: punchRate(list),
    accuracy: accuracyOf(list),
    beatsPerLanded: beatsPerLandedOf(list),
    defencePerMin: defencePerMinOf(list),
    breaths: average(list, 'breaths'),
  };
}

export function computeSummary(computedRounds) {
  const valid = computedRounds.filter((r) => r.valid);
  if (!valid.length) return null;

  const minutes = sum(valid, 'minutes');
  const thrown = sum(valid, 'thrown');
  const landed = sum(valid, 'landed');
  const body = sum(valid, 'body');
  const withHr = valid.filter((r) => r.avgHr !== null);
  const peaks = valid.map((r) => r.maxHr ?? r.avgHr).filter((v) => v !== null);
  const tracked = valid.filter((r) => r.defence !== null);

  // Compare the first half of the session with the second half.
  // With an odd number of rounds the middle round is left out of both.
  const half = Math.floor(valid.length / 2);
  const early = phase(valid.slice(0, half));
  const late = phase(half ? valid.slice(valid.length - half) : []);

  const outputChange =
    half && early.output && late.output !== null ? (late.output - early.output) / early.output : null;
  const accuracyChange =
    half && early.accuracy !== null && late.accuracy !== null ? late.accuracy - early.accuracy : null;

  const best = valid.reduce((top, r) => {
    if (!top) return r;
    if (r.landed > top.landed) return r;
    if (r.landed === top.landed && (r.accuracy ?? 0) > (top.accuracy ?? 0)) return r;
    return top;
  }, null);

  return {
    rounds: valid.length,
    minutes,
    thrown,
    landed,
    head: sum(valid, 'head'),
    body,
    missed: sum(valid, 'missed'),
    accuracy: thrown > 0 ? landed / thrown : null,
    output: minutes > 0 ? thrown / minutes : null,
    bodyShare: landed > 0 ? body / landed : null,
    avgHr: average(valid, 'avgHr'),
    peakHr: peaks.length ? Math.max(...peaks) : null,
    breaths: average(valid, 'breaths'),
    defence: tracked.length ? sum(tracked, 'defence') : null,
    defencePerMin: defencePerMinOf(valid),
    beatsPerLanded: beatsPerLandedOf(valid),
    early,
    late,
    hasSplit: half > 0,
    outputChange,
    accuracyChange,
    hrDrift: withHr.length >= 2 ? withHr[withHr.length - 1].avgHr - withHr[0].avgHr : null,
    pushedBack: valid.filter((r) => r.position === 'ropes' || r.position === 'corner').map((r) => r.round),
    bestRound: best?.round ?? null,
    issues: valid
      .filter((r) => r.landedExceedsThrown)
      .map((r) => `Round ${r.round}: landed (${r.landed}) is more than thrown (${r.thrown}).`),
  };
}
