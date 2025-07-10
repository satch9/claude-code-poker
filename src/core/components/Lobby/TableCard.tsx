import React from "react";
import { Button } from "../UI/Button";
import { Table } from "../../../shared/types";
import { cn } from "../../../shared/utils/cn";
import { Id } from "../../../../convex/_generated/dataModel";

interface TableCardProps {
  table: Table;
  onJoin: (tableId: Id<"tables">) => void;
  className?: string;
}

export const TableCard: React.FC<TableCardProps> = ({
  table,
  onJoin,
  className,
}) => {
  const isTableFull = (table.playerCount || 0) >= table.maxPlayers;
  const gameTypeDisplay =
    table.gameType === "tournament" ? "Tournoi" : "Cash Game";
  
  // Determine button state based on table status and user seating
  const canJoin = !isTableFull || table.isUserSeated;
  const buttonText = table.isUserSeated 
    ? "Continuer" 
    : isTableFull 
    ? "Table pleine" 
    : "Rejoindre";
  const buttonVariant = canJoin ? "primary" : "secondary";

  return (
    <div
      className={cn(
        "bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow",
        className
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate max-w-[200px]">
            {table.name}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span
              className={cn(
                "px-2 py-1 rounded-full text-xs font-medium",
                table.gameType === "tournament"
                  ? "bg-purple-100 text-purple-800"
                  : "bg-blue-100 text-blue-800"
              )}
            >
              {gameTypeDisplay}
            </span>
            {table.isPrivate && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                Privée
              </span>
            )}
            {table.gameType === 'tournament' && table.buyIn === 0 && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Freeroll
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm text-gray-500">Joueurs</div>
          <div className="text-lg font-bold text-gray-900">
            {table.playerCount || 0}/{table.maxPlayers}
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-4 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Blinds:</span>
          <div className="font-medium text-poker-green-400 truncate max-w-[80px]">
            {table.smallBlind}/{table.bigBlind}
          </div>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Stack:</span>
          <div className="font-medium text-blue-600 truncate max-w-[100px]">
            {table.startingStack?.toLocaleString() || 'N/A'}
          </div>
        </div>
        {table.gameType === 'tournament' && (
          <div className="flex justify-between">
            <span className="text-gray-500">Buy-in:</span>
            <div className="font-medium text-purple-600 truncate max-w-[100px]">
              {table.buyIn === 0 ? 'Freeroll' : `${table.buyIn?.toLocaleString()}€`}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          Créée {new Date(table.createdAt).toLocaleDateString()}
        </div>

        <Button
          variant={buttonVariant}
          size="sm"
          disabled={!canJoin}
          onClick={() => onJoin(table._id as Id<"tables">)}
        >
          {buttonText}
        </Button>
      </div>
    </div>
  );
};
