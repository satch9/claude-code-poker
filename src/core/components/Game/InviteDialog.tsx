import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { cn } from "@/shared/utils/cn";

interface InviteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  inviteCode: string;
}

export const InviteDialog: React.FC<InviteDialogProps> = ({
  isOpen,
  onClose,
  inviteCode,
}) => {
  const { isMobile } = useBreakpoint();
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const inviteUrl = `${baseUrl}/?join=${inviteCode}`;

  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyFeedback("Lien copié !");
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch {
      setCopyFeedback("Échec de la copie");
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  };

  const handleShare = async () => {
    if (!canShare) return;
    try {
      await navigator.share({
        title: "Rejoins ma table de poker !",
        text: `Code : ${inviteCode}`,
        url: inviteUrl,
      });
    } catch {
      // L'utilisateur a annulé ou erreur — silencieux
    }
  };

  const qrSize = isMobile ? 160 : 200;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3"
      onClick={onClose}
    >
      <div
        className="bg-bg-surface rounded-2xl shadow-2xl max-w-sm w-full p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text-primary">Inviter des joueurs</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary text-2xl leading-none"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        {/* QR code */}
        <div className="flex justify-center mb-4 p-3 bg-bg-elevated border border-border-default rounded-xl">
          <QRCodeSVG value={inviteUrl} size={qrSize} level="M" marginSize={0} />
        </div>

        {/* Code lisible */}
        <div className="text-center mb-3">
          <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Code</div>
          <div className="text-2xl font-mono font-bold tracking-widest text-text-primary">
            {inviteCode}
          </div>
        </div>

        {/* Lien + copie */}
        <div className="mb-3">
          <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Lien</div>
          <div className="flex gap-2 items-start">
            <Input
              type="text"
              readOnly
              value={inviteUrl}
              className="flex-1 text-xs"
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopy}
              title="Copier le lien"
            >
              📋
            </Button>
          </div>
          {copyFeedback && (
            <div className="text-xs text-sem-success mt-1">{copyFeedback}</div>
          )}
        </div>

        {/* Partager natif */}
        {canShare && (
          <Button variant="primary" onClick={handleShare} className="w-full">
            📲 Partager
          </Button>
        )}

        <div className={cn("text-xs text-text-muted text-center mt-3")}>
          Donne ce lien ou ce code aux personnes que tu veux inviter.
        </div>
      </div>
    </div>
  );
};
