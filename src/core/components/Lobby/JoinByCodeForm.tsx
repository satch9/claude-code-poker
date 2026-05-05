import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "../UI/Button";
import { Id } from "../../../../convex/_generated/dataModel";

interface JoinByCodeFormProps {
  onJoinTable: (tableId: Id<"tables">) => void;
}

export const JoinByCodeForm: React.FC<JoinByCodeFormProps> = ({ onJoinTable }) => {
  const [code, setCode] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const sanitized = code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  const ready = sanitized.length === 6;

  // Lookup table par code seulement quand le code est complet et que l'user a soumis
  const table = useQuery(
    api.tables.getTableByInviteCode,
    ready && submitted ? { code: sanitized } : "skip"
  );

  // Quand la query revient OK, on déclenche le join automatiquement
  React.useEffect(() => {
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
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4"
    >
      <h3 className="text-base font-semibold text-gray-900 mb-2">
        Rejoindre par code
      </h3>
      <div className="flex flex-col sm:flex-row gap-2 sm:items-stretch">
        <input
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="ABC123"
          value={sanitized}
          onChange={(e) => {
            setCode(e.target.value);
            setSubmitted(false);
          }}
          className="w-full sm:flex-1 sm:min-w-0 px-3 py-2 border border-gray-300 rounded-lg uppercase tracking-widest font-mono text-lg focus:outline-none focus:ring-2 focus:ring-poker-green-500"
          maxLength={6}
        />
        <Button
          type="submit"
          variant="primary"
          disabled={!ready}
          className="w-full sm:w-auto"
        >
          Rejoindre
        </Button>
      </div>
      {showNotFound && (
        <div className="mt-2 text-sm text-red-700">
          Code invalide ou table introuvable.
        </div>
      )}
    </form>
  );
};
