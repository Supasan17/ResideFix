import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="not-found">
      <p className="big-code">404</p>
      <h1>This page does not exist</h1>
      <p className="hint">The link may be broken, or the page may have moved.</p>
      <Link to="/" className="btn">
        Go to the home page
      </Link>
    </section>
  );
}
