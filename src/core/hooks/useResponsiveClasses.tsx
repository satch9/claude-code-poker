import { useBreakpoint } from './useBreakpoint';
import { cn } from '@/shared/utils/cn';

/**
 * Hook personnalisé pour les classes Tailwind responsives
 * Centralise la logique responsive et évite la répétition
 */
export const useResponsiveClasses = () => {
  const { isMobile, isTablet, isDesktop, isIOS } = useBreakpoint();
  
  return {
    // Container principal
    // pt/pb safe-area : indispensable en mode PWA fullscreen pour ne pas
    // que le contenu passe sous la barre de statut iOS / le notch / le
    // home indicator. pl/pr couvre les notches latéraux en paysage.
    pokerTableContainer: "fixed inset-0 bg-gradient-to-br from-poker-green-800 to-poker-green-900 flex flex-col overflow-hidden mobile-viewport pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]",
    
    // Tailles de base
    cardSize: isMobile ? 'sm' : isTablet ? 'md' : 'lg',
    
    // Classes communes réutilisables
    padding: isMobile ? 'p-2' : 'p-4',
    gap: isMobile ? 'gap-1' : 'gap-2',
    fontSize: isMobile ? 'text-xs' : 'text-sm',
    
    // Sièges de joueur
    playerSeat: cn(
      'player-seat-base',
      isMobile ? 'w-seat-mobile h-seat-mobile' : 'w-seat-desktop h-seat-desktop'
    ),
    
    // Barres latérales
    sidebarWidth: cn(
      'sidebar-desktop',
      isTablet ? 'w-60' : 'w-80'
    ),
    
    // Bouton dealer style PokerStars (plus large pour afficher "DEALER")
    dealerButton: cn(
      'dealer-button absolute',
      isMobile ? 'w-10 h-5 text-[8px]' : 'w-14 h-6 text-[10px]'
    ),
    
    // Container principal de table
    tableContainer: cn(
      'poker-table-main'
    ),
    
    // Table felt — perspective 3D PokerStars-like (tilt arrière vers le bas)
    pokerTableFelt: cn(
      "absolute inset-0 bg-gradient-to-br from-emerald-600 via-green-600 to-emerald-800 shadow-2xl",
      "rounded-full border-12 border-transparent",
      "table-felt-3d"
    ),
    
    // Espacement center table
    tableCenter: cn(
      'absolute top-1/2 left-1/2 z-table-surface flex flex-col items-center',
      isMobile && 'scale-75'
    ),
    
    // Radius pour positioning.
    // radiusY agrandi (45 mobile, 50 desktop) pour pousser les sièges N/S
    // quasiment hors du feutre (qui est scaleY(0.7) ≈ centre vertical 70%),
    // libérant de la place au centre pour le pot + community cards.
    // Pas d'override iOS (radiusX=0 empilait tous les sièges au centre) :
    // le heads-up portrait iOS a sa branche dédiée dans PokerTable.tsx,
    // les autres cas iOS doivent utiliser le même layout que mobile non-iOS.
    positioning: {
      radiusX: 50,
      radiusY: isMobile ? 55 : 50,
    },
    
    // Classes d'état des joueurs
    playerStates: {
      active: 'player-seat-active',
      current: 'player-seat-current', 
      folded: 'player-seat-folded',
      allIn: 'player-seat-allin',
    },
    
    // Classes pour cartes
    cardClasses: {
      base: 'card-base',
      hidden: 'card-hidden',
      visible: 'card-visible',
      spacing: isMobile ? 'gap-1' : 'gap-1.5',
    },
    
    // Classes pour modals
    modalClasses: {
      backdrop: 'modal-backdrop',
      content: 'modal-content',
    },
    
    // Classes tactiles (mobile)
    touchTarget: 'touch-target',
    
    // Utilitaires responsive communs
    responsiveText: 'responsive-text',
    responsivePadding: 'responsive-padding', 
    responsiveGap: 'responsive-gap',
    
    // Valeurs brutes pour calculs
    values: {
      isMobile,
      isTablet, 
      isDesktop,
      isIOS,
    },
  };
};

// Hook spécialisé pour les positions des sièges
export const useSeatPositioning = () => {
  const { values: { isMobile }, positioning } = useResponsiveClasses();

  return {
    // Contraintes de positionnement.
    // Mobile resserré (par moitié seulement par rapport au desktop) :
    // 11/89 et 5/95. Cela laisse les seats hugger le bord du feutre
    // sans les pousser vers l'intérieur. Avec un seat 8rem, certains
    // peuvent légèrement déborder visuellement du feutre (mais pas du
    // viewport contenant), c'est l'effet PokerStars recherché.
    // Mobile : seat = 7rem (112px). Sur Samsung 360px viewport, half-width
    // ≈ 16% donc on borne le centre à [16, 84] pour garantir que le seat
    // reste entièrement visible (initiales + somme non tronquées).
    constraints: {
      minX: isMobile ? 16 : 3,
      maxX: isMobile ? 84 : 97,
      minY: isMobile ? -5 : 3,
      maxY: isMobile ? 105 : 97,
    },
    
    // Radius selon l'écran
    radius: positioning,
    
    // Transform pour compensation ovale
    seatTransform: 'scaleY(1.43)',
    tableTransform: 'scaleY(0.7)',
    
    // Offset pour cartes
    cardOffsets: {
      base: isMobile ? 16 : 24,
      current: isMobile ? 20 : 28,
    },
  };
};