import React, { useState } from "react";
import { Button } from "../UI/Button";
import { cn } from "../../../shared/utils/cn";

interface RebuyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => Promise<void>;
  startingStack: number;
  currentChips: number;
}

export const RebuyDialog: React.FC<RebuyDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  startingStack,
  currentChips,
}) => {
  const [amount, setAmount] = useState(startingStack);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setError(null);
    if (amount <= 0 || amount > startingStack) {
      setError(`Montant entre 1 et ${startingStack}`);
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm(amount);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Recharger des jetons</h2>
        <p className="text-sm text-gray-600 mb-4">
          Stack actuelle : {currentChips} jetons. Choisis le montant à recharger
          (max {startingStack}).
        </p>

        <input
          type="number"
          min={1}
          max={startingStack}
          value={amount}
          onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-poker-green-500"
        />

        <input
          type="range"
          min={1}
          max={startingStack}
          value={amount}
          onChange={(e) => setAmount(parseInt(e.target.value))}
          className="w-full mb-4"
        />

        {error && (
          <div className={cn(
            "mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm"
          )}>
            {error}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleConfirm} disabled={submitting}>
            {submitting ? "..." : `Recharger ${amount}`}
          </Button>
        </div>
      </div>
    </div>
  );
};
