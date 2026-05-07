import React from "react";
import { cn } from "../../../shared/utils/cn";

interface HeaderActionIconsProps {
  onToggleChat: () => void;
  onToggleSettings: () => void;
  onToggleInvite: () => void;
  onToggleActions: () => void;
  showInvite: boolean; // false si user pas créateur (icône cachée)
  /** Quand le TableRightPanel est monté, on cache les icônes redondantes
   *  (Chat et Actions récentes — couvertes par les onglets du panneau). */
  hideRedundantTabs?: boolean;
  className?: string;
}

const IconButton: React.FC<{
  label: string;
  emoji: string;
  onClick: () => void;
}> = ({ label, emoji, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    aria-label={label}
    className="min-h-tap min-w-tap h-10 px-3 inline-flex items-center justify-center rounded-md bg-bg-elevated hover:bg-bg-surface text-text-primary border border-border-default text-base leading-none transition-colors"
  >
    <span aria-hidden>{emoji}</span>
  </button>
);

export const HeaderActionIcons: React.FC<HeaderActionIconsProps> = ({
  onToggleChat,
  onToggleSettings,
  onToggleInvite,
  onToggleActions,
  showInvite,
  hideRedundantTabs = false,
  className,
}) => {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {!hideRedundantTabs && <IconButton label="Chat" emoji="💬" onClick={onToggleChat} />}
      <IconButton label="Paramètres" emoji="⚙️" onClick={onToggleSettings} />
      {showInvite && (
        <IconButton label="Inviter" emoji="📤" onClick={onToggleInvite} />
      )}
      {!hideRedundantTabs && <IconButton label="Actions récentes" emoji="📜" onClick={onToggleActions} />}
    </div>
  );
};
