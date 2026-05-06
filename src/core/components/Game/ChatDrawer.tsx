import React from "react";
import { Drawer } from "../UI/Drawer";

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

// Placeholder : le module Chat sera implémenté plus tard.
export const ChatDrawer: React.FC<ChatDrawerProps> = ({ isOpen, onClose }) => (
  <Drawer isOpen={isOpen} onClose={onClose} title="Chat">
    <div className="text-sm text-gray-600 space-y-3">
      <div className="text-3xl text-center">💬</div>
      <p className="text-center">
        Le chat sera disponible prochainement. Pour l'instant, échangez via vos
        moyens habituels.
      </p>
    </div>
  </Drawer>
);
