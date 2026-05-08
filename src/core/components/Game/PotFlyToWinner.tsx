import React, { useEffect } from 'react';
import { Chip } from '../UI/Chip';

interface PotFlyToWinnerProps {
  amount: number;
  // Angle (en radians) du centre vers le siège du gagnant, déjà rotaté
  // côté viewer. Récupérable depuis seats[winnerSeat].seatAngle dans
  // PokerTable.
  seatAngle: number;
  isMobile: boolean;
  onAnimationEnd: () => void;
}

// Pile de jetons décorative qui part du centre du tapis et vole vers le
// siège du gagnant pendant le showdown. Réutilise le keyframe
// `chips-push-to-winner` (cf. src/index.css) avec --push-dx / --push-dy
// injectés en CSS variables.
export const PotFlyToWinner: React.FC<PotFlyToWinnerProps> = ({
  amount,
  seatAngle,
  isMobile,
  onAnimationEnd,
}) => {
  // Distance ~= rayon du tapis depuis le centre, calibrée comme la
  // chips-push-to-pot existante mais en sens inverse.
  const dist = isMobile ? 70 : 110;
  const dx = `${Math.cos(seatAngle) * dist}px`;
  const dy = `${Math.sin(seatAngle) * dist}px`;

  useEffect(() => {
    // 900ms = durée du keyframe chipsPushToWinner.
    const timer = setTimeout(onAnimationEnd, 900);
    return () => clearTimeout(timer);
  }, [onAnimationEnd]);

  return (
    <div
      aria-hidden
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-2 chips-push-to-winner z-30"
      style={{
        ['--push-dx' as any]: dx,
        ['--push-dy' as any]: dy,
      }}
    >
      <Chip value={Math.min(amount, 1000)} size={isMobile ? 'sm' : 'md'} />
      <Chip value={Math.min(amount, 500)} size={isMobile ? 'sm' : 'md'} />
      <span className="text-yellow-300 font-bold text-sm bg-black/70 px-2 py-0.5 rounded">
        +{amount.toLocaleString()}
      </span>
    </div>
  );
};
