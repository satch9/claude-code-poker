import React, { useState } from 'react';
import { Button } from '../UI/Button';
import { cn } from '../../../shared/utils/cn';

interface BettingControlsProps {
  currentBet: number;
  minRaise: number;
  maxBet: number;
  playerChips: number;
  canCheck: boolean;
  canCall: boolean;
  callAmount: number;
  onFold: () => void;
  onCheck: () => void;
  onCall: () => void;
  onRaise: (amount: number) => void;
  onAllIn: () => void;
  disabled?: boolean;
  className?: string;
}

export const BettingControls: React.FC<BettingControlsProps> = ({
  currentBet,
  minRaise,
  maxBet,
  playerChips,
  canCheck,
  canCall,
  callAmount,
  onFold,
  onCheck,
  onCall,
  onRaise,
  onAllIn,
  disabled = false,
  className,
}) => {
  const [raiseAmount, setRaiseAmount] = useState(minRaise);
  const [showRaiseSlider, setShowRaiseSlider] = useState(false);

  const handleRaiseAmountChange = (value: number) => {
    const clampedValue = Math.max(minRaise, Math.min(maxBet, value));
    setRaiseAmount(clampedValue);
  };

  const quickRaiseAmounts = [
    { label: 'Min', value: minRaise },
    { label: '1/2 Pot', value: Math.min(maxBet, Math.floor(currentBet * 0.5)) },
    { label: 'Pot', value: Math.min(maxBet, currentBet) },
    { label: '2x Pot', value: Math.min(maxBet, currentBet * 2) },
  ].filter(amount => amount.value >= minRaise && amount.value <= maxBet);

  return (
    <div className={cn('bg-white rounded-lg shadow-lg p-4', className)}>
      <div className="space-y-4">
        {/* Primary actions */}
        <div className="flex gap-2">
          <Button
            variant="danger"
            onClick={onFold}
            disabled={disabled}
            className="flex-1"
          >
            Fold
          </Button>
          
          {canCheck ? (
            <Button
              variant="secondary"
              onClick={onCheck}
              disabled={disabled}
              className="flex-1"
            >
              Check
            </Button>
          ) : canCall ? (
            <Button
              variant="primary"
              onClick={onCall}
              disabled={disabled}
              className="flex-1"
            >
              Call {callAmount.toLocaleString()}
            </Button>
          ) : null}
          
          <Button
            variant="success"
            onClick={() => setShowRaiseSlider(!showRaiseSlider)}
            disabled={disabled || minRaise > playerChips}
            className="flex-1"
          >
            Raise
          </Button>
          
          <Button
            variant="danger"
            onClick={onAllIn}
            disabled={disabled}
            className="flex-1"
          >
            All-In
          </Button>
        </div>

        {/* Raise controls */}
        {showRaiseSlider && !disabled && (
          <div className="border-t pt-4 space-y-3">
            {/* Quick raise buttons */}
            <div className="grid grid-cols-4 gap-2">
              {quickRaiseAmounts.map((amount) => (
                <Button
                  key={amount.label}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRaiseAmountChange(amount.value)}
                  className="text-xs"
                >
                  {amount.label}
                </Button>
              ))}
            </div>

            {/* Raise slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Min: {minRaise.toLocaleString()}</span>
                <span>Max: {maxBet.toLocaleString()}</span>
              </div>
              
              <input
                type="range"
                min={minRaise}
                max={maxBet}
                step={Math.max(1, Math.floor(minRaise / 10))}
                value={raiseAmount}
                onChange={(e) => handleRaiseAmountChange(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={minRaise}
                  max={maxBet}
                  value={raiseAmount}
                  onChange={(e) => handleRaiseAmountChange(parseInt(e.target.value) || minRaise)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-center"
                />
                <Button
                  variant="success"
                  onClick={() => onRaise(raiseAmount)}
                  disabled={raiseAmount < minRaise || raiseAmount > maxBet}
                >
                  Raise to {raiseAmount.toLocaleString()}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-gray-500 text-center">
          <div>Your chips: {playerChips.toLocaleString()}</div>
          {canCall && <div>To call: {callAmount.toLocaleString()}</div>}
        </div>
      </div>
    </div>
  );
};