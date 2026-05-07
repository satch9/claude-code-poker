import React from "react";
import { Volume2, Sparkles, Monitor } from "lucide-react";
import { Drawer } from "../UI/Drawer";

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

// Placeholder : panneau Paramètres (sons, animations, affichage). Non câblé.
export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
}) => (
  <Drawer isOpen={isOpen} onClose={onClose} title="Paramètres">
    <ul className="space-y-3 text-sm">
      <li className="flex items-center justify-between border-b border-gray-200 pb-2">
        <span className="inline-flex items-center gap-2"><Volume2 size={16} aria-hidden /> Sons</span>
        <span className="text-gray-400 text-xs">Bientôt</span>
      </li>
      <li className="flex items-center justify-between border-b border-gray-200 pb-2">
        <span className="inline-flex items-center gap-2"><Sparkles size={16} aria-hidden /> Animations</span>
        <span className="text-gray-400 text-xs">Bientôt</span>
      </li>
      <li className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2"><Monitor size={16} aria-hidden /> Affichage</span>
        <span className="text-gray-400 text-xs">Bientôt</span>
      </li>
    </ul>
  </Drawer>
);
