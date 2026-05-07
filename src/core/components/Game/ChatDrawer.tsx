import React from "react";
import { Drawer } from "../UI/Drawer";
import { ChatPanel } from "./ChatPanel";

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

// Placeholder : le module Chat sera implémenté plus tard. Réutilise le
// même ChatPanel que le TableRightPanel (desktop) pour cohérence
// visuelle et factorisation du squelette.
export const ChatDrawer: React.FC<ChatDrawerProps> = ({ isOpen, onClose }) => (
  <Drawer isOpen={isOpen} onClose={onClose} title="Chat">
    <ChatPanel />
  </Drawer>
);
