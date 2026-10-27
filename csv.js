import { EMPTY_ROUND, MAX_ROUNDS, DEFAULT_DURATION, normalisePosition } from './metrics.js';

// Different trackers name their columns differently. Each field accepts
// several header names; add more here when you meet a new export format.
const ALIASES = {
  duration: ['duration', 'duration_sec', 'round_time', 'round_length', 'time', 'seconds'],
  thrown: ['thrown', 'punches_thrown', 'total_punches', 'punches', 'total_thrown'],
  head: ['landed_head', 'head', 'head_landed', 'head_shots'],
  body: ['landed_body', 'body', 'body_landed', 'body_shots'],
  missed: ['missed', 'punches_missed', 'misses'],
  avgHr: ['avg_hr', 'average_hr', 'avg_heart_rate', 'average_heart_rate', 'heart_rate_avg', 'hr_avg', 'heart_rate', 'hr'],
  maxHr: ['max_hr', 'max_heart_rate', 'peak_hr', 'hr_max'],
  breaths: ['breaths_per_min', 'breathing_rate', 'breaths', 'respiration_rate', 'resp_rate'],
  defence: ['defensive_moves', 'slips_and_dodges', 'slips', 'dodges', 'defence', 'defense'],
  position: ['ring_position', 'position', 'ring'],
};

const TEMPLATE_HEADERS = [
  ['round', null],
  ['duration', 'duration'],
  ['thrown', 'thrown'],
  ['landed_head', 'head'],
  ['landed_body', 'body'],
  ['missed', 'missed'],
  ['avg_hr', 'avgHr'],
  ['max_hr', 'maxHr'],
  ['breaths_per_min', 'breaths'],
  ['defensive_moves', 'defence'],
  ['ring_position', 'position'],
];

function normaliseHeader(header) {
  return String(header)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function parseCsv(text) {
  const source = String(text).replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (inQuotes) {
      if (c === '"' && source[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && source[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

export function roundsFromCsv(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) {
    throw new Error('That file needs a header row and at least one round below it.');
  }

  const headers = rows[0].map(normaliseHeader);
  const columns = {};
  for (const [field, names] of Object.entries(ALIASES)) {
    const index = names.map((name) => headers.indexOf(name)).find((i) => i !== -1);
    if (index !== undefined) columns[field] = index;
  }

  if (columns.thrown === undefined) {
    throw new Error('No "thrown" column found. Download the template to see the column names Ringcraft reads.');
  }

  const rounds = rows.slice(1, MAX_ROUNDS + 1).map((cells) => {
    const round = { ...EMPTY_ROUND };
    for (const [field, index] of Object.entries(columns)) {
      round[field] = String(cells[index] ?? '').trim();
    }
    round.duration = round.duration || DEFAULT_DURATION;
    round.position = normalisePosition(round.position);
    return round;
  });

  return {
    rounds,
    matched: Object.keys(columns),
    truncated: rows.length - 1 > MAX_ROUNDS,
  };
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function roundsToCsv(rounds) {
  const lines = [TEMPLATE_HEADERS.map(([header]) => header).join(',')];
  rounds.forEach((round, i) => {
    lines.push(
      TEMPLATE_HEADERS.map(([, field]) => csvCell(field ? round[field] : i + 1)).join(','),
    );
  });
  return `${lines.join('\n')}\n`;
}
