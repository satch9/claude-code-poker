import React, { useState } from 'react';
import { Button } from '../UI/Button';
import { useAuth } from '../../hooks/useAuth';
import { GameType } from '../../../shared/types';
import { cn } from '../../../shared/utils/cn';

interface CreateTableFormProps {
  onSubmit: (tableData: CreateTableData) => void;
  onCancel: () => void;
}

export interface CreateTableData {
  name: string;
  maxPlayers: number;
  gameType: GameType;
  buyIn?: number;
  smallBlind: number;
  bigBlind: number;
  isPrivate: boolean;
}

export const CreateTableForm: React.FC<CreateTableFormProps> = ({
  onSubmit,
  onCancel,
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<CreateTableData>({
    name: `Table de ${user?.name || 'Joueur'}`,
    maxPlayers: 6,
    gameType: 'cash',
    smallBlind: 10,
    bigBlind: 20,
    isPrivate: false,
  });
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

    if (formData.smallBlind <= 0) {
      newErrors.smallBlind = 'La petite blind doit être positive';
    }

    if (formData.bigBlind <= formData.smallBlind) {
      newErrors.bigBlind = 'La grosse blind doit être supérieure à la petite blind';
    }

    if (formData.gameType === 'tournament' && (!formData.buyIn || formData.buyIn <= 0)) {
      newErrors.buyIn = 'Le buy-in est requis pour les tournois';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleGameTypeChange = (gameType: GameType) => {
    setFormData(prev => ({
      ...prev,
      gameType,
      // Set default buy-in for tournaments
      buyIn: gameType === 'tournament' ? 1000 : undefined,
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-poker-green-800 to-poker-green-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Créer une nouvelle table
          </h1>
          <p className="text-gray-600">
            Configurez votre table de poker selon vos préférences
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Table name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom de la table
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={cn(
                'w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-poker-green-500 focus:border-poker-green-500',
                errors.name ? 'border-red-500' : 'border-gray-300'
              )}
              placeholder="Ex: Table des amis"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Game type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de partie
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleGameTypeChange('cash')}
                className={cn(
                  'p-4 border-2 rounded-lg text-left transition-colors',
                  formData.gameType === 'cash'
                    ? 'border-poker-green-500 bg-poker-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                )}
              >
                <div className="font-medium text-gray-900">Cash Game</div>
                <div className="text-sm text-gray-500">
                  Entrée et sortie libres
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleGameTypeChange('tournament')}
                className={cn(
                  'p-4 border-2 rounded-lg text-left transition-colors',
                  formData.gameType === 'tournament'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-300 hover:border-gray-400'
                )}
              >
                <div className="font-medium text-gray-900">Tournoi</div>
                <div className="text-sm text-gray-500">
                  Buy-in fixe, élimination
                </div>
              </button>
            </div>
          </div>

          {/* Players and Buy-in row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de joueurs max
              </label>
              <select
                value={formData.maxPlayers}
                onChange={(e) => setFormData(prev => ({ ...prev, maxPlayers: parseInt(e.target.value) }))}
                className={cn(
                  'w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-poker-green-500 focus:border-poker-green-500',
                  errors.maxPlayers ? 'border-red-500' : 'border-gray-300'
                )}
              >
                {[2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <option key={num} value={num}>{num} joueurs</option>
                ))}
              </select>
              {errors.maxPlayers && (
                <p className="mt-1 text-sm text-red-600">{errors.maxPlayers}</p>
              )}
            </div>

            {formData.gameType === 'tournament' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buy-in
                </label>
                <input
                  type="number"
                  value={formData.buyIn || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, buyIn: parseInt(e.target.value) || undefined }))}
                  className={cn(
                    'w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-poker-green-500 focus:border-poker-green-500',
                    errors.buyIn ? 'border-red-500' : 'border-gray-300'
                  )}
                  placeholder="1000"
                  min="1"
                />
                {errors.buyIn && (
                  <p className="mt-1 text-sm text-red-600">{errors.buyIn}</p>
                )}
              </div>
            )}
          </div>

          {/* Blinds */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Petite blind
              </label>
              <input
                type="number"
                value={formData.smallBlind}
                onChange={(e) => setFormData(prev => ({ ...prev, smallBlind: parseInt(e.target.value) || 0 }))}
                className={cn(
                  'w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-poker-green-500 focus:border-poker-green-500',
                  errors.smallBlind ? 'border-red-500' : 'border-gray-300'
                )}
                min="1"
              />
              {errors.smallBlind && (
                <p className="mt-1 text-sm text-red-600">{errors.smallBlind}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grosse blind
              </label>
              <input
                type="number"
                value={formData.bigBlind}
                onChange={(e) => setFormData(prev => ({ ...prev, bigBlind: parseInt(e.target.value) || 0 }))}
                className={cn(
                  'w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-poker-green-500 focus:border-poker-green-500',
                  errors.bigBlind ? 'border-red-500' : 'border-gray-300'
                )}
                min="1"
              />
              {errors.bigBlind && (
                <p className="mt-1 text-sm text-red-600">{errors.bigBlind}</p>
              )}
            </div>
          </div>

          {/* Privacy setting */}
          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.isPrivate}
                onChange={(e) => setFormData(prev => ({ ...prev, isPrivate: e.target.checked }))}
                className="w-4 h-4 text-poker-green-600 border-gray-300 rounded focus:ring-poker-green-500"
              />
              <div>
                <div className="font-medium text-gray-900">Table privée</div>
                <div className="text-sm text-gray-500">
                  Seuls les joueurs invités peuvent rejoindre cette table
                </div>
              </div>
            </label>
          </div>

          {/* Submit buttons */}
          <div className="flex gap-3 pt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="success"
              className="flex-1"
            >
              Créer la table
            </Button>
          </div>
        </form>

        {/* Preview */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Aperçu</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <div>
              <strong>{formData.name}</strong> 
              {formData.isPrivate && ' (Privée)'}
            </div>
            <div>
              {formData.gameType === 'tournament' ? 'Tournoi' : 'Cash Game'} • 
              {formData.maxPlayers} joueurs max
            </div>
            <div>
              Blinds: {formData.smallBlind}/{formData.bigBlind}
              {formData.buyIn && ` • Buy-in: ${formData.buyIn}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};