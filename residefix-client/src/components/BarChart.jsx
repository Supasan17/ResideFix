import { label } from '../utils/constants.js';

/**
 * Horizontal bar chart built from plain HTML so it needs no chart library,
 * scales to any width and is readable by screen readers (each bar has its value as text).
 *
 * data: { key: number } ; colors: optional { key: cssColor }
 */
export default function BarChart({ title, data = {}, colors = {} }) {
  const entries = Object.entries(data);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  const total = entries.reduce((sum, [, v]) => sum + v, 0);

  return (
    <figure className="chart">
      <figcaption>{title}</figcaption>
      {total === 0 ? (
        <p className="hint">No data yet.</p>
      ) : (
        <ul>
          {entries.map(([key, value]) => (
            <li key={key}>
              <span className="chart-label">{label(key)}</span>
              <span className="chart-track">
                <span
                  className="chart-bar"
                  style={{ width: `${(value / max) * 100}%`, background: colors[key] }}
                />
              </span>
              <span className="chart-value">{value}</span>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}

/** Column chart for a daily series: [{ date: 'YYYY-MM-DD', count }]. Missing days are filled with 0. */
export function TrendChart({ title, series = [], days = 14 }) {
  const byDate = Object.fromEntries(series.map((d) => [d.date, d.count]));
  const points = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const key = d.toISOString().slice(0, 10);
    return { key, day: d.getDate(), count: byDate[key] || 0 };
  });
  const max = Math.max(1, ...points.map((p) => p.count));

  return (
    <figure className="chart trend">
      <figcaption>{title}</figcaption>
      <div className="columns">
        {points.map((p) => (
          <div key={p.key} className="column" title={`${p.key}: ${p.count}`}>
            <span className="column-value">{p.count || ''}</span>
            <span className="column-bar" style={{ height: `${(p.count / max) * 100}%` }} />
            <span className="column-label">{p.day}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}
