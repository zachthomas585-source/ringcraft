const W = 320;
const H = 190;
const PAD = { l: 30, r: 10, t: 16, b: 24 };
const IW = W - PAD.l - PAD.r;
const IH = H - PAD.t - PAD.b;

function niceMax(value) {
  if (!value || value <= 0) return 10;
  const step = value <= 20 ? 5 : value <= 60 ? 10 : value <= 150 ? 25 : 50;
  return Math.ceil(value / step) * step;
}

function Grid({ min = 0, max }) {
  const ticks = [min, (min + max) / 2, max];
  const y = (v) => PAD.t + IH - ((v - min) / (max - min)) * IH;
  return (
    <g className="grid">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} />
          <text x={PAD.l - 6} y={y(v) + 3.5} textAnchor="end">
            {Math.round(v)}
          </text>
        </g>
      ))}
    </g>
  );
}

function RoundLabels({ rounds, slot }) {
  return rounds.map((r, i) => (
    <text key={r.round} className="xlabel" x={PAD.l + slot * i + slot / 2} y={H - 6} textAnchor="middle">
      {r.round}
    </text>
  ));
}

function PunchChart({ rounds }) {
  const max = niceMax(Math.max(...rounds.map((r) => Math.max(r.thrown ?? 0, r.landed + (r.missed ?? 0)))));
  const slot = IW / rounds.length;
  const bw = Math.min(26, slot * 0.62);
  const h = (v) => (v / max) * IH;

  return (
    <figure className="chart">
      <figcaption>
        <h3>Punches by round</h3>
        <p>What landed, where, and what missed.</p>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Stacked bars of punches landed to the head, to the body and missed in each round">
        <Grid max={max} />
        {rounds.map((r, i) => {
          const x = PAD.l + slot * i + (slot - bw) / 2;
          let base = PAD.t + IH;
          const segments = [
            ['bar-head', r.head],
            ['bar-body', r.body],
            ['bar-missed', r.missed ?? 0],
          ];
          return (
            <g key={r.round}>
              {segments.map(([cls, value]) => {
                if (!value) return null;
                const height = h(value);
                base -= height;
                return <rect key={cls} className={cls} x={x} y={base} width={bw} height={height} rx="1.5" />;
              })}
            </g>
          );
        })}
        <RoundLabels rounds={rounds} slot={slot} />
      </svg>
      <div className="legend">
        <span style={{ '--c': 'var(--red)' }}>Head</span>
        <span style={{ '--c': 'var(--gold)' }}>Body</span>
        <span style={{ '--c': 'var(--missed)' }}>Missed</span>
      </div>
    </figure>
  );
}

function linePath(points) {
  let d = '';
  let pen = false;
  for (const p of points) {
    if (p === null) {
      pen = false;
      continue;
    }
    d += `${pen ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)} `;
    pen = true;
  }
  return d.trim();
}

function HeartChart({ rounds }) {
  const withHr = rounds.filter((r) => r.avgHr !== null);
  if (!withHr.length) {
    return (
      <figure className="chart">
        <figcaption>
          <h3>Heart rate by round</h3>
          <p>Add heart rate to the scorecard to see how hard each round worked you.</p>
        </figcaption>
      </figure>
    );
  }

  const highs = rounds.map((r) => r.maxHr ?? r.avgHr).filter((v) => v !== null);
  const min = Math.floor((Math.min(...withHr.map((r) => r.avgHr)) - 8) / 10) * 10;
  const max = Math.ceil((Math.max(...highs) + 4) / 10) * 10;
  const slot = IW / rounds.length;
  const x = (i) => PAD.l + slot * i + slot / 2;
  const y = (v) => PAD.t + IH - ((v - min) / (max - min)) * IH;
  const avg = rounds.map((r, i) => (r.avgHr === null ? null : [x(i), y(r.avgHr)]));
  const peak = rounds.map((r, i) => (r.maxHr === null ? null : [x(i), y(r.maxHr)]));
  const labelAll = rounds.length <= 8;

  return (
    <figure className="chart">
      <figcaption>
        <h3>Heart rate by round</h3>
        <p>Watch for a line that keeps climbing despite the rest.</p>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Average and maximum heart rate in each round">
        <Grid min={min} max={max} />
        <path className="line-max" d={linePath(peak)} />
        <path className="line-avg" d={linePath(avg)} />
        {rounds.map((r, i) =>
          r.avgHr === null ? null : (
            <g key={r.round}>
              <circle className="dot-avg" cx={x(i)} cy={y(r.avgHr)} r="3.5" />
              {(labelAll || i === 0 || i === rounds.length - 1) && (
                <text className="value" x={x(i)} y={y(r.avgHr) + 14} textAnchor="middle">
                  {r.avgHr}
                </text>
              )}
            </g>
          ),
        )}
        <RoundLabels rounds={rounds} slot={slot} />
      </svg>
      <div className="legend">
        <span style={{ '--c': 'var(--blue)' }}>Average</span>
        <span className="dashed" style={{ '--c': 'var(--blue)' }}>
          Max
        </span>
      </div>
    </figure>
  );
}

function CostChart({ rounds }) {
  const tracked = rounds.filter((r) => r.beatsPerLanded !== null);
  if (!tracked.length) {
    return (
      <figure className="chart">
        <figcaption>
          <h3>Heartbeats per landed punch</h3>
          <p>Needs heart rate and at least one landed punch.</p>
        </figcaption>
      </figure>
    );
  }

  const max = niceMax(Math.max(...tracked.map((r) => r.beatsPerLanded)));
  const slot = IW / rounds.length;
  const bw = Math.min(26, slot * 0.62);
  const h = (v) => (v / max) * IH;

  return (
    <figure className="chart">
      <figcaption>
        <h3>Heartbeats per landed punch</h3>
        <p>The energy price of each scoring shot. Lower is better.</p>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Heartbeats spent for each landed punch, by round">
        <Grid max={max} />
        {rounds.map((r, i) => {
          if (r.beatsPerLanded === null) return null;
          const x = PAD.l + slot * i + (slot - bw) / 2;
          const height = h(r.beatsPerLanded);
          const top = PAD.t + IH - height;
          return (
            <g key={r.round}>
              <rect className="bar-cost" x={x} y={top} width={bw} height={height} rx="1.5" />
              <text className="value" x={x + bw / 2} y={top - 4} textAnchor="middle">
                {Math.round(r.beatsPerLanded)}
              </text>
            </g>
          );
        })}
        <RoundLabels rounds={rounds} slot={slot} />
      </svg>
    </figure>
  );
}

export default function Charts({ computed }) {
  const rounds = computed.filter((r) => r.valid);
  if (!rounds.length) {
    return <p className="empty">Charts appear once a round has punches thrown.</p>;
  }
  return (
    <div className="charts">
      <PunchChart rounds={rounds} />
      <HeartChart rounds={rounds} />
      <CostChart rounds={rounds} />
    </div>
  );
}
