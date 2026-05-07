import React from "react";
import { cn } from "../../../shared/utils/cn";

interface HeaderActionIconsProps {
  onTogglePanel: () => void; // Joueurs / Historique / Chat (drawer)
  onToggleSettings: () => void;
  onToggleInvite: () => void;
  showInvite: boolean; // false si user pas créateur (icône cachée)
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
  onTogglePanel,
  onToggleSettings,
  onToggleInvite,
  showInvite,
  className,
}) => {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <IconButton label="Joueurs / Historique / Chat" emoji="👥" onClick={onTogglePanel} />
      <IconButton label="Paramètres" emoji="⚙️" onClick={onToggleSettings} />
      {showInvite && (
        <IconButton label="Inviter" emoji="📤" onClick={onToggleInvite} />
      )}
    </div>
  );
};
