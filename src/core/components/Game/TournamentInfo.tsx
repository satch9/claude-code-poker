import React, { useEffect, useState } from "react";

interface TournamentInfoProps {
  blindStructure: Array<{ level: number; smallBlind: number; bigBlind: number; duration: number }>;
  currentBlindLevel: number;
  nextBlindIncrease: number;
  prizeStructure: Array<{ position: number; percentage: number }>;
  status: "registering" | "running" | "finished";
  totalPlayers: number;
  remainingPlayers: number;
  buyIn?: number;
}

function formatTime(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export const TournamentInfo: React.FC<TournamentInfoProps> = ({
  blindStructure,
  currentBlindLevel,
  nextBlindIncrease,
  status,
  totalPlayers,
  remainingPlayers,
  buyIn,
}) => {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (status !== "running") return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  if (status === "registering") {
    return (
      <div className="bg-poker-green-900 text-white px-3 py-2 text-sm rounded mb-2">
        Tournoi en attente de joueurs ({remainingPlayers}/{totalPlayers})
      </div>
    );
  }

  const level = blindStructure[currentBlindLevel];
  const remainingMs = nextBlindIncrease - Date.now();
  const prizePool = buyIn ? totalPlayers * buyIn : 0;

  return (
    <div className="bg-poker-green-900 text-white px-2 sm:px-3 py-2 rounded mb-2 flex flex-wrap gap-x-2 sm:gap-x-4 gap-y-1 text-xs sm:text-sm">
      <span>
        Niveau {level?.level ?? "?"} · SB {level?.smallBlind ?? "?"} / BB {level?.bigBlind ?? "?"}
      </span>
      {status === "running" && (
        <span>Prochain niveau dans {formatTime(remainingMs)}</span>
      )}
      <span>
        Joueurs : {remainingPlayers}/{totalPlayers}
      </span>
      {prizePool > 0 && <span>Prize pool : {prizePool} €</span>}
      {status === "finished" && <span className="font-bold">Tournoi terminé</span>}
    </div>
  );
};
