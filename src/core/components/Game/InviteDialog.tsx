import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "../UI/Button";
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
        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Inviter des joueurs</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        {/* QR code */}
        <div className="flex justify-center mb-4 p-3 bg-white border border-gray-200 rounded-xl">
          <QRCodeSVG value={inviteUrl} size={qrSize} level="M" marginSize={0} />
        </div>

        {/* Code lisible */}
        <div className="text-center mb-3">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Code</div>
          <div className="text-2xl font-mono font-bold tracking-widest text-gray-900">
            {inviteCode}
          </div>
        </div>

        {/* Lien + copie */}
        <div className="mb-3">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Lien</div>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-700 bg-gray-50"
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
            <div className="text-xs text-green-600 mt-1">{copyFeedback}</div>
          )}
        </div>

        {/* Partager natif */}
        {canShare && (
          <Button variant="primary" onClick={handleShare} className="w-full">
            📲 Partager
          </Button>
        )}

        <div className={cn("text-xs text-gray-500 text-center mt-3")}>
          Donne ce lien ou ce code aux personnes que tu veux inviter.
        </div>
      </div>
    </div>
  );
};
