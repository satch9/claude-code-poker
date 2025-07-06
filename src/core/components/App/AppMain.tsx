import React, { useState } from 'react';
import { AuthProvider } from '../Auth/AuthProvider';
import { LoginForm } from '../Auth/LoginForm';
import { Lobby } from '../Lobby/Lobby';
import { CreateTableForm, CreateTableData } from '../Table/CreateTableForm';
import { useAuth } from '../../hooks/useAuth';

type AppView = 'lobby' | 'table' | 'create-table';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>('lobby');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  const handleJoinTable = (tableId: string) => {
    setSelectedTableId(tableId);
    setCurrentView('table');
    console.log('Joining table:', tableId);
    // TODO: Implement table joining logic
  };

  const handleCreateTable = () => {
    setCurrentView('create-table');
  };

  const handleTableCreated = (tableData: CreateTableData) => {
    console.log('Table created:', tableData);
    // TODO: Create table via Convex API
    // For now, just return to lobby
    setCurrentView('lobby');
  };

  const handleCancelCreateTable = () => {
    setCurrentView('lobby');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-poker-green-800 to-poker-green-900 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-poker-green-600"></div>
            <span className="text-gray-700">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-poker-green-800 to-poker-green-900 flex items-center justify-center p-4">
        <LoginForm />
      </div>
    );
  }

  // Render different views based on current state
  switch (currentView) {
    case 'lobby':
      return (
        <Lobby 
          onJoinTable={handleJoinTable}
          onCreateTable={handleCreateTable}
        />
      );
    
    case 'table':
      // TODO: Implement PokerTable component
      return (
        <div className="min-h-screen bg-gradient-to-br from-poker-green-800 to-poker-green-900 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 shadow-xl text-center">
            <h2 className="text-2xl font-bold mb-4">Table de Poker</h2>
            <p className="text-gray-600 mb-4">
              Table ID: {selectedTableId}
            </p>
            <p className="text-gray-500 mb-6">
              Composant de table en cours de développement...
            </p>
            <button
              onClick={() => setCurrentView('lobby')}
              className="bg-poker-green-600 text-white px-4 py-2 rounded hover:bg-poker-green-700"
            >
              Retour au lobby
            </button>
          </div>
        </div>
      );
    
    case 'create-table':
      return (
        <CreateTableForm
          onSubmit={handleTableCreated}
          onCancel={handleCancelCreateTable}
        />
      );
    
    default:
      return (
        <Lobby 
          onJoinTable={handleJoinTable}
          onCreateTable={handleCreateTable}
        />
      );
  }
};

export const AppMain: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};