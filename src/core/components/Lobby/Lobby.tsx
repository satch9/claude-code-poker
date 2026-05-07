import React from "react";
import { TableList } from "./TableList";
import { MyTablesSection } from "./MyTablesSection";
import { JoinByCodeForm } from "./JoinByCodeForm";
import { useAuth } from "../../hooks/useAuth";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

interface LobbyProps {
  onJoinTable: (tableId: Id<"tables">) => void;
}

export const Lobby: React.FC<LobbyProps> = ({ onJoinTable }) => {
  const { user } = useAuth();
  const data = useQuery(
    api.tables.getTablesWithUserInfo,
    user ? { userId: user._id } : "skip",
  );
  const loading = data === undefined;
  const myTables = data?.myTables ?? [];
  const publicTables = data?.publicTables ?? [];

  if (!user) return null;

  return (
    <div className="container mx-auto max-w-5xl px-3 md:px-4 py-4 md:py-6 space-y-4">
      <JoinByCodeForm onJoinTable={onJoinTable} />
      {!loading && myTables.length > 0 && (
        <MyTablesSection tables={myTables} onJoinTable={onJoinTable} />
      )}
      <TableList
        tables={publicTables}
        onJoinTable={onJoinTable}
        loading={loading}
      />
    </div>
  );
};
