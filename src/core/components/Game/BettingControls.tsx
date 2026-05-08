import React, { useState, useEffect } from 'react';
import { Button } from '../../../shared/ui/Button';
import { BottomSheet } from '../../../shared/ui/BottomSheet';
import { cn } from '../../../shared/utils/cn';
import { useMediaQuery } from '../../../shared/hooks/useMediaQuery';
import { BREAKPOINTS } from '../../../shared/constants/breakpoints';

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
  potOdds,
  handStrength,
}) => {
  const getAction = (type: GameAction['action']) =>
    availableActions.find((a) => a.action === type);

  const foldAction = getAction('fold');
  const checkAction = getAction('check');
  const callAction = getAction('call');
  const raiseAction = getAction('raise');
  const allInAction = getAction('all-in');
  const [isRaiseOpen, setIsRaiseOpen] = useState(false);
  const isDesktop = useMediaQuery(BREAKPOINTS.lg);

  // Garde anti-double-clic : une fois une action envoyée au serveur,
  // on désactive les boutons jusqu'à ce que le set d'availableActions
  // change (signal que le serveur a pris en compte l'action et qu'on
  // est sur un nouveau tour, ou que ce n'est plus à nous de jouer).
  // Évite les "You have already folded this hand" en cas de double-tap.
  const [submitting, setSubmitting] = useState(false);
  const actionsKey = availableActions
    .map((a) => `${a.action}:${a.amount ?? ''}:${a.minAmount ?? ''}:${a.maxAmount ?? ''}`)
    .join('|');
  useEffect(() => {
    setSubmitting(false);
  }, [actionsKey]);

  const dispatch = (a: GameAction) => {
    if (submitting || disabled) return;
    setSubmitting(true);
    onAction(a);
  };

  const isLocked = disabled || submitting;

  const minRaise = raiseAction?.minAmount ?? 0;
  const maxRaise = raiseAction?.maxAmount ?? playerChips;
  const [raiseAmount, setRaiseAmount] = useState<number>(minRaise);

  // Re-init when sheet opens, or when on desktop and bounds change
  useEffect(() => {
    if (isRaiseOpen || isDesktop) setRaiseAmount(minRaise);
  }, [isRaiseOpen, isDesktop, minRaise]);

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

  const presetButtons = (
    <>
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
    </>
  );

  const sliderInput = (
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
  );

  const numericInput = (
    <input
      type="number"
      min={minRaise}
      max={maxRaise}
      value={raiseAmount}
      onChange={(e) =>
        setRaiseAmount(clamp(parseInt(e.target.value, 10) || minRaise))
      }
      aria-label="Montant de la relance"
      className="w-full min-h-tap rounded-lg px-3 bg-bg-elevated text-text-primary border border-border-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    />
  );

  const cancelButton = (
    <Button
      variant="ghost"
      size="md"
      onClick={() => setIsRaiseOpen(false)}
      className="flex-1"
    >
      Annuler
    </Button>
  );

  const confirmButton = (label: string) => (
    <Button
      variant="success"
      size="md"
      onClick={() => {
        dispatch({ action: 'raise', amount: raiseAmount });
        setIsRaiseOpen(false);
      }}
      disabled={isLocked || raiseAmount < minRaise || raiseAmount > maxRaise}
      className="flex-1"
    >
      {label}
    </Button>
  );

  const raisePanelDesktop = raiseAction ? (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">{presetButtons}</div>
      {sliderInput}
      <div className="flex justify-between text-xs text-text-muted">
        <span>Min: {minRaise.toLocaleString()}</span>
        <span>Max: {maxRaise.toLocaleString()}</span>
      </div>
      <label className="flex items-center gap-2">
        <span className="text-sm text-text-muted">Montant</span>
        {numericInput}
      </label>
      <div className="flex gap-2 pt-2">
        {cancelButton}
        {confirmButton(`Relancer à ${raiseAmount.toLocaleString()}`)}
      </div>
    </div>
  ) : null;

  const raisePanelMobile = raiseAction ? (
    <div className="grid grid-cols-[auto,1fr] gap-3">
      {/* Col 1 — presets verticaux */}
      <div className="flex flex-col gap-2">{presetButtons}</div>

      {/* Col 2 — slider, input, actions */}
      <div className="flex flex-col gap-3 min-w-0">
        <div className="flex flex-col gap-1">
          {sliderInput}
          <div className="flex justify-between text-xs text-text-muted">
            <span>{minRaise.toLocaleString()}</span>
            <span>{maxRaise.toLocaleString()}</span>
          </div>
        </div>
        {numericInput}
        <div className="flex gap-2">
          {cancelButton}
          {confirmButton(`Relancer ${raiseAmount.toLocaleString()}`)}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {(potOdds || handStrength) && (
        <div className="flex flex-wrap gap-2 px-2 pb-1 text-xs">
          {potOdds && (
            <span className="px-2 py-0.5 rounded-full bg-bg-elevated text-text-muted">
              Odds <span className="text-gold font-semibold">{potOdds}</span>
            </span>
          )}
          {handStrength && (
            <span
              className={cn(
                'px-2 py-0.5 rounded-full bg-bg-elevated font-semibold',
                handStrength === 'Strong' && 'text-sem-success',
                handStrength === 'Good' && 'text-accent',
                handStrength === 'Medium' && 'text-sem-warning',
                handStrength === 'Weak' && 'text-sem-danger',
              )}
            >
              Hand: {handStrength}
            </span>
          )}
        </div>
      )}
      <div className={cn('flex gap-2 p-2', className)}>
        {foldAction && (
          <Button
            variant="danger"
            size="md"
            disabled={isLocked}
            onClick={() => dispatch({ action: 'fold' })}
            className="flex-1"
          >
            Fold
          </Button>
        )}
        {checkAction && (
          <Button
            variant="primary"
            size="md"
            disabled={isLocked}
            onClick={() => dispatch({ action: 'check' })}
            className="flex-1"
          >
            Check
          </Button>
        )}
        {callAction && (
          <Button
            variant="primary"
            size="md"
            disabled={isLocked}
            onClick={() =>
              dispatch({ action: 'call', amount: callAction.amount })
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
            disabled={isLocked}
            onClick={() => setIsRaiseOpen((v) => !v)}
            className="flex-1"
          >
            Raise
          </Button>
        )}
        {allInAction && (
          <Button
            variant="danger"
            size="md"
            disabled={isLocked}
            onClick={() =>
              dispatch({ action: 'all-in', amount: allInAction.amount })
            }
            className="flex-1"
          >
            All-in {formatAmount(allInAction.amount)}
          </Button>
        )}
      </div>

      {/* Desktop: inline panel ouvert au clic sur Raise */}
      {isDesktop && raiseAction && isRaiseOpen && (
        <div className="mt-2 p-4 bg-bg-surface border border-border-default rounded-lg">
          {raisePanelDesktop}
        </div>
      )}

      {/* Mobile/Tablette: panel inside BottomSheet */}
      {!isDesktop && raiseAction && (
        <BottomSheet
          isOpen={isRaiseOpen}
          onClose={() => setIsRaiseOpen(false)}
          title="Relance"
        >
          {raisePanelMobile}
        </BottomSheet>
      )}
    </>
  );
};
