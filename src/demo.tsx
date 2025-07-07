import React, { useState } from 'react';
import { UIDemo } from './core/components/UI/UIDemo';
import { AppMain } from './core/components/App/AppMain';
import { GameAnimations } from './core/components/Game/GameAnimations';
import { Button } from './core/components/UI/Button';

type DemoMode = 'app' | 'ui' | 'animations';

export const Demo: React.FC = () => {
  const [mode, setMode] = useState<DemoMode>('app');

  return (
    <div>
      {/* Demo selector */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <Button
          variant={mode === 'app' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setMode('app')}
        >
          App Demo
        </Button>
        <Button
          variant={mode === 'ui' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setMode('ui')}
        >
          UI Demo
        </Button>
        <Button
          variant={mode === 'animations' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setMode('animations')}
        >
          Animations
        </Button>
      </div>

      {/* Render selected demo */}
      {mode === 'app' ? (
        <AppMain />
      ) : mode === 'ui' ? (
        <UIDemo />
      ) : (
        <div className="min-h-screen bg-gradient-to-br from-poker-green-800 to-poker-green-900">
          <GameAnimations />
        </div>
      )}
    </div>
  );
};