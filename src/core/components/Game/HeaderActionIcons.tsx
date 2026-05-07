import React from "react";
import { Users, Settings, Send } from "lucide-react";
import { cn } from "../../../shared/utils/cn";

interface HeaderActionIconsProps {
  onTogglePanel: () => void; // Joueurs / Historique / Chat (drawer)
  onToggleSettings: () => void;
  onToggleInvite: () => void;
  showInvite: boolean; // false si user pas créateur (icône cachée)
  unreadChat?: number;
  className?: string;
}

const IconButton: React.FC<{
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  badge?: React.ReactNode;
}> = ({ label, icon, onClick, badge }) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    aria-label={label}
    className="relative min-h-tap min-w-tap h-10 px-3 inline-flex items-center justify-center rounded-md bg-bg-elevated hover:bg-bg-surface text-text-primary border border-border-default transition-colors"
  >
    {icon}
    {badge}
  </button>
);

export const HeaderActionIcons: React.FC<HeaderActionIconsProps> = ({
  onTogglePanel,
  onToggleSettings,
  onToggleInvite,
  showInvite,
  unreadChat = 0,
  className,
}) => {
  const chatBadge =
    unreadChat > 0 ? (
      <span
        aria-label={`${unreadChat} message${unreadChat > 1 ? "s" : ""} non lu${unreadChat > 1 ? "s" : ""}`}
        className="absolute -top-1 -right-1 inline-flex items-center justify-center text-[10px] font-bold bg-accent text-white rounded-full min-w-[18px] h-[18px] px-1"
      >
        {unreadChat > 9 ? "9+" : unreadChat}
      </span>
    ) : undefined;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <IconButton
        label="Joueurs / Historique / Chat"
        icon={<Users size={18} aria-hidden />}
        onClick={onTogglePanel}
        badge={chatBadge}
      />
      <IconButton label="Paramètres" icon={<Settings size={18} aria-hidden />} onClick={onToggleSettings} />
      {showInvite && (
        <IconButton label="Inviter" icon={<Send size={18} aria-hidden />} onClick={onToggleInvite} />
      )}
    </div>
  );
};
