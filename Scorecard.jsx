import { POSITIONS, formatDuration, pct } from '../lib/metrics.js';

const GROUPS = [
  {
    label: 'Punches',
    rows: [
      { key: 'thrown', label: 'Thrown', total: (s) => s.thrown },
      { key: 'head', label: 'Landed to head', total: (s) => s.head },
      { key: 'body', label: 'Landed to body', total: (s) => s.body },
      { key: 'missed', label: 'Missed', total: (s) => s.missed },
    ],
  },
  {
    label: 'Engine',
    rows: [
      { key: 'avgHr', label: 'Average heart rate', total: (s) => (s.avgHr === null ? '–' : Math.round(s.avgHr)) },
      { key: 'maxHr', label: 'Max heart rate', total: (s) => s.peakHr ?? '–' },
      { key: 'breaths', label: 'Breaths per minute', total: (s) => (s.breaths === null ? '–' : Math.round(s.breaths)) },
    ],
  },
  {
    label: 'Movement',
    rows: [
      { key: 'defence', label: 'Slips and dodges', total: (s) => s.defence ?? '–' },
      { key: 'position', label: 'Where you spent it', type: 'select' },
      { key: 'duration', label: 'Round time', type: 'duration', total: (s) => formatDuration(s.minutes * 60) },
    ],
  },
];

const RESULTS = [
  { key: 'landed', label: 'Landed', className: 'landed', cell: (r) => r.landed, total: (s) => s.landed },
  { key: 'accuracy', label: 'Accuracy', cell: (r) => pct(r.accuracy), total: (s) => pct(s.accuracy) },
  { key: 'output', label: 'Punches per minute', cell: (r) => r.output?.toFixed(1), total: (s) => s.output?.toFixed(1) },
  {
    key: 'cost',
    label: 'Heartbeats per landed punch',
    cell: (r) => (r.beatsPerLanded === null ? '–' : Math.round(r.beatsPerLanded)),
    total: (s) => (s.beatsPerLanded === null ? '–' : Math.round(s.beatsPerLanded)),
  },
];

function sanitise(type, value) {
  if (type === 'duration') return value.replace(/[^\d:]/g, '').slice(0, 5);
  return value.replace(/[^\d.]/g, '').slice(0, 5);
}

export default function Scorecard({ rounds, computed, summary, onChange, onRemove }) {
  const maxLanded = Math.max(1, ...computed.map((r) => (r.valid ? r.landed : 0)));

  return (
    <div className="scorecard-wrap">
      <table className="scorecard">
        <caption className="sr-only">Round-by-round scorecard. Each column is a round.</caption>
        <thead>
          <tr>
            <th scope="col" className="rowhead">
              Round
            </th>
            {rounds.map((_, i) => (
              <th scope="col" key={i} className="round-head">
                <span className="round-number">{i + 1}</span>
                {rounds.length > 1 && (
                  <button type="button" className="remove" onClick={() => onRemove(i)} aria-label={`Remove round ${i + 1}`}>
                    ×
                  </button>
                )}
              </th>
            ))}
            <th scope="col" className="total total-head">
              Total
            </th>
          </tr>
        </thead>

        {GROUPS.map((group) => (
          <tbody key={group.label}>
            <tr className="group">
              <th scope="rowgroup" className="rowhead">
                {group.label}
              </th>
              <td colSpan={rounds.length} />
              <td className="total" />
            </tr>
            {group.rows.map((row) => (
              <tr key={row.key}>
                <th scope="row" className="rowhead">
                  {row.label}
                </th>
                {rounds.map((round, i) => {
                  const label = `Round ${i + 1}, ${row.label.toLowerCase()}`;
                  if (row.type === 'select') {
                    return (
                      <td key={i} className="cell">
                        <select aria-label={label} value={round.position} onChange={(e) => onChange(i, row.key, e.target.value)}>
                          {POSITIONS.map((p) => (
                            <option key={p.value} value={p.value}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  }
                  const c = computed[i];
                  const placeholder =
                    row.key === 'missed' && c.missedIsEstimate && c.missed !== null
                      ? String(c.missed)
                      : row.type === 'duration'
                        ? '3:00'
                        : '';
                  return (
                    <td key={i} className="cell">
                      <input
                        aria-label={label}
                        inputMode={row.type === 'duration' ? 'text' : 'decimal'}
                        autoComplete="off"
                        value={round[row.key]}
                        placeholder={placeholder}
                        onChange={(e) => onChange(i, row.key, sanitise(row.type, e.target.value))}
                      />
                    </td>
                  );
                })}
                <td className="total">{summary && row.total ? row.total(summary) : ''}</td>
              </tr>
            ))}
          </tbody>
        ))}

        <tfoot>
          {RESULTS.map((row) => (
            <tr key={row.key} className={row.className}>
              <th scope="row" className="rowhead">
                {row.label}
              </th>
              {computed.map((r, i) => (
                <td
                  key={i}
                  style={
                    row.key === 'landed' && r.valid
                      ? { '--heat': `${Math.round((r.landed / maxLanded) * 16)}%` }
                      : undefined
                  }
                >
                  {r.valid ? row.cell(r) : '–'}
                </td>
              ))}
              <td className="total">{summary ? row.total(summary) : '–'}</td>
            </tr>
          ))}
        </tfoot>
      </table>
    </div>
  );
}
