import React from "react";
import { cn } from "../../../shared/utils/cn";

interface HeaderActionIconsProps {
  onToggleChat: () => void;
  onToggleSettings: () => void;
  onToggleGameInfo: () => void;
  onToggleInvite: () => void;
  onToggleActions: () => void;
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
    className="px-2 py-1 rounded bg-poker-green-700 hover:bg-poker-green-600 text-base leading-none transition-colors"
  >
    <span aria-hidden>{emoji}</span>
  </button>
);

export const HeaderActionIcons: React.FC<HeaderActionIconsProps> = ({
  onToggleChat,
  onToggleSettings,
  onToggleGameInfo,
  onToggleInvite,
  onToggleActions,
  showInvite,
  className,
}) => {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <IconButton label="Chat" emoji="💬" onClick={onToggleChat} />
      <IconButton label="Paramètres" emoji="⚙️" onClick={onToggleSettings} />
      <IconButton label="Infos partie" emoji="ℹ️" onClick={onToggleGameInfo} />
      {showInvite && (
        <IconButton label="Inviter" emoji="📤" onClick={onToggleInvite} />
      )}
      <IconButton label="Actions récentes" emoji="📜" onClick={onToggleActions} />
    </div>
  );
};
