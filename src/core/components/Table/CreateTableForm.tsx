import React, { useState, useEffect } from 'react';
import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { GameType } from '../../../shared/types';
import { cn } from '../../../shared/utils/cn';

interface CreateTableFormProps {
  onSubmit: (tableData: CreateTableData) => void;
  onCancel: () => void;
}

export type TournamentPreset = 'turbo' | 'standard' | 'long' | 'custom';

export interface CreateTableData {
  name: string;
  maxPlayers: number;
  gameType: GameType;
  buyIn?: number;
  startingStack: number;
  smallBlind: number;
  bigBlind: number;
  isPrivate: boolean;
  preset?: TournamentPreset;
  levelDurationMin?: number;
}

const SELECT_CLASS =
  'min-h-tap w-full rounded-lg px-3 bg-bg-elevated text-text-primary border border-border-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

export const CreateTableForm: React.FC<CreateTableFormProps> = ({
  onSubmit,
  onCancel,
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<CreateTableData>({
    name: `Table de ${user?.name || 'Joueur'}`,
    maxPlayers: 6,
    gameType: 'cash',
    startingStack: 1000,
    smallBlind: 10,
    bigBlind: 20,
    isPrivate: false,
  });

  // Tournament preset → auto level duration mapping
  useEffect(() => {
    if (formData.gameType !== 'tournament') return;
    const preset = formData.preset;
    if (!preset || preset === 'custom') return;
    const map: Record<Exclude<TournamentPreset, 'custom'>, number> = {
      turbo: 5,
      standard: 10,
      long: 15,
    };
    const target = map[preset];
    if (formData.levelDurationMin !== target) {
      setFormData((prev) => ({ ...prev, levelDurationMin: target }));
    }
  }, [formData.preset, formData.gameType, formData.levelDurationMin]);

  const [errors, setErrors] = useState<Partial<Record<keyof CreateTableData, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Le nom de la table est requis';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Le nom doit contenir au moins 3 caractères';
    }
    if (formData.maxPlayers < 2 || formData.maxPlayers > 9) {
      newErrors.maxPlayers = 'Entre 2 et 9 joueurs maximum';
    }
    if (formData.gameType === 'cash' && formData.smallBlind <= 0) {
      newErrors.smallBlind = 'La petite blind doit être positive';
    }
    if (formData.gameType === 'cash' && formData.bigBlind <= formData.smallBlind) {
      newErrors.bigBlind = 'La grosse blind doit être supérieure à la petite blind';
    }
    if (
      formData.gameType === 'tournament' &&
      (formData.buyIn === undefined || formData.buyIn < 0)
    ) {
      newErrors.buyIn = 'Le buy-in doit être 0 ou plus (0 = freeroll)';
    }
    if (formData.startingStack <= 0) {
      newErrors.startingStack = 'Le stack de départ doit être positif';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) onSubmit(formData);
  };

  const handleGameTypeChange = (gameType: GameType) => {
    setFormData((prev) => ({
      ...prev,
      gameType,
      buyIn: gameType === 'tournament' ? 0 : undefined,
      startingStack: gameType === 'tournament' ? 1500 : 1000,
      preset: gameType === 'tournament' ? prev.preset ?? 'standard' : undefined,
      levelDurationMin:
        gameType === 'tournament' ? prev.levelDurationMin ?? 10 : undefined,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Nom */}
      <Input
        label="Nom de la table"
        type="text"
        placeholder="Ex: Table des amis"
        value={formData.name}
        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
        error={errors.name}
      />

      {/* Type de partie */}
      <div className="flex flex-col gap-2">
        <span className="text-sm text-text-muted">Type de partie</span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleGameTypeChange('cash')}
            className={cn(
              'min-h-tap p-3 rounded-lg text-left border-2 transition-colors',
              formData.gameType === 'cash'
                ? 'border-accent bg-accent/10'
                : 'border-border-default hover:border-accent/50',
            )}
          >
            <div className="font-medium text-text-primary">Cash Game</div>
            <div className="text-xs text-text-muted">Entrée et sortie libres</div>
          </button>
          <button
            type="button"
            onClick={() => handleGameTypeChange('tournament')}
            className={cn(
              'min-h-tap p-3 rounded-lg text-left border-2 transition-colors',
              formData.gameType === 'tournament'
                ? 'border-purple-400 bg-purple-500/10'
                : 'border-border-default hover:border-purple-400/50',
            )}
          >
            <div className="font-medium text-text-primary">Tournoi</div>
            <div className="text-xs text-text-muted">Buy-in fixe, élimination</div>
          </button>
        </div>
      </div>

      {/* Réglages tournoi */}
      {formData.gameType === 'tournament' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 border border-purple-400/30 bg-purple-500/5 rounded-lg">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-text-muted">Structure</label>
            <select
              value={formData.preset ?? 'standard'}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  preset: e.target.value as TournamentPreset,
                }))
              }
              className={SELECT_CLASS}
            >
              <option value="turbo">Turbo (5 min)</option>
              <option value="standard">Standard (10 min)</option>
              <option value="long">Long (15 min)</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-text-muted">Stack de départ</label>
            {formData.preset === 'custom' ? (
              <Input
                type="number"
                min={1}
                value={formData.startingStack}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    startingStack: parseInt(e.target.value) || 0,
                  }))
                }
              />
            ) : (
              <select
                value={formData.startingStack}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    startingStack: parseInt(e.target.value),
                  }))
                }
                className={SELECT_CLASS}
              >
                <option value={1500}>1500</option>
                <option value={3000}>3000</option>
                <option value={5000}>5000</option>
              </select>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-text-muted">Durée par niveau (min)</label>
            {formData.preset === 'custom' ? (
              <select
                value={formData.levelDurationMin ?? 10}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    levelDurationMin: parseInt(e.target.value),
                  }))
                }
                className={SELECT_CLASS}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
              </select>
            ) : (
              <Input
                type="number"
                value={formData.levelDurationMin ?? 10}
                disabled
              />
            )}
          </div>
        </div>
      )}

      {/* Joueurs max */}
      <div className="flex flex-col gap-1">
        <label className="text-sm text-text-muted">Nombre de joueurs max</label>
        <select
          value={formData.maxPlayers}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, maxPlayers: parseInt(e.target.value) }))
          }
          className={cn(SELECT_CLASS, errors.maxPlayers && 'border-sem-danger')}
        >
          {[2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
            const labels: Record<number, string> = {
              2: 'Heads-up',
              3: 'Trio',
              4: 'Carré',
              5: 'Petit groupe',
              6: 'Standard',
              7: 'Grande table',
              8: 'Full ring',
              9: 'Max',
            };
            return (
              <option key={num} value={num}>
                {num} joueurs ({labels[num]})
              </option>
            );
          })}
        </select>
        {errors.maxPlayers && (
          <p className="text-xs text-sem-danger">{errors.maxPlayers}</p>
        )}
      </div>

      {/* Buy-in + Stack (en cash, stack en pleine largeur ; en tournoi non-custom, stack géré au-dessus) */}
      <div
        className={cn(
          'grid gap-3',
          formData.gameType === 'tournament' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1',
        )}
      >
        {formData.gameType === 'tournament' && (
          <Input
            label="Buy-in (prix d'entrée)"
            type="number"
            min={0}
            value={formData.buyIn ?? ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                buyIn: parseInt(e.target.value) || undefined,
              }))
            }
            error={errors.buyIn}
            hint="0 = freeroll gratuit"
          />
        )}

        {formData.gameType === 'cash' && (
          <Input
            label="Stack de départ (jetons)"
            type="number"
            min={1}
            value={formData.startingStack}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                startingStack: parseInt(e.target.value) || 0,
              }))
            }
            error={errors.startingStack}
            hint="Jetons reçus au début de la partie"
          />
        )}
      </div>

      {/* Blinds (cash uniquement) */}
      {formData.gameType === 'cash' && (
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Petite blind"
            type="number"
            min={1}
            value={formData.smallBlind}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                smallBlind: parseInt(e.target.value) || 0,
              }))
            }
            error={errors.smallBlind}
          />
          <Input
            label="Grosse blind"
            type="number"
            min={1}
            value={formData.bigBlind}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                bigBlind: parseInt(e.target.value) || 0,
              }))
            }
            error={errors.bigBlind}
          />
        </div>
      )}

      {/* Privacy */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={formData.isPrivate}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, isPrivate: e.target.checked }))
          }
          className="mt-1 w-4 h-4 accent-accent"
        />
        <div>
          <div className="font-medium text-text-primary">Table privée</div>
          <div className="text-xs text-text-muted">
            Seuls les joueurs invités peuvent rejoindre cette table.
          </div>
        </div>
      </label>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
          Annuler
        </Button>
        <Button type="submit" variant="success" className="flex-1">
          Créer la table
        </Button>
      </div>
    </form>
  );
};
