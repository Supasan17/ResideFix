import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Home() {
  const { user } = useAuth();
  const primary = user
    ? { to: '/dashboard', text: 'Open your dashboard' }
    : { to: '/signup', text: 'Report a problem' };

  return (
    <section className="hero">
      <h1>The leaking tap gets fixed when someone can see it is still leaking.</h1>
      <p>
        ResideFix gives residents of hostels, apartments and boarding houses one place to report a
        problem, and gives managers one list to work through until every complaint is resolved.
      </p>
      <div className="row start">
        <Link className="btn" to={primary.to}>
          {primary.text}
        </Link>
        {!user && (
          <Link className="ghost big" to="/login">
            I already have an account
          </Link>
        )}
      </div>
      <ul className="how">
        <li>
          <b>Report</b> Describe the issue, pick a category and say how urgent it is.
        </li>
        <li>
          <b>Track</b> Watch it move from open to in progress to resolved, with a full timeline.
        </li>
        <li>
          <b>Talk</b> Comment on the complaint so nobody has to chase anyone by phone.
        </li>
        <li>
          <b>Manage</b> Managers assign work and admins see statistics across every property.
        </li>
      </ul>
    </section>
  );
}
