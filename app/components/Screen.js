'use client';

const PLACEHOLDER_ON = '/img/placeholder-on.svg';
const PLACEHOLDER_OFF = '/img/placeholder-off.svg';

export default function Screen({ drinkState }) {
  const src = drinkState ? PLACEHOLDER_ON : PLACEHOLDER_OFF;

  return (
    <div className="screen">
      <img className="screen-img" src={src} alt={drinkState ? 'Drinking' : 'Not drinking'} />
    </div>
  );
}
