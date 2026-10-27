'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_META,
  EMPTY_ROUND,
  MAX_ROUNDS,
  SESSION_TYPES,
  STANCES,
  computeRound,
  computeSummary,
  isLiveOpponent,
} from '../lib/metrics.js';
import { buildInsights } from '../lib/insights.js';
import { roundsFromCsv, roundsToCsv } from '../lib/csv.js';
import { SAMPLE_META, SAMPLE_ROUNDS } from '../lib/sample.js';
import Scorecard from './Scorecard.jsx';
import Insights from './Insights.jsx';
import Coach from './Coach.jsx';
import Charts from './Charts.jsx';

const STORAGE_KEY = 'ringcraft:session:v1';
const blankRounds = () => Array.from({ length: 3 }, () => ({ ...EMPTY_ROUND }));

export default function RingcraftApp() {
  const [meta, setMeta] = useState(SAMPLE_META);
  const [rounds, setRounds] = useState(SAMPLE_ROUNDS);
  const [isSample, setIsSample] = useState(true);
  const [notice, setNotice] = useState(null);
  const [restored, setRestored] = useState(false);
  const fileInput = useRef(null);

  // Bring back the last session from this browser.
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && Array.isArray(saved.rounds) && saved.rounds.length) {
        setMeta({ ...DEFAULT_META, ...saved.meta });
        setRounds(saved.rounds.slice(0, MAX_ROUNDS).map((r) => ({ ...EMPTY_ROUND, ...r })));
        setIsSample(Boolean(saved.isSample));
      }
    } catch {
      // Storage unavailable or corrupt: start from the sample.
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ meta, rounds, isSample }));
    } catch {
      // Private browsing or full storage: the session still works, it just will not persist.
    }
  }, [meta, rounds, isSample, restored]);

  const computed = useMemo(() => rounds.map(computeRound), [rounds]);
  const summary = useMemo(() => computeSummary(computed), [computed]);
  const insights = useMemo(() => buildInsights(summary, meta), [summary, meta]);
  const dataKey = useMemo(() => JSON.stringify({ meta, rounds }), [meta, rounds]);
  const live = isLiveOpponent(meta.sessionType);

  const edited = () => {
    setIsSample(false);
    setNotice(null);
  };

  function updateMeta(key, value) {
    setMeta((m) => ({ ...m, [key]: value }));
    edited();
  }

  function updateRound(index, key, value) {
    setRounds((rs) => rs.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
    edited();
  }

  function addRound() {
    setRounds((rs) => [...rs, { ...EMPTY_ROUND, duration: rs[rs.length - 1]?.duration || EMPTY_ROUND.duration }]);
    edited();
  }

  function removeRound(index) {
    setRounds((rs) => rs.filter((_, i) => i !== index));
    edited();
  }

  function loadSample() {
    setMeta(SAMPLE_META);
    setRounds(SAMPLE_ROUNDS);
    setIsSample(true);
    setNotice(null);
  }

  function clearSession() {
    setMeta({ ...DEFAULT_META, sessionType: meta.sessionType, stance: meta.stance });
    setRounds(blankRounds());
    setIsSample(false);
    setNotice({ tone: 'info', text: 'Session cleared. Fill in the scorecard round by round, or import a CSV.' });
  }

  async function importCsv(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const { rounds: imported, matched, truncated } = roundsFromCsv(await file.text());
      setRounds(imported);
      setIsSample(false);
      setNotice({
        tone: 'info',
        text: `Imported ${imported.length} round${imported.length === 1 ? '' : 's'} from ${file.name}. Read ${matched.length} of 10 columns${truncated ? `; only the first ${MAX_ROUNDS} rounds were kept` : ''}.`,
      });
    } catch (err) {
      setNotice({ tone: 'error', text: err.message });
    }
  }

  function downloadTemplate() {
    const blob = new Blob([roundsToCsv(SAMPLE_ROUNDS)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ringcraft-template.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page">
      <header className="masthead">
        <a className="wordmark" href="/">
          Ringcraft
        </a>
        <div className="actions">
          <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
            Import CSV
          </button>
          <button type="button" className="btn" onClick={downloadTemplate}>
            Download template
          </button>
          {!isSample && (
            <button type="button" className="btn btn-quiet" onClick={loadSample}>
              Load sample
            </button>
          )}
          <input ref={fileInput} type="file" accept=".csv,text/csv" onChange={importCsv} hidden />
        </div>
      </header>

      <main>
        <section className="intro">
          <h1>Score your training, round by round.</h1>
          <p>
            Log what you threw, what landed and how hard your heart worked, or import a CSV from your tracker.
            Ringcraft shows where your energy went and what to fix next session.
          </p>
        </section>

        {isSample && (
          <p className="sample-note">
            This is a sample heavyweight sparring session.{' '}
            <button type="button" className="link" onClick={clearSession}>
              Clear it
            </button>{' '}
            to log your own.
          </p>
        )}
        {notice && (
          <p className={`notice notice-${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>
            {notice.text}
          </p>
        )}

        <section aria-labelledby="session-heading">
          <h2 id="session-heading">Session</h2>
          <div className="fields">
            <div className="field">
              <label htmlFor="sessionType">Type</label>
              <select id="sessionType" value={meta.sessionType} onChange={(e) => updateMeta('sessionType', e.target.value)}>
                {SESSION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="stance">Stance</label>
              <select id="stance" value={meta.stance} onChange={(e) => updateMeta('stance', e.target.value)}>
                {STANCES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="weightClass">Weight class</label>
              <input
                id="weightClass"
                value={meta.weightClass}
                placeholder="e.g. Heavyweight"
                onChange={(e) => updateMeta('weightClass', e.target.value.slice(0, 40))}
              />
            </div>
            <div className="field">
              <label htmlFor="restSec">Rest between rounds (seconds)</label>
              <input
                id="restSec"
                inputMode="numeric"
                value={meta.restSec}
                onChange={(e) => updateMeta('restSec', e.target.value.replace(/\D/g, '').slice(0, 3))}
              />
            </div>
            <div className="field wide">
              <label htmlFor="goal">Goal for this session</label>
              <input
                id="goal"
                value={meta.goal}
                placeholder="e.g. Work the body more"
                onChange={(e) => updateMeta('goal', e.target.value.slice(0, 160))}
              />
            </div>
            {live && (
              <div className="field wide">
                <label htmlFor="opponent">Opponent or partner</label>
                <input
                  id="opponent"
                  value={meta.opponent}
                  placeholder="e.g. Taller southpaw who counters"
                  onChange={(e) => updateMeta('opponent', e.target.value.slice(0, 160))}
                />
              </div>
            )}
          </div>
        </section>

        <section aria-labelledby="scorecard-heading">
          <div className="section-head">
            <h2 id="scorecard-heading">Scorecard</h2>
            <button type="button" className="btn" onClick={addRound} disabled={rounds.length >= MAX_ROUNDS}>
              Add round
            </button>
          </div>
          <Scorecard rounds={rounds} computed={computed} summary={summary} onChange={updateRound} onRemove={removeRound} />
          <p className="hint">
            Missed fills in from thrown minus landed if you leave it blank. Round time takes 3:00 or seconds.
          </p>
          {summary?.issues.map((issue) => (
            <p key={issue} className="notice notice-error">
              Check {issue.charAt(0).toLowerCase() + issue.slice(1)}
            </p>
          ))}
        </section>

        <div className="analysis">
          <section aria-labelledby="read-heading">
            <h2 id="read-heading">Quick read</h2>
            <Insights insights={insights} summary={summary} sessionType={meta.sessionType} />
          </section>
          <section aria-labelledby="coach-heading">
            <h2 id="coach-heading">AI coach</h2>
            <Coach meta={meta} rounds={rounds} ready={Boolean(summary)} dataKey={dataKey} />
          </section>
        </div>

        <section aria-labelledby="charts-heading">
          <h2 id="charts-heading">Round by round</h2>
          <Charts computed={computed} />
        </section>
      </main>

      <footer className="footer">
        Built with Next.js and the AI SDK, running on Vercel. Your sessions stay in this browser.
      </footer>
    </div>
  );
}
