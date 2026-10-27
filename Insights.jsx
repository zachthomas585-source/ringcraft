import { isLiveOpponent } from '../lib/metrics.js';

const TAGS = { fix: 'Fix first', watch: 'Watch', good: 'Working' };

export default function Insights({ insights, summary, sessionType }) {
  if (!summary) {
    return <p className="empty">Fill in punches thrown for at least one round and the quick read appears here.</p>;
  }

  if (!insights.length) {
    return (
      <p className="empty">
        Nothing stands out yet.{' '}
        {summary.hasSplit
          ? 'Add heart rate and slips to the scorecard to get more from the quick read.'
          : 'Log a second round so Ringcraft can compare early and late in the session.'}
      </p>
    );
  }

  return (
    <>
      <ul className="insights">
        {insights.map((note) => (
          <li key={note.title} className={`insight tone-${note.tone}`}>
            <span className="tag">{TAGS[note.tone]}</span>
            <h3>{note.title}</h3>
            <p>{note.body}</p>
          </li>
        ))}
      </ul>
      {!isLiveOpponent(sessionType) && (
        <p className="hint">Accuracy, shot selection and ring position are only judged for sparring and fights.</p>
      )}
    </>
  );
}
