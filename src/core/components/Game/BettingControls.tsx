import React, { useState } from 'react';
import { Button } from '../UI/Button';
import { cn } from '../../../shared/utils/cn';
import { useBreakpoint } from '../../hooks/useBreakpoint';

interface GameAction {
  action: 'fold' | 'check' | 'call' | 'raise' | 'all-in';
  amount?: number;
  minAmount?: number;
  maxAmount?: number;
}

interface BettingControlsProps {
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
  currentBet,
  potSize,
  onAction,
  disabled = false,
  className,
  potOdds,
  handStrength,
}) => {
  const { isMobile } = useBreakpoint();
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [showRaiseSlider, setShowRaiseSlider] = useState(false);

  // Get action helpers
  const getAction = (actionType: string) => availableActions.find(a => a.action === actionType);
  const raiseAction = getAction('raise');
  const callAction = getAction('call');
  const allInAction = getAction('all-in');

  const minRaise = raiseAction?.minAmount || 0;
  const maxRaise = raiseAction?.maxAmount || playerChips;

  React.useEffect(() => {
    if (raiseAction && raiseAmount === 0) {
      setRaiseAmount(minRaise);
    }
  }, [raiseAction, minRaise, raiseAmount]);

  const handleRaiseAmountChange = (value: number) => {
    const clampedValue = Math.max(minRaise, Math.min(maxRaise, value));
    setRaiseAmount(clampedValue);
  };

  const quickRaiseAmounts = [
    { label: isMobile ? 'Min' : 'Min', value: minRaise },
    { label: isMobile ? '½P' : '1/2 Pot', value: Math.min(maxRaise, Math.floor(potSize * 0.5)) },
    { label: isMobile ? 'P' : 'Pot', value: Math.min(maxRaise, potSize) },
    { label: isMobile ? '2P' : '2x Pot', value: Math.min(maxRaise, potSize * 2) },
  ].filter(amount => amount.value >= minRaise && amount.value <= maxRaise && raiseAction);

  return (
    <div className={cn(
      'bg-gray-800 rounded-2xl shadow-2xl border border-gray-700',
      isMobile ? 'p-2' : 'p-6',
      className
    )}>
      <div className={cn(isMobile ? "space-y-2" : "space-y-4")}>
        {/* Game info - simplified on mobile */}
        {!isMobile && (
          <div className="flex justify-between items-center text-gray-300 text-sm">
            <div className="flex gap-4">
              <span className="truncate">
                Pot: <span className="text-green-400 font-bold">{potSize.toLocaleString()}</span>
              </span>
              <span className="truncate">
                Your chips: <span className="text-blue-400 font-bold">{playerChips.toLocaleString()}</span>
              </span>
              {potOdds && (
                <span className="truncate">
                  Odds: <span className="text-yellow-400 font-bold">{potOdds}</span>
                </span>
              )}
            </div>
            {handStrength && (
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-gray-400 text-sm">Hand:</span>
                <span className={cn(
                  'font-bold text-sm truncate',
                  handStrength === 'Strong' && 'text-green-400',
                  handStrength === 'Good' && 'text-blue-400',
                  handStrength === 'Medium' && 'text-yellow-400',
                  handStrength === 'Weak' && 'text-red-400'
                )}>
                  {handStrength}
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* Mobile compact info */}
        {isMobile && (
          <div className="flex justify-between items-center text-gray-300 text-xs">
            <span className="truncate">
              Pot: <span className="text-green-400 font-bold">
                {potSize >= 1000 ? `${Math.floor(potSize/1000)}K` : potSize}
              </span>
            </span>
            <span className="truncate">
              Chips: <span className="text-blue-400 font-bold">
                {playerChips >= 1000 ? `${Math.floor(playerChips/1000)}K` : playerChips}
              </span>
            </span>
          </div>
        )}

        {/* Primary actions */}
        <div className={cn(
          "flex gap-2",
          isMobile && "gap-1"
        )}>
                      {getAction('fold') && (
              <Button
                variant="danger"
                onClick={() => onAction({ action: 'fold' })}
                disabled={disabled}
                className={cn(
                  "flex-1",
                  isMobile && "text-xs py-1"
                )}
              >
                {isMobile ? 'Fold' : 'Fold'}
              </Button>
            )}
          
                      {getAction('check') && (
              <Button
                variant="secondary"
                onClick={() => onAction({ action: 'check' })}
                disabled={disabled}
                className={cn(
                  "flex-1",
                  isMobile && "text-xs py-1"
                )}
              >
                {isMobile ? 'Check' : 'Check'}
              </Button>
            )}
          
                      {callAction && (
              <Button
                variant="primary"
                onClick={() => onAction({ action: 'call', amount: callAction.amount })}
                disabled={disabled}
                className={cn(
                  "flex-1",
                  isMobile && "text-xs py-1"
                )}
              >
                {isMobile ? `Call ${callAction.amount && callAction.amount >= 1000 ? `${Math.floor(callAction.amount/1000)}K` : callAction.amount?.toLocaleString()}` : `Call ${callAction.amount?.toLocaleString()}`}
              </Button>
            )}
          
                      {raiseAction && (
              <Button
                variant="success"
                onClick={() => setShowRaiseSlider(!showRaiseSlider)}
                disabled={disabled}
                className={cn(
                  "flex-1",
                  isMobile && "text-xs py-1"
                )}
              >
                {isMobile ? 'Raise' : 'Raise'}
              </Button>
            )}
          
                      {allInAction && (
              <Button
                variant="danger"
                onClick={() => onAction({ action: 'all-in', amount: allInAction.amount })}
                disabled={disabled}
                className={cn(
                  "flex-1",
                  isMobile && "text-xs py-1"
                )}
              >
                {isMobile ? `All-In (${allInAction.amount && allInAction.amount >= 1000 ? `${Math.floor(allInAction.amount/1000)}K` : allInAction.amount?.toLocaleString()})` : `All-In (${allInAction.amount?.toLocaleString()})`}
              </Button>
            )}
        </div>

        {/* Raise controls */}
        {showRaiseSlider && !disabled && raiseAction && (
          <div className={cn(
            "border-t border-gray-600 pt-4 space-y-3",
            isMobile && "pt-2 space-y-2"
          )}>
            {/* Quick raise buttons */}
            <div className={cn(
              "grid grid-cols-4 gap-2",
              isMobile && "gap-1"
            )}>
              {quickRaiseAmounts.map((amount) => (
                <Button
                  key={amount.label}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRaiseAmountChange(amount.value)}
                  className="text-xs text-gray-300 hover:text-white"
                >
                  {amount.label}
                </Button>
              ))}
            </div>

            {/* Raise slider */}
            <div className={cn(
              "space-y-2",
              isMobile && "space-y-1"
            )}>
              <div className="flex justify-between text-sm text-gray-400">
                <span>Min: {minRaise.toLocaleString()}</span>
                <span>Max: {maxRaise.toLocaleString()}</span>
              </div>
              
              <input
                type="range"
                min={minRaise}
                max={maxRaise}
                step={Math.max(1, Math.floor(minRaise / 10))}
                value={raiseAmount}
                onChange={(e) => handleRaiseAmountChange(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider-thumb"
              />
              
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={minRaise}
                  max={maxRaise}
                  value={raiseAmount}
                  onChange={(e) => handleRaiseAmountChange(parseInt(e.target.value) || minRaise)}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-center text-white"
                />
                <Button
                  variant="success"
                  onClick={() => onAction({ action: 'raise', amount: raiseAmount })}
                  disabled={raiseAmount < minRaise || raiseAmount > maxRaise}
                >
                  Raise to {raiseAmount.toLocaleString()}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Action timeout indicator - hidden on mobile */}
        {!disabled && !isMobile && (
          <div className="text-center">
            <div className="text-xs text-gray-400">
              {availableActions.length > 0 ? 'Your turn - choose an action' : 'Waiting for other players...'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};