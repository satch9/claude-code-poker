import React, { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import { Card } from "../../../shared/ui/Card";
import { Id } from "../../../../convex/_generated/dataModel";

interface JoinByCodeFormProps {
  onJoinTable: (tableId: Id<"tables">) => void;
}

export const JoinByCodeForm: React.FC<JoinByCodeFormProps> = ({ onJoinTable }) => {
  const [code, setCode] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const sanitized = code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  const ready = sanitized.length === 6;

  const table = useQuery(
    api.tables.getTableByInviteCode,
    ready && submitted ? { code: sanitized } : "skip",
  );

  useEffect(() => {
    if (submitted && table && table._id) {
      onJoinTable(table._id);
      setSubmitted(false);
      setCode("");
    }
  }, [submitted, table, onJoinTable]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ready) setSubmitted(true);
  };

  const showNotFound = submitted && table === null;

  return (
    <Card className="!p-3">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-text-primary">
          Rejoindre par code
        </h2>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="flex-1 min-w-0">
            <Input
              label="Code"
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="ABC123"
              value={sanitized}
              maxLength={6}
              onChange={(e) => {
                setCode(e.target.value);
                setSubmitted(false);
              }}
              error={showNotFound ? "Code invalide ou table introuvable." : undefined}
              className="uppercase tracking-widest font-mono text-lg"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            disabled={!ready}
            className="w-full sm:w-auto"
          >
            Rejoindre
          </Button>
        </div>
      </form>
    </Card>
  );
};
