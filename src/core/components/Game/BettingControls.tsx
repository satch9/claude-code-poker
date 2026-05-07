import React from 'react';
import { Button } from '../../../shared/ui/Button';
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
  onAction,
  disabled = false,
  className,
}) => {
  const getAction = (type: GameAction['action']) =>
    availableActions.find((a) => a.action === type);

  const foldAction = getAction('fold');
  const checkAction = getAction('check');
  const callAction = getAction('call');
  const allInAction = getAction('all-in');

  const formatAmount = (n?: number) =>
    n === undefined ? '' : n >= 1000 ? `${Math.floor(n / 1000)}K` : String(n);

  return (
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
  );
};
