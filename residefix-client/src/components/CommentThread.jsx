import { useState } from 'react';
import { label } from '../utils/constants.js';
import { timeAgo } from '../utils/format.js';

/**
 * Conversation between the resident and property staff.
 * `onSubmit(text)` must return a promise; the box clears when it resolves.
 */
export default function CommentThread({ comments = [], currentUserId, onSubmit, disabled }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) {
      setError('Write a message first');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onSubmit(text.trim());
      setText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="thread">
      {comments.length === 0 ? (
        <p className="hint">No messages yet. Ask a question or add more details below.</p>
      ) : (
        <ul className="messages">
          {comments.map((c) => {
            const mine = String(c.author?._id) === String(currentUserId);
            return (
              <li key={c._id} className={mine ? 'mine' : ''}>
                <div className="msg-head">
                  <b>{c.author?.name || 'Deleted user'}</b>
                  {c.author?.role && c.author.role !== 'resident' && (
                    <span className="role-chip">{label(c.author.role)}</span>
                  )}
                  <time dateTime={c.createdAt}>{timeAgo(c.createdAt)}</time>
                </div>
                <p>{c.text}</p>
              </li>
            );
          })}
        </ul>
      )}
      {!disabled && (
        <form className="reply" onSubmit={submit} noValidate>
          <label htmlFor="comment-text" className="sr-only">
            Message
          </label>
          <textarea
            id="comment-text"
            rows={2}
            maxLength={1000}
            placeholder="Write a message"
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-invalid={Boolean(error)}
          />
          {error && <p className="field-error">{error}</p>}
          <button className="btn small" disabled={busy}>
            {busy ? 'Sending…' : 'Send'}
          </button>
        </form>
      )}
    </div>
  );
}
