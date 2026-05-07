import React, { useState, useEffect } from 'react';
import { Button } from '../../../shared/ui/Button';
import { BottomSheet } from '../../../shared/ui/BottomSheet';
import { cn } from '../../../shared/utils/cn';

export interface GameAction {
  action: 'fold' | 'check' | 'call' | 'raise' | 'all-in';
  amount?: number;
  minAmount?: number;
  maxAmount?: number;
}

export interface BettingControlsProps {
  availableActions: GameAction[];
  playerChips: number;
  currentBet: number;
  potSize: number;
  onAction: (action: GameAction) => void;
  disabled?: boolean;
  className?: string;
  potOdds?: string;
  handStrength?: string;
}

export const BettingControls: React.FC<BettingControlsProps> = ({
  availableActions,
  playerChips,
  potSize,
  onAction,
  disabled = false,
  className,
}) => {
  const getAction = (type: GameAction['action']) =>
    availableActions.find((a) => a.action === type);

  const foldAction = getAction('fold');
  const checkAction = getAction('check');
  const callAction = getAction('call');
  const raiseAction = getAction('raise');
  const allInAction = getAction('all-in');
  const [isRaiseOpen, setIsRaiseOpen] = useState(false);

  const minRaise = raiseAction?.minAmount ?? 0;
  const maxRaise = raiseAction?.maxAmount ?? playerChips;
  const [raiseAmount, setRaiseAmount] = useState<number>(minRaise);

  // Re-init when sheet opens or bounds change
  useEffect(() => {
    if (isRaiseOpen) setRaiseAmount(minRaise);
  }, [isRaiseOpen, minRaise]);

  const clamp = (n: number) => Math.max(minRaise, Math.min(maxRaise, n));

  const presets = [
    { label: 'Min', value: minRaise },
    { label: '½ pot', value: clamp(Math.floor(potSize * 0.5)) },
    { label: '¾ pot', value: clamp(Math.floor(potSize * 0.75)) },
    { label: 'Pot', value: clamp(potSize) },
    { label: 'All-in', value: maxRaise },
  ];

  const formatAmount = (n?: number) =>
    n === undefined ? '' : n >= 1000 ? `${Math.floor(n / 1000)}K` : String(n);

  return (
    <>
      <div className={cn('flex gap-2 p-2', className)}>
        {foldAction && (
          <Button
            variant="danger"
            size="md"
            disabled={disabled}
            onClick={() => onAction({ action: 'fold' })}
            className="flex-1"
          >
            Fold
          </Button>
        )}
        {checkAction && (
          <Button
            variant="primary"
            size="md"
            disabled={disabled}
            onClick={() => onAction({ action: 'check' })}
            className="flex-1"
          >
            Check
          </Button>
        )}
        {callAction && (
          <Button
            variant="primary"
            size="md"
            disabled={disabled}
            onClick={() =>
              onAction({ action: 'call', amount: callAction.amount })
            }
            className="flex-1"
          >
            Call {formatAmount(callAction.amount)}
          </Button>
        )}
        {raiseAction && (
          <Button
            variant="success"
            size="md"
            disabled={disabled}
            onClick={() => setIsRaiseOpen(true)}
            className="flex-1"
          >
            Raise
          </Button>
        )}
        {allInAction && (
          <Button
            variant="danger"
            size="md"
            disabled={disabled}
            onClick={() =>
              onAction({ action: 'all-in', amount: allInAction.amount })
            }
            className="flex-1"
          >
            All-in {formatAmount(allInAction.amount)}
          </Button>
        )}
      </div>

      {raiseAction && (
        <BottomSheet
          isOpen={isRaiseOpen}
          onClose={() => setIsRaiseOpen(false)}
          title="Relance"
        >
          <div className="flex flex-col gap-4">
            {/* Presets */}
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setRaiseAmount(p.value)}
                  className="min-h-tap px-3 rounded-lg border border-border-default bg-bg-elevated text-text-primary hover:border-accent text-sm font-medium"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Slider */}
            <input
              type="range"
              min={minRaise}
              max={maxRaise}
              step={Math.max(1, Math.floor(minRaise / 10) || 1)}
              value={raiseAmount}
              onChange={(e) => setRaiseAmount(clamp(parseInt(e.target.value, 10)))}
              aria-label="Slider de relance"
              className="w-full h-2 bg-bg-elevated rounded-lg appearance-none cursor-pointer"
            />

            {/* Min / Max labels */}
            <div className="flex justify-between text-xs text-text-muted">
              <span>Min: {minRaise.toLocaleString()}</span>
              <span>Max: {maxRaise.toLocaleString()}</span>
            </div>

            {/* Numeric input */}
            <label className="flex items-center gap-2">
              <span className="text-sm text-text-muted">Montant</span>
              <input
                type="number"
                min={minRaise}
                max={maxRaise}
                value={raiseAmount}
                onChange={(e) =>
                  setRaiseAmount(clamp(parseInt(e.target.value, 10) || minRaise))
                }
                aria-label="Montant de la relance"
                className="flex-1 min-h-tap rounded-lg px-3 bg-bg-elevated text-text-primary border border-border-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            </label>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setIsRaiseOpen(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                variant="success"
                size="md"
                onClick={() => {
                  onAction({ action: 'raise', amount: raiseAmount });
                  setIsRaiseOpen(false);
                }}
                disabled={disabled || raiseAmount < minRaise || raiseAmount > maxRaise}
                className="flex-1"
              >
                Relancer à {raiseAmount.toLocaleString()}
              </Button>
            </div>
          </div>
        </BottomSheet>
      )}
    </>
  );
};
