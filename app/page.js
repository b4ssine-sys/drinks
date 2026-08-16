'use client';

import CircleButton from './components/CircleButton';

export default function Home() {
  // --- State (to be implemented) ---
  // const [people, setPeople] = useState([]);
  // const [drinks, setDrinks] = useState([]);

  return (
    <div className="container">
      <div className="section section-top">
        <h1 className="title">DRINK TRACKER</h1>
        <p className="subtitle">tap a card to log a drink</p>
        <div className="people-grid">{/* Person cards go here */}</div>
      </div>

      <hr className="divider" />

      <div className="section section-bottom">
        <CircleButton />
      </div>
    </div>
  );
}
