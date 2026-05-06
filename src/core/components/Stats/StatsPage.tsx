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
  const handsHistory = useQuery(
    api.users.stats.getUserHandsHistory,
    user ? { userId: user._id, limit: 100 } : "skip"
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

          <section className="bg-white rounded-lg shadow p-4 sm:p-6 text-gray-900">
            <h2 className="text-lg font-semibold mb-3">
              Mains jouées ({handsHistory?.length ?? 0})
            </h2>
            {handsHistory === undefined && (
              <div className="text-sm text-gray-500">Chargement…</div>
            )}
            {handsHistory && handsHistory.length === 0 && (
              <div className="text-sm text-gray-500">
                Aucune main jouée pour l&apos;instant.
              </div>
            )}
            {handsHistory && handsHistory.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-gray-500 border-b border-gray-200">
                      <th className="py-2 pr-2">Date</th>
                      <th className="py-2 pr-2">Table</th>
                      <th className="py-2 pr-2">Main</th>
                      <th className="py-2 pr-2">Action finale</th>
                      <th className="py-2 pr-2">Résultat</th>
                      <th className="py-2 pr-2 text-right">Gain</th>
                    </tr>
                  </thead>
                  <tbody>
                    {handsHistory.map((h) => (
                      <tr
                        key={`${h.tableId}-${h.handNumber}`}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-2 pr-2 text-gray-600">
                          {new Date(h.endTs).toLocaleString()}
                        </td>
                        <td className="py-2 pr-2 truncate max-w-[160px]">
                          {h.tableName}
                          {h.gameType === "tournament" && (
                            <span className="ml-1 text-xs text-purple-700">[T]</span>
                          )}
                        </td>
                        <td className="py-2 pr-2 text-gray-600">#{h.handNumber}</td>
                        <td className="py-2 pr-2 capitalize text-gray-700">
                          {h.finalAction ?? "—"}
                        </td>
                        <td className="py-2 pr-2">
                          {h.won ? (
                            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                              Gagnée
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                              Perdue
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-2 text-right font-medium">
                          {h.won ? (
                            <span className="text-green-700">
                              +{h.amountWon.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="bg-white rounded-lg shadow p-4 sm:p-6 text-sm text-gray-600">
            <h2 className="text-base font-semibold text-gray-900 mb-2">
              Données brutes &amp; IA
            </h2>
            <p>
              L&apos;export JSON ci-dessus contient toutes les statistiques agrégées.
              L&apos;historique main-par-main ci-dessus servira de base à l&apos;analyse /
              entraînement IA — graphiques et filtres viendront enrichir cette page.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};
