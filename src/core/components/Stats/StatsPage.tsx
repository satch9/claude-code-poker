import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "../../hooks/useAuth";
import { PlayerStats } from "./PlayerStats";
import { Button } from "../UI/Button";

interface StatsPageProps {
  onBack: () => void;
}

// Page dédiée /stats : agrège PlayerStats (carrière) + un export brut
// orienté IA (JSON des actions filtrées par user) à venir. Conçu pour pouvoir
// grandir avec graphiques et filtres.
export const StatsPage: React.FC<StatsPageProps> = ({ onBack }) => {
  const { user } = useAuth();

  // On récupère les stats détaillées pour l'export. Le composant PlayerStats
  // les requête déjà — ici on duplique pour avoir la donnée à exporter.
  const detailedStats = useQuery(
    api.users.stats.getUserStats,
    user ? { userId: user._id } : "skip"
  );

  if (!user) return null;

  const handleExportJson = () => {
    if (!detailedStats) return;
    const payload = {
      exportedAt: new Date().toISOString(),
      userId: user._id,
      userName: user.name,
      stats: detailedStats,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `poker-stats-${user.name}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-poker-green-50 to-poker-green-100">
      <header className="bg-poker-green-100 backdrop-blur-sm border-b border-poker-green-300 sticky top-0 z-10">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex justify-between items-center gap-2">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
              📊 Mes statistiques
            </h1>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handleExportJson}>
                Exporter JSON
              </Button>
              <Button variant="secondary" size="sm" onClick={onBack}>
                Retour
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <PlayerStats userId={user._id} showDetailed />

          <section className="bg-white rounded-lg shadow p-4 sm:p-6 text-sm text-gray-600">
            <h2 className="text-base font-semibold text-gray-900 mb-2">
              Données brutes &amp; IA
            </h2>
            <p>
              L&apos;export JSON ci-dessus contient toutes les statistiques agrégées
              (parties, victoires, breakdowns d&apos;actions, taux, gains). À terme cette
              page accueillera l&apos;historique main-par-main, des graphiques et des
              filtres pour alimenter l&apos;analyse / l&apos;entraînement IA.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};
