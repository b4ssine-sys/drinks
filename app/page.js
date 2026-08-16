'use client';

import { useState } from 'react';
import Screen from './components/Screen';
import CircleButton from './components/CircleButton';

export default function Home() {
  const [drinkState, setDrinkState] = useState(true);

  return (
    <div className="container">
      <div className="section section-top">
        <Screen drinkState={drinkState} />
      </div>

      <hr className="divider" />

      <div className="section section-bottom">
        <CircleButton onClick={() => setDrinkState(!drinkState)} />
      </div>
    </div>
  );
}
