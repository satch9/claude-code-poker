import React from 'react';

// Squelette du panneau Chat, intégré dans TableRightPanel (desktop) et
// dans ChatDrawer (mobile). Le module Chat lui-même reste backlog
// (cf. CLAUDE.md "Chat system: future").
export const ChatPanel: React.FC = () => (
  <div className="text-sm text-text-muted space-y-3 p-2">
    <div className="text-3xl text-center">💬</div>
    <p className="text-center">
      Le chat sera disponible prochainement. Pour l'instant, échangez via
      vos moyens habituels.
    </p>
  </div>
);
