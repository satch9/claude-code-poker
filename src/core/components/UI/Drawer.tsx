import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "../../../shared/utils/cn";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string; // e.g. "w-80", default
}

// Panneau coulissant depuis la droite. Backdrop cliquable pour fermer.
// Mobile : pleine largeur. Desktop : largeur fixe.
export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  width = "sm:w-96",
}) => {
  // Échap pour fermer
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/40 z-40 transition-opacity",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden
      />
      {/* Panneau — tokens Sprint 0 (dark) pour cohérence avec
          TableRightPanel et le reste de l'UI. */}
      <aside
        className={cn(
          "fixed right-0 top-0 h-full w-full max-w-full bg-bg-surface text-text-primary border-l border-border-default shadow-2xl z-50 transition-transform duration-200 flex flex-col",
          width,
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header : padding-top élargi pour passer sous le notch (PWA iOS)
            et garder le titre lisible. Le X reste là pour les utilisateurs
            qui peuvent l'atteindre, mais un bouton "Fermer" duplicate est
            ajouté en bas pour la portée du pouce en portrait. */}
        <header
          className="flex items-center justify-between px-4 pb-3 border-b border-border-default"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
        >
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="min-h-tap min-w-tap text-text-muted hover:text-text-primary inline-flex items-center justify-center px-2"
            aria-label="Fermer"
          >
            <X size={18} aria-hidden />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {/* Bouton Fermer en bas : atteignable au pouce en portrait, et
            respecte le safe-area-inset-bottom pour ne pas passer sous le
            home indicator. */}
        <footer
          className="border-t border-border-default px-4 pt-2 bg-bg-surface"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-tap rounded-lg bg-bg-elevated hover:bg-bg-base text-text-primary font-medium border border-border-default"
          >
            Fermer
          </button>
        </footer>
      </aside>
    </>
  );
};
