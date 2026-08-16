'use client';

export default function PixelSprite({
  spriteSheetSrc,
  frameWidth,
  frameHeight,
  frames = 2,
  fps = 2,
  scale = 3,
  label,
}) {
  const scaledWidth = frameWidth * scale;
  const scaledHeight = frameHeight * scale;
  const duration = frames / fps;

  return (
    <div className="pixel-sprite-wrapper">
      <div
        className="pixel-sprite"
        style={{
          width: `${scaledWidth}px`,
          height: `${scaledHeight}px`,
          backgroundImage: `url(${spriteSheetSrc})`,
          backgroundSize: `${scaledWidth * frames}px ${scaledHeight}px`,
          animationDuration: `${duration}s`,
          animationTimingFunction: `steps(${frames})`,
        }}
      />
      {label && <span className="pixel-sprite-label">{label}</span>}
    </div>
  );
}
