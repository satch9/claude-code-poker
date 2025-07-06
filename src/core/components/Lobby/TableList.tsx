import React, { useState } from 'react';
import { TableCard } from './TableCard';
import { Button } from '../UI/Button';
import { Table } from '../../../shared/types';

interface TableListProps {
  tables: Table[];
  onJoinTable: (tableId: string) => void;
  onCreateTable: () => void;
  loading?: boolean;
}

export const TableList: React.FC<TableListProps> = ({
  tables,
  onJoinTable,
  onCreateTable,
  loading = false,
}) => {
  const [filter, setFilter] = useState<'all' | 'cash' | 'tournament'>('all');
  const [showPrivate, setShowPrivate] = useState(false);

  const filteredTables = tables.filter(table => {
    const typeMatch = filter === 'all' || table.gameType === filter;
    const privateMatch = showPrivate || !table.isPrivate;
    return typeMatch && privateMatch;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div 
            key={i}
            className="bg-white rounded-lg p-6 animate-pulse"
          >
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="flex justify-between">
              <div className="h-3 bg-gray-200 rounded w-1/6"></div>
              <div className="h-8 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters and create button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Tables disponibles</h2>
        
        <div className="flex items-center gap-4">
          {/* Filters */}
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              Toutes
            </Button>
            <Button
              variant={filter === 'cash' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('cash')}
            >
              Cash
            </Button>
            <Button
              variant={filter === 'tournament' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('tournament')}
            >
              Tournois
            </Button>
          </div>
          
          {/* Show private toggle */}
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showPrivate}
              onChange={(e) => setShowPrivate(e.target.checked)}
              className="rounded border-gray-300 focus:ring-poker-green-500"
            />
            Tables privées
          </label>
          
          {/* Create table button */}
          <Button
            variant="success"
            onClick={onCreateTable}
          >
            + Créer une table
          </Button>
        </div>
      </div>

      {/* Tables grid */}
      {filteredTables.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTables.map((table) => (
            <TableCard
              key={table._id}
              table={table}
              onJoin={onJoinTable}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-4">
            Aucune table disponible
          </div>
          <p className="text-gray-500 mb-6">
            {filter !== 'all' 
              ? `Aucune table ${filter} trouvée. Essayez de changer les filtres.`
              : 'Soyez le premier à créer une table !'
            }
          </p>
          <Button variant="primary" onClick={onCreateTable}>
            Créer la première table
          </Button>
        </div>
      )}

      {/* Quick stats */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {tables.length}
            </div>
            <div className="text-sm text-gray-500">Tables totales</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-poker-green-600">
              {tables.filter(t => t.gameType === 'cash').length}
            </div>
            <div className="text-sm text-gray-500">Cash games</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {tables.filter(t => t.gameType === 'tournament').length}
            </div>
            <div className="text-sm text-gray-500">Tournois</div>
          </div>
        </div>
      </div>
    </div>
  );
};