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
    pokerTableContainer: "fixed inset-0 bg-gradient-to-br from-poker-green-800 to-poker-green-900 flex flex-col overflow-hidden mobile-viewport",
    
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
    
    // Bouton dealer
    dealerButton: cn(
      'dealer-button',
      isMobile ? 'w-6 h-6 text-xs' : 'w-10 h-10 text-sm'
    ),
    
    // Container principal de table
    tableContainer: cn(
      'poker-table-main'
    ),
    
    // Table felt
    pokerTableFelt: cn(
      "absolute inset-0 bg-gradient-to-br from-emerald-600 via-green-600 to-emerald-800 shadow-2xl",
      "rounded-full border-12 border-transparent"
    ),
    
    // Espacement center table
    tableCenter: cn(
      'absolute top-1/2 left-1/2 z-table-surface flex flex-col items-center',
      isMobile && 'scale-75'
    ),
    
    // Radius pour positioning
    positioning: {
      radiusX: isMobile ? (isIOS ? 0 : 50) : 50,
      radiusY: isMobile ? (isIOS ? 42 : 35) : 42,
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
    // Contraintes de positionnement
    constraints: {
      minX: 5,
      maxX: 95,
      minY: 10,
      maxY: 90,
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