import React, { useState } from 'react';
import { TableList } from './TableList';
import { UserProfile } from '../Auth/UserProfile';
import { useAuth } from '../../hooks/useAuth';
import { Table } from '../../../shared/types';

interface LobbyProps {
  onJoinTable: (tableId: string) => void;
  onCreateTable: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({ onJoinTable, onCreateTable }) => {
  const { user } = useAuth();
  const [tables] = useState<Table[]>([
    // Mock data for demonstration
    {
      _id: 'table1' as any,
      name: 'Table des débutants',
      maxPlayers: 6,
      gameType: 'cash',
      smallBlind: 5,
      bigBlind: 10,
      isPrivate: false,
      creatorId: 'user1' as any,
      status: 'waiting',
      createdAt: Date.now() - 3600000,
      playerCount: 3,
    },
    {
      _id: 'table2' as any,
      name: 'High Stakes',
      maxPlayers: 9,
      gameType: 'cash',
      buyIn: 10000,
      smallBlind: 50,
      bigBlind: 100,
      isPrivate: false,
      creatorId: 'user2' as any,
      status: 'waiting',
      createdAt: Date.now() - 1800000,
      playerCount: 5,
    },
    {
      _id: 'table3' as any,
      name: 'Tournoi du vendredi',
      maxPlayers: 8,
      gameType: 'tournament',
      buyIn: 1000,
      smallBlind: 10,
      bigBlind: 20,
      isPrivate: false,
      creatorId: 'user3' as any,
      status: 'waiting',
      createdAt: Date.now() - 900000,
      playerCount: 6,
    },
    {
      _id: 'table4' as any,
      name: 'Partie privée VIP',
      maxPlayers: 4,
      gameType: 'cash',
      buyIn: 5000,
      smallBlind: 25,
      bigBlind: 50,
      isPrivate: true,
      inviteCode: 'VIP123',
      creatorId: 'user4' as any,
      status: 'waiting',
      createdAt: Date.now() - 600000,
      playerCount: 2,
    },
  ]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-poker-green-50 to-poker-green-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start gap-6 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Welcome to the Lobby
            </h1>
            <p className="text-gray-600">
              Choose a table and start playing poker with other players
            </p>
          </div>
          
          <div className="w-full lg:w-auto">
            <UserProfile compact />
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Tables list - main content */}
          <div className="lg:col-span-3">
            <TableList
              tables={tables}
              onJoinTable={onJoinTable}
              onCreateTable={onCreateTable}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* User profile */}
            <UserProfile showLogout />

            {/* Quick actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Actions rapides
              </h3>
              <div className="space-y-3">
                <button 
                  onClick={onCreateTable}
                  className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">Créer une table</div>
                  <div className="text-sm text-gray-500">Commencer une nouvelle partie</div>
                </button>
                
                <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="font-medium text-gray-900">Rejoindre par code</div>
                  <div className="text-sm text-gray-500">Table privée avec code d'invitation</div>
                </button>
                
                <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="font-medium text-gray-900">Parties rapides</div>
                  <div className="text-sm text-gray-500">Rejoindre automatiquement</div>
                </button>
              </div>
            </div>

            {/* Recent activity */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Activité récente
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Dernière partie:</span>
                  <span className="font-medium">Il y a 2h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tables créées:</span>
                  <span className="font-medium">3</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Parties jouées:</span>
                  <span className="font-medium">12</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};