import React, { useEffect } from 'react';
import { cn } from '../utils/cn';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Hauteur max du sheet (CSS unit). Défaut: 85vh. */
  maxHeight?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxHeight = '85vh',
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div
        data-testid="bottomsheet-backdrop"
        onClick={onClose}
        aria-hidden="true"
        className="fixed inset-0 z-40 bg-black/60 transition-opacity duration-base"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ maxHeight }}
        className={cn(
          // Mobile / tablette portrait : pleine largeur en bas.
          'fixed bottom-0 left-0 right-0 z-50',
          // Desktop ≥ lg : centré horizontalement avec largeur bornée
          // (sinon le formulaire s'étire absurdement). Bordures latérales
          // ajoutées pour fermer la card.
          'lg:left-1/2 lg:right-auto lg:-translate-x-1/2 lg:w-full lg:max-w-2xl lg:border-x lg:border-border-default',
          'bg-bg-surface text-text-primary',
          'rounded-t-xl border-t border-border-default',
          'shadow-2xl',
          'flex flex-col safe-bottom',
          'transition-transform duration-base',
        )}
      >
        <div className="flex justify-center pt-2 pb-1" aria-hidden="true">
          <div className="h-1.5 w-10 rounded-full bg-text-muted/40" />
        </div>
        <header className="flex items-center justify-between px-4 py-2 border-b border-border-default">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="min-h-tap min-w-tap text-text-muted hover:text-text-primary"
          >
            ✕
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </>
  );
};
