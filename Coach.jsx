import { useState } from 'react';

// Tiny renderer for the coach's markdown: headings, bullet lists and bold.
function inline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function renderAdvice(text) {
  const blocks = [];
  let list = null;
  const flush = () => {
    if (list) blocks.push(list);
    list = null;
  };

  for (const raw of text.replace(/\r/g, '').split('\n')) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (heading) {
      flush();
      blocks.push({ type: 'heading', text: heading[1] });
      continue;
    }
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      if (!list || list.ordered !== ordered) {
        flush();
        list = { type: 'list', ordered, items: [] };
      }
      list.items.push((bullet || numbered)[1]);
      continue;
    }
    flush();
    blocks.push({ type: 'paragraph', text: line });
  }
  flush();

  return blocks.map((block, i) => {
    if (block.type === 'heading') return <h4 key={i}>{inline(block.text)}</h4>;
    if (block.type === 'paragraph') return <p key={i}>{inline(block.text)}</p>;
    const Tag = block.ordered ? 'ol' : 'ul';
    return (
      <Tag key={i}>
        {block.items.map((item, j) => (
          <li key={j}>{inline(item)}</li>
        ))}
      </Tag>
    );
  });
}

export default function Coach({ meta, rounds, ready, dataKey }) {
  const [status, setStatus] = useState('idle');
  const [advice, setAdvice] = useState('');
  const [adviceKey, setAdviceKey] = useState('');
  const [error, setError] = useState('');

  async function getCoaching() {
    setStatus('loading');
    setError('');
    try {
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meta, rounds }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.advice) {
        throw new Error(data.error || `The coach returned an error (${response.status}).`);
      }
      setAdvice(data.advice);
      setAdviceKey(dataKey);
      setStatus('done');
    } catch (err) {
      setError(err.message || 'The coach could not be reached. Check your connection and try again.');
      setStatus('error');
    }
  }

  const stale = advice && adviceKey !== dataKey;
  const loading = status === 'loading';

  return (
    <div className="coach-panel">
      {!advice && (
        <p className="coach-intro">
          An AI coach reads every round and writes you a verdict, what to fix first, punch selection, pacing and a
          plan for your next session.
        </p>
      )}

      <div className="coach-actions">
        <button type="button" className="btn btn-primary" onClick={getCoaching} disabled={!ready || loading} aria-busy={loading}>
          {loading ? 'Reading your rounds…' : advice ? 'Get coaching again' : 'Get coaching'}
        </button>
        {!ready && <span className="hint">Log at least one round with punches thrown first.</span>}
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {stale && <p className="stale">Your rounds changed since this coaching. Get coaching again to update it.</p>}

      {advice && (
        <div className="advice" aria-live="polite">
          {renderAdvice(advice)}
        </div>
      )}
    </div>
  );
}
