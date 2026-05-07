import React from "react";
import { Button } from "../../../shared/ui/Button";
import { cn } from "../../../shared/utils/cn";
import type { Table } from "../../../shared/types";
import type { Id } from "../../../../convex/_generated/dataModel";

interface TableCardProps {
  table: Table;
  onJoin: (tableId: Id<"tables">) => void;
  className?: string;
}

const formatChips = (n?: number) =>
  n === undefined
    ? "—"
    : n >= 1000
      ? `${Math.floor(n / 1000)}K`
      : n.toLocaleString();

const Badge: React.FC<{
  variant: "info" | "warning" | "success" | "purple" | "muted";
  children: React.ReactNode;
}> = ({ variant, children }) => (
  <span
    className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
      variant === "info" && "bg-accent/20 text-accent",
      variant === "warning" && "bg-sem-warning/20 text-sem-warning",
      variant === "success" && "bg-sem-success/20 text-sem-success",
      variant === "purple" && "bg-purple-500/20 text-purple-300",
      variant === "muted" && "bg-bg-elevated text-text-muted",
    )}
  >
    {children}
  </span>
);

export const TableCard: React.FC<TableCardProps> = ({
  table,
  onJoin,
  className,
}) => {
  const playerCount = table.playerCount ?? 0;
  const isTableFull = playerCount >= table.maxPlayers;
  const isTournament = table.gameType === "tournament";

  const tournamentFinished =
    isTournament &&
    (((table as any).modules?.tournament?.status === "finished") ||
      table.status === "finished");

  const canJoin = tournamentFinished
    ? true
    : !isTableFull || table.isUserSeated;

  const buttonLabel = tournamentFinished
    ? "Voir le classement"
    : table.isUserSeated
      ? "Continuer"
      : isTableFull
        ? "Table pleine"
        : "Rejoindre";

  const buttonVariant: "primary" | "secondary" =
    tournamentFinished ? "secondary" : canJoin ? "primary" : "secondary";

  return (
    <article
      className={cn(
        "bg-bg-surface border border-border-default rounded-lg p-4 hover:border-accent/50 transition-colors",
        className,
      )}
    >
      <header className="flex justify-between items-start gap-3 mb-3 min-w-0">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-text-primary truncate">
            {table.name}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge variant={isTournament ? "purple" : "info"}>
              {isTournament ? "Tournoi" : "Cash Game"}
            </Badge>
            {table.isPrivate && <Badge variant="warning">Privée</Badge>}
            {isTournament && table.buyIn === 0 && (
              <Badge variant="success">Freeroll</Badge>
            )}
            {tournamentFinished && <Badge variant="muted">Terminé</Badge>}
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <div className="text-xs text-text-muted">Joueurs</div>
          <div className="text-lg font-bold text-text-primary">
            {playerCount}/{table.maxPlayers}
          </div>
        </div>
      </header>

      <dl className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-text-muted">Blinds</dt>
          <dd className="font-medium text-text-primary">
            {table.smallBlind}/{table.bigBlind}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-text-muted">Stack</dt>
          <dd className="font-medium text-text-primary">
            {formatChips(table.startingStack)}
          </dd>
        </div>
        {isTournament && (
          <div className="flex justify-between">
            <dt className="text-text-muted">Buy-in</dt>
            <dd className="font-medium text-text-primary">
              {table.buyIn === 0 ? "Gratuit" : `${formatChips(table.buyIn)} €`}
            </dd>
          </div>
        )}
      </dl>

      <footer className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs text-text-muted">
          {new Date(table.createdAt).toLocaleDateString()}
        </span>
        <Button
          variant={buttonVariant}
          size="sm"
          disabled={!canJoin}
          onClick={() => onJoin(table._id as Id<"tables">)}
        >
          {buttonLabel}
        </Button>
      </footer>
    </article>
  );
};
