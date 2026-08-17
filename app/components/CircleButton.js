'use client';

export default function CircleButton({ onClick }) {
  return (
    <button className="refresher-btn" onClick={onClick}>
      <img
        src="/img/refresher-btn.svg"
        alt="Add drink"
        className="refresher-img"
        draggable={false}
      />
    </button>
  );
}
