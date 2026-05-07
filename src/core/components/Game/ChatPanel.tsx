import React from 'react';
import { MessageCircle } from 'lucide-react';

// Squelette du panneau Chat, intégré dans l'onglet Chat du
// TableRightPanel (drawer unifié déclenché par l'icône Users). Le module
// Chat lui-même reste backlog (cf. CLAUDE.md "Chat system: future").
export const ChatPanel: React.FC = () => (
  <div className="text-sm text-text-muted space-y-3 p-2">
    <div className="flex justify-center">
      <MessageCircle size={32} aria-hidden />
    </div>
    <p className="text-center">
      Le chat sera disponible prochainement. Pour l'instant, échangez via
      vos moyens habituels.
    </p>
  </div>
);
