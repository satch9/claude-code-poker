# Sprint 0 — Fondations mobile-first — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poser les fondations du design system mobile-first (tokens Tailwind étendus, primitives partagées dans `src/shared/ui/`, hook `useOrientation`, et `AppShell` responsive avec bottom tabs / sidebar / top header / safe areas / bandeau "table active") sans régression sur les écrans existants.

**Architecture:** On introduit un nouveau dossier `src/shared/ui/` à côté du `src/core/components/UI/` existant (qui reste en place pour les écrans non encore refondus). Tailwind est étendu avec les nouveaux tokens (breakpoints `xs 320`, échelle d'espacement, couleurs `bg-base`/`bg-surface`/`bg-elevated`, accent primaire bleu, sémantiques) sans casser les tokens `poker-green` existants. `AppShell` enveloppe le contenu actuel d'`AppMain` et fournit le chrome responsive ; le mode "fullscreen" est activé pour la vue table.

**Tech Stack:** Vite 5 + React 18 + TypeScript 6 + Tailwind 3.3.6 + Vitest 4 + jsdom + @testing-library/react.

---

## File Structure

### Files to create

| Path | Purpose |
|---|---|
| `src/shared/ui/index.ts` | Barrel export des primitives |
| `src/shared/ui/Button.tsx` | Primitive bouton mobile-first (44px tap target min) |
| `src/shared/ui/Card.tsx` | Primitive carte (container) |
| `src/shared/ui/Input.tsx` | Primitive input (text/number/password) |
| `src/shared/ui/BottomSheet.tsx` | Sheet glissant depuis le bas avec backdrop + escape + drag handle |
| `src/shared/ui/TabBar.tsx` | Bottom tab bar (mobile) / Sidebar rail (desktop) |
| `src/shared/ui/AppShell.tsx` | Shell responsive (header + tabs/sidebar + outlet + bandeau) |
| `src/shared/hooks/useOrientation.ts` | Hook portrait/landscape |
| `src/shared/hooks/useMediaQuery.ts` | Hook utilitaire matchMedia |
| `src/shared/styles/tokens.css` | Variables CSS (couleurs feutre table) |
| `tests/ui/setup.ts` | Setup jsdom + jest-dom matchers |
| `tests/ui/Button.test.tsx` | Tests Button |
| `tests/ui/Card.test.tsx` | Tests Card |
| `tests/ui/Input.test.tsx` | Tests Input |
| `tests/ui/BottomSheet.test.tsx` | Tests BottomSheet |
| `tests/ui/TabBar.test.tsx` | Tests TabBar |
| `tests/ui/AppShell.test.tsx` | Tests AppShell |
| `tests/ui/useOrientation.test.tsx` | Tests hook |

### Files to modify

| Path | Reason |
|---|---|
| `package.json` | Ajouter `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` |
| `vitest.config.js` | Ajouter `environment: 'jsdom'` (ou pool conditionnel), inclure `tests/ui/**`, `setupFiles` |
| `tsconfig.json` | Ajouter `"types": ["vitest/globals", "@testing-library/jest-dom"]` si nécessaire |
| `tailwind.config.js` | Étendre avec breakpoints `screens`, couleurs `bg-base/bg-surface/...`, durées motion |
| `src/index.css` | Importer `tokens.css`, ajouter classes utilitaires safe-area |
| `src/core/components/App/AppMain.tsx` | Envelopper `AppContent` dans `AppShell`, masquer chrome en vue table |

### Files NOT touched in Sprint 0

- `src/core/components/UI/Button.tsx`, `Card.tsx`, `Chip.tsx`, `Drawer.tsx` — legacy, restent en place pour les écrans non refondus.
- Tous les écrans existants (`Lobby`, `PokerTable`, `StatsPage`, `CreateTableForm`, `LoginForm`) — non touchés au Sprint 0, juste enveloppés par AppShell.
- Le moteur Convex — aucun changement backend.

---

## Task 1 : Setup infrastructure de test pour composants React

**Files:**
- Modify: `package.json`
- Modify: `vitest.config.js`
- Create: `tests/ui/setup.ts`
- Create: `tests/ui/smoke.test.tsx`

- [ ] **Step 1.1 : Installer les dépendances de test**

```bash
npm install --save-dev jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Expected: 4 packages installés sans warnings critiques. Vérifier `package.json` les liste dans `devDependencies`.

- [ ] **Step 1.2 : Créer le fichier de setup `tests/ui/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
```

- [ ] **Step 1.3 : Mettre à jour `vitest.config.js`**

```js
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    include: [
      'tests/**/*.test.js',
      'tests/**/*.test.ts',
      'tests/**/*.test.tsx',
    ],
    timeout: 10000,
    environmentMatchGlobs: [
      ['tests/ui/**', 'jsdom'],
    ],
    setupFiles: ['tests/ui/setup.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@convex': path.resolve(__dirname, './convex'),
    }
  }
});
```

Note: `environmentMatchGlobs` permet de garder `node` par défaut (tests poker) tout en activant `jsdom` pour `tests/ui/**`.

- [ ] **Step 1.4 : Écrire le smoke test `tests/ui/smoke.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('UI test setup', () => {
  it('renders a React element with jsdom + jest-dom matchers', () => {
    render(<button type="button">click</button>);
    expect(screen.getByRole('button', { name: 'click' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 1.5 : Lancer les tests UI et vérifier**

Run: `npx vitest run tests/ui/smoke.test.tsx`
Expected: `1 passed`. Si échec sur `toBeInTheDocument`, vérifier l'import setup.

- [ ] **Step 1.6 : Vérifier que les tests existants passent toujours**

Run: `npm run test -- --run`
Expected: tous les tests passent (poker-integrity, blindStructure, etc.) en plus du smoke test.

- [ ] **Step 1.7 : Commit**

```bash
git add package.json package-lock.json vitest.config.js tests/ui/setup.ts tests/ui/smoke.test.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "chore(test): infra Vitest + jsdom + Testing Library pour composants UI"
```

---

## Task 2 : Étendre `tailwind.config.js` avec les nouveaux tokens

**Files:**
- Modify: `tailwind.config.js`
- Create: `src/shared/styles/tokens.css`
- Modify: `src/index.css`

- [ ] **Step 2.1 : Étendre `tailwind.config.js`**

Ouvrir `tailwind.config.js` et ajouter dans `theme.extend` (en gardant tout l'existant) les blocs suivants. Si une clé existe déjà (ex: `colors`), fusionner sans écraser.

Ajouter au tout début de `theme.extend` :

```js
      screens: {
        'xs': '320px',
        'sm': '375px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
```

Dans `theme.extend.colors`, ajouter (en plus des existants `poker-green`, `poker-gold`, `poker`) :

```js
        'bg-base': '#0B0F14',
        'bg-surface': '#151B23',
        'bg-elevated': '#1E2630',
        'text-primary': '#E6EDF3',
        'text-muted': '#8B98A8',
        'border-default': '#2A3340',
        'accent': {
          DEFAULT: '#3B82F6',
          hover: '#2563EB',
        },
        'sem': {
          success: '#10B981',
          danger: '#EF4444',
          warning: '#F59E0B',
          info: '#06B6D4',
        },
        'felt': {
          DEFAULT: '#0F4C3A',
          rim: '#1A2E26',
        },
        'gold': '#D4AF37',
```

Dans `theme.extend`, ajouter :

```js
      transitionDuration: {
        'fast': '120ms',
        'base': '200ms',
        'slow': '320ms',
      },
      minHeight: {
        'tap': '44px',
        'tap-comfort': '48px',
      },
      minWidth: {
        'tap': '44px',
        'tap-comfort': '48px',
      },
```

- [ ] **Step 2.2 : Créer `src/shared/styles/tokens.css`**

```css
/* Tokens CSS dynamiques (exposés en variables pour usages runtime, ex: feutre table). */
:root {
  --felt: #0F4C3A;
  --felt-rim: #1A2E26;
  --gold: #D4AF37;
  --tap-min: 44px;
  --tap-comfort: 48px;
  --motion-fast: 120ms;
  --motion-base: 200ms;
  --motion-slow: 320ms;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-fast: 0ms;
    --motion-base: 0ms;
    --motion-slow: 0ms;
  }
}

/* Helpers safe-area iOS (notch + home indicator). */
.safe-top {
  padding-top: env(safe-area-inset-top);
}
.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
.safe-x {
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

- [ ] **Step 2.3 : Importer `tokens.css` dans `src/index.css`**

Au début de `src/index.css`, juste après les `@tailwind` directives :

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import './shared/styles/tokens.css';
```

(Note : Tailwind impose que les `@import` non-utilities passent via PostCSS ; vite + tailwind 3.3 gèrent cet ordre correctement avec autoprefixer.)

- [ ] **Step 2.4 : Vérifier le build et le typecheck**

Run: `npm run typecheck`
Expected: 0 erreur.

Run: `npm run build`
Expected: build réussi sans warnings Tailwind.

- [ ] **Step 2.5 : Commit**

```bash
git add tailwind.config.js src/shared/styles/tokens.css src/index.css
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(tokens): étendre Tailwind avec breakpoints xs..2xl, couleurs UI, motion, tap targets"
```

---

## Task 3 : Hook `useMediaQuery` (utilitaire bas niveau)

**Files:**
- Create: `src/shared/hooks/useMediaQuery.ts`
- Create: `tests/ui/useMediaQuery.test.tsx`

- [ ] **Step 3.1 : Écrire le test `tests/ui/useMediaQuery.test.tsx` (DOIT ÉCHOUER)**

```tsx
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMediaQuery } from '../../src/shared/hooks/useMediaQuery';

type MQListener = (e: { matches: boolean }) => void;

function mockMatchMedia(matches: boolean) {
  let listener: MQListener | null = null;
  const mql = {
    matches,
    media: '',
    addEventListener: (_: string, cb: MQListener) => {
      listener = cb;
    },
    removeEventListener: () => {
      listener = null;
    },
    dispatchEvent: () => true,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
  };
  window.matchMedia = vi.fn().mockReturnValue(mql);
  return {
    fire: (m: boolean) => {
      mql.matches = m;
      listener?.({ matches: m });
    },
  };
}

describe('useMediaQuery', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the initial match value', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(result.current).toBe(true);
  });

  it('updates when the media query changes', () => {
    const ctrl = mockMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(result.current).toBe(false);
    act(() => ctrl.fire(true));
    expect(result.current).toBe(true);
  });
});
```

- [ ] **Step 3.2 : Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run tests/ui/useMediaQuery.test.tsx`
Expected: FAIL avec "Cannot find module" ou équivalent.

- [ ] **Step 3.3 : Implémenter `src/shared/hooks/useMediaQuery.ts`**

```ts
import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const getMatch = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false;

  const [matches, setMatches] = useState<boolean>(getMatch);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent | { matches: boolean }) => {
      setMatches(e.matches);
    };
    setMatches(mql.matches);
    mql.addEventListener('change', onChange as (e: MediaQueryListEvent) => void);
    return () => {
      mql.removeEventListener('change', onChange as (e: MediaQueryListEvent) => void);
    };
  }, [query]);

  return matches;
}
```

- [ ] **Step 3.4 : Lancer les tests**

Run: `npx vitest run tests/ui/useMediaQuery.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 3.5 : Commit**

```bash
git add src/shared/hooks/useMediaQuery.ts tests/ui/useMediaQuery.test.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(hooks): useMediaQuery (matchMedia avec souscription)"
```

---

## Task 4 : Hook `useOrientation`

**Files:**
- Create: `src/shared/hooks/useOrientation.ts`
- Create: `tests/ui/useOrientation.test.tsx`

- [ ] **Step 4.1 : Écrire le test (DOIT ÉCHOUER)**

```tsx
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useOrientation } from '../../src/shared/hooks/useOrientation';

function mockMatchMedia(landscapeMatches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: q.includes('landscape') ? landscapeMatches : !landscapeMatches,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
  }));
}

describe('useOrientation', () => {
  it('returns "portrait" when not landscape', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useOrientation());
    expect(result.current).toBe('portrait');
  });

  it('returns "landscape" when landscape media matches', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useOrientation());
    expect(result.current).toBe('landscape');
  });
});
```

- [ ] **Step 4.2 : Vérifier l'échec**

Run: `npx vitest run tests/ui/useOrientation.test.tsx`
Expected: FAIL.

- [ ] **Step 4.3 : Implémenter `src/shared/hooks/useOrientation.ts`**

```ts
import { useMediaQuery } from './useMediaQuery';

export type Orientation = 'portrait' | 'landscape';

export function useOrientation(): Orientation {
  const isLandscape = useMediaQuery('(orientation: landscape)');
  return isLandscape ? 'landscape' : 'portrait';
}
```

- [ ] **Step 4.4 : Vérifier le pass**

Run: `npx vitest run tests/ui/useOrientation.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 4.5 : Commit**

```bash
git add src/shared/hooks/useOrientation.ts tests/ui/useOrientation.test.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(hooks): useOrientation (portrait/landscape) basé sur useMediaQuery"
```

---

## Task 5 : Primitive `Button` (`src/shared/ui/`)

**Files:**
- Create: `src/shared/ui/Button.tsx`
- Create: `tests/ui/Button.test.tsx`

- [ ] **Step 5.1 : Test (DOIT ÉCHOUER)**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '../../src/shared/ui/Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Hello</Button>);
    expect(screen.getByRole('button', { name: 'Hello' })).toBeInTheDocument();
  });

  it('respects min tap target on size md (44px)', () => {
    render(<Button size="md">Tap</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toMatch(/min-h-tap/);
  });

  it('applies primary variant by default', () => {
    render(<Button>Default</Button>);
    expect(screen.getByRole('button').className).toMatch(/bg-accent/);
  });

  it('applies danger variant', () => {
    render(<Button variant="danger">Fold</Button>);
    expect(screen.getByRole('button').className).toMatch(/bg-sem-danger/);
  });

  it('disables when loading and shows spinner', () => {
    render(<Button loading>Submit</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn.querySelector('svg')).toBeTruthy();
  });

  it('triggers onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Tap</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 5.2 : Vérifier l'échec**

Run: `npx vitest run tests/ui/Button.test.tsx`
Expected: FAIL (module introuvable).

- [ ] **Step 5.3 : Implémenter `src/shared/ui/Button.tsx`**

```tsx
import React from 'react';
import { cn } from '../utils/cn';

type Variant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: React.ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-hover active:bg-accent-hover',
  secondary: 'bg-bg-elevated text-text-primary hover:bg-bg-surface border border-border-default',
  danger: 'bg-sem-danger text-white hover:opacity-90 active:opacity-80',
  success: 'bg-sem-success text-white hover:opacity-90 active:opacity-80',
  ghost: 'bg-transparent text-text-primary hover:bg-bg-elevated',
};

const SIZES: Record<Size, string> = {
  sm: 'min-h-tap px-3 text-sm',
  md: 'min-h-tap px-4 text-base',
  lg: 'min-h-tap-comfort px-6 text-lg',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium',
          'transition-colors duration-base',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base',
          'disabled:opacity-50 disabled:pointer-events-none',
          VARIANTS[variant],
          SIZES[size],
          className,
        )}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
```

Crée aussi le fichier `src/shared/utils/cn.ts` ? Non — il existe déjà à `src/shared/utils/cn.ts`. Vérifier l'import : depuis `src/shared/ui/Button.tsx`, le chemin relatif est `../utils/cn`.

- [ ] **Step 5.4 : Vérifier le pass**

Run: `npx vitest run tests/ui/Button.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5.5 : Commit**

```bash
git add src/shared/ui/Button.tsx tests/ui/Button.test.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(ui): Button primitive mobile-first (variants, sizes, loading, 44px tap min)"
```

---

## Task 6 : Primitive `Card`

**Files:**
- Create: `src/shared/ui/Card.tsx`
- Create: `tests/ui/Card.test.tsx`

- [ ] **Step 6.1 : Test (DOIT ÉCHOUER)**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card } from '../../src/shared/ui/Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>content</Card>);
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('applies default surface background', () => {
    const { container } = render(<Card>x</Card>);
    expect(container.firstChild).toHaveClass('bg-bg-surface');
  });

  it('supports elevated variant', () => {
    const { container } = render(<Card variant="elevated">x</Card>);
    expect(container.firstChild).toHaveClass('bg-bg-elevated');
  });

  it('forwards className', () => {
    const { container } = render(<Card className="custom">x</Card>);
    expect(container.firstChild).toHaveClass('custom');
  });
});
```

- [ ] **Step 6.2 : Vérifier l'échec**

Run: `npx vitest run tests/ui/Card.test.tsx`
Expected: FAIL.

- [ ] **Step 6.3 : Implémenter `src/shared/ui/Card.tsx`**

```tsx
import React from 'react';
import { cn } from '../utils/cn';

type Variant = 'surface' | 'elevated';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  children: React.ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  surface: 'bg-bg-surface border border-border-default',
  elevated: 'bg-bg-elevated border border-border-default shadow-lg',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'surface', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('rounded-lg p-4 text-text-primary', VARIANTS[variant], className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';
```

- [ ] **Step 6.4 : Vérifier le pass**

Run: `npx vitest run tests/ui/Card.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 6.5 : Commit**

```bash
git add src/shared/ui/Card.tsx tests/ui/Card.test.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(ui): Card primitive (variants surface/elevated)"
```

---

## Task 7 : Primitive `Input`

**Files:**
- Create: `src/shared/ui/Input.tsx`
- Create: `tests/ui/Input.test.tsx`

- [ ] **Step 7.1 : Test (DOIT ÉCHOUER)**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Input } from '../../src/shared/ui/Input';

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('shows error message and aria-invalid', () => {
    render(<Input label="Email" error="Required" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('has min tap height', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email').className).toMatch(/min-h-tap/);
  });

  it('forwards onChange', async () => {
    const onChange = vi.fn();
    render(<Input label="Email" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText('Email'), 'a');
    expect(onChange).toHaveBeenCalled();
  });
});
```

- [ ] **Step 7.2 : Vérifier l'échec**

Run: `npx vitest run tests/ui/Input.test.tsx`
Expected: FAIL.

- [ ] **Step 7.3 : Implémenter `src/shared/ui/Input.tsx`**

```tsx
import React, { useId } from 'react';
import { cn } from '../utils/cn';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ id, label, error, hint, className, type = 'text', ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const hasError = Boolean(error);
    const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm text-text-muted">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy}
          className={cn(
            'min-h-tap rounded-lg px-3 py-2 text-base',
            'bg-bg-elevated text-text-primary placeholder:text-text-muted',
            'border border-border-default',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            hasError && 'border-sem-danger focus-visible:ring-sem-danger',
            className,
          )}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-sem-danger">
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={`${inputId}-hint`} className="text-xs text-text-muted">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
```

- [ ] **Step 7.4 : Vérifier le pass**

Run: `npx vitest run tests/ui/Input.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 7.5 : Commit**

```bash
git add src/shared/ui/Input.tsx tests/ui/Input.test.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(ui): Input primitive (label, error, hint, aria-invalid, 44px tap min)"
```

---

## Task 8 : Primitive `BottomSheet`

**Files:**
- Create: `src/shared/ui/BottomSheet.tsx`
- Create: `tests/ui/BottomSheet.test.tsx`

**Périmètre Sprint 0** : open/close contrôlé, backdrop cliquable, fermeture Escape, drag handle visuel (pas de geste swipe-to-dismiss au Sprint 0 — ajouté Sprint 1 si besoin), scroll lock du body, animation de translation. PAS de focus trap complet (à ajouter au Sprint 6 polish accessibilité).

- [ ] **Step 8.1 : Test (DOIT ÉCHOUER)**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { BottomSheet } from '../../src/shared/ui/BottomSheet';

describe('BottomSheet', () => {
  it('does not render content when closed', () => {
    render(
      <BottomSheet isOpen={false} onClose={() => {}} title="t">
        <div>hidden</div>
      </BottomSheet>,
    );
    expect(screen.queryByText('hidden')).toBeNull();
  });

  it('renders content when open', () => {
    render(
      <BottomSheet isOpen={true} onClose={() => {}} title="My Sheet">
        <div>visible</div>
      </BottomSheet>,
    );
    expect(screen.getByText('visible')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'My Sheet' })).toBeInTheDocument();
  });

  it('calls onClose when backdrop clicked', async () => {
    const onClose = vi.fn();
    render(
      <BottomSheet isOpen={true} onClose={onClose} title="t">
        <div>x</div>
      </BottomSheet>,
    );
    await userEvent.click(screen.getByTestId('bottomsheet-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose on Escape key', async () => {
    const onClose = vi.fn();
    render(
      <BottomSheet isOpen={true} onClose={onClose} title="t">
        <div>x</div>
      </BottomSheet>,
    );
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('locks body scroll when open', () => {
    const { rerender } = render(
      <BottomSheet isOpen={false} onClose={() => {}} title="t">
        <div>x</div>
      </BottomSheet>,
    );
    expect(document.body.style.overflow).not.toBe('hidden');
    rerender(
      <BottomSheet isOpen={true} onClose={() => {}} title="t">
        <div>x</div>
      </BottomSheet>,
    );
    expect(document.body.style.overflow).toBe('hidden');
  });
});
```

- [ ] **Step 8.2 : Vérifier l'échec**

Run: `npx vitest run tests/ui/BottomSheet.test.tsx`
Expected: FAIL.

- [ ] **Step 8.3 : Implémenter `src/shared/ui/BottomSheet.tsx`**

```tsx
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
          'fixed bottom-0 left-0 right-0 z-50',
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
```

- [ ] **Step 8.4 : Vérifier le pass**

Run: `npx vitest run tests/ui/BottomSheet.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 8.5 : Commit**

```bash
git add src/shared/ui/BottomSheet.tsx tests/ui/BottomSheet.test.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(ui): BottomSheet primitive (backdrop, escape, scroll lock, drag handle)"
```

---

## Task 9 : Primitive `TabBar`

**Files:**
- Create: `src/shared/ui/TabBar.tsx`
- Create: `tests/ui/TabBar.test.tsx`

**Périmètre** : `TabBar` est un composant générique qui prend une liste d'items et un id actif, et invoque un callback. Il s'affiche en bottom bar fixe sur `< lg` et en sidebar verticale sur `lg+` (variant déterminé par prop, pas par media query — l'`AppShell` choisit selon `useMediaQuery`).

- [ ] **Step 9.1 : Test (DOIT ÉCHOUER)**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { TabBar } from '../../src/shared/ui/TabBar';

const items = [
  { id: 'lobby', label: 'Lobby', icon: <span aria-hidden>🃏</span> },
  { id: 'tournois', label: 'Tournois', icon: <span aria-hidden>🏆</span> },
  { id: 'stats', label: 'Stats', icon: <span aria-hidden>📊</span> },
  { id: 'profil', label: 'Profil', icon: <span aria-hidden>👤</span> },
];

describe('TabBar', () => {
  it('renders all items', () => {
    render(<TabBar items={items} activeId="lobby" onChange={() => {}} variant="bottom" />);
    items.forEach((it) => {
      expect(screen.getByRole('tab', { name: it.label })).toBeInTheDocument();
    });
  });

  it('marks the active item', () => {
    render(<TabBar items={items} activeId="stats" onChange={() => {}} variant="bottom" />);
    expect(screen.getByRole('tab', { name: 'Stats' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Lobby' })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onChange when an item is clicked', async () => {
    const onChange = vi.fn();
    render(<TabBar items={items} activeId="lobby" onChange={onChange} variant="bottom" />);
    await userEvent.click(screen.getByRole('tab', { name: 'Tournois' }));
    expect(onChange).toHaveBeenCalledWith('tournois');
  });

  it('renders as bottom bar by default styling', () => {
    const { container } = render(
      <TabBar items={items} activeId="lobby" onChange={() => {}} variant="bottom" />,
    );
    expect(container.firstChild).toHaveClass('fixed');
    expect(container.firstChild).toHaveClass('bottom-0');
  });

  it('renders as sidebar in rail variant', () => {
    const { container } = render(
      <TabBar items={items} activeId="lobby" onChange={() => {}} variant="rail" />,
    );
    expect(container.firstChild).toHaveClass('flex-col');
  });
});
```

- [ ] **Step 9.2 : Vérifier l'échec**

Run: `npx vitest run tests/ui/TabBar.test.tsx`
Expected: FAIL.

- [ ] **Step 9.3 : Implémenter `src/shared/ui/TabBar.tsx`**

```tsx
import React from 'react';
import { cn } from '../utils/cn';

export interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export interface TabBarProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  variant: 'bottom' | 'rail';
}

export const TabBar: React.FC<TabBarProps> = ({ items, activeId, onChange, variant }) => {
  const isBottom = variant === 'bottom';

  return (
    <nav
      role="tablist"
      aria-label="Navigation principale"
      className={cn(
        'bg-bg-surface border-border-default text-text-primary',
        isBottom
          ? 'fixed bottom-0 left-0 right-0 z-30 flex h-14 border-t safe-bottom'
          : 'flex flex-col w-[72px] h-full border-r py-2 gap-1',
      )}
    >
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            className={cn(
              'flex items-center justify-center min-h-tap-comfort',
              'transition-colors duration-fast',
              isBottom ? 'flex-1 flex-col gap-0.5' : 'w-full flex-col gap-1 py-2',
              isActive ? 'text-accent' : 'text-text-muted hover:text-text-primary',
            )}
          >
            <span className="relative inline-flex">
              {item.icon}
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span
                  aria-label={`${item.badge} non lus`}
                  className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-sem-danger text-[10px] font-semibold text-white inline-flex items-center justify-center"
                >
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </span>
            <span className={cn('text-xs', !isBottom && 'sr-only')}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
```

- [ ] **Step 9.4 : Vérifier le pass**

Run: `npx vitest run tests/ui/TabBar.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 9.5 : Commit**

```bash
git add src/shared/ui/TabBar.tsx tests/ui/TabBar.test.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(ui): TabBar primitive (bottom/rail variants, badges, aria-tablist)"
```

---

## Task 10 : Barrel d'export `src/shared/ui/index.ts`

**Files:**
- Create: `src/shared/ui/index.ts`

- [ ] **Step 10.1 : Créer le fichier**

```ts
export { Button } from './Button';
export type { ButtonProps } from './Button';

export { Card } from './Card';
export type { CardProps } from './Card';

export { Input } from './Input';
export type { InputProps } from './Input';

export { BottomSheet } from './BottomSheet';
export type { BottomSheetProps } from './BottomSheet';

export { TabBar } from './TabBar';
export type { TabBarProps, TabItem } from './TabBar';

export { AppShell } from './AppShell';
export type { AppShellProps } from './AppShell';
```

Note: `AppShell` n'existe pas encore. Le barrel est créé en avance ; l'import sera satisfait après la Task 11.

- [ ] **Step 10.2 : Commit (différé après Task 11)**

Pas de commit immédiat — on commit le barrel avec AppShell pour avoir un état de repo cohérent.

---

## Task 11 : `AppShell` (composition responsive)

**Files:**
- Create: `src/shared/ui/AppShell.tsx`
- Create: `tests/ui/AppShell.test.tsx`

**Rôle** : envelopper le contenu de l'app. Affiche en haut un top header contextuel (titre + 1 action), au milieu un outlet (children), et en bas une bottom tab bar (`< lg`) ou rail latéral à gauche (`lg+`). Permet aussi un mode `fullscreen` qui masque tout le chrome (pour la table). Affiche un emplacement de bandeau "table active" (la donnée sera câblée Sprint 2 ; pour Sprint 0, le slot accepte un `activeTableBanner` optionnel).

L'`AppShell` ne gère PAS la navigation logique — il reçoit `activeTabId` et `onTabChange` en props et le composant parent reste maître du routage.

- [ ] **Step 11.1 : Test (DOIT ÉCHOUER)**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppShell } from '../../src/shared/ui/AppShell';

const tabs = [
  { id: 'lobby', label: 'Lobby', icon: <span>🃏</span> },
  { id: 'profil', label: 'Profil', icon: <span>👤</span> },
];

function mockMatchMedia(matchesLg: boolean) {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: q.includes('1024') ? matchesLg : false,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
  }));
}

describe('AppShell', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('renders title and children', () => {
    mockMatchMedia(false);
    render(
      <AppShell title="Lobby" tabs={tabs} activeTabId="lobby" onTabChange={() => {}}>
        <div>main content</div>
      </AppShell>,
    );
    expect(screen.getByText('Lobby')).toBeInTheDocument();
    expect(screen.getByText('main content')).toBeInTheDocument();
  });

  it('renders bottom TabBar on mobile (< lg)', () => {
    mockMatchMedia(false);
    render(
      <AppShell title="t" tabs={tabs} activeTabId="lobby" onTabChange={() => {}}>
        <div>x</div>
      </AppShell>,
    );
    const nav = screen.getByRole('tablist');
    expect(nav).toHaveClass('fixed');
    expect(nav).toHaveClass('bottom-0');
  });

  it('renders rail TabBar on desktop (>= lg)', () => {
    mockMatchMedia(true);
    render(
      <AppShell title="t" tabs={tabs} activeTabId="lobby" onTabChange={() => {}}>
        <div>x</div>
      </AppShell>,
    );
    expect(screen.getByRole('tablist')).toHaveClass('flex-col');
  });

  it('hides chrome in fullscreen mode', () => {
    mockMatchMedia(false);
    render(
      <AppShell title="t" tabs={tabs} activeTabId="lobby" onTabChange={() => {}} fullscreen>
        <div>game</div>
      </AppShell>,
    );
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByText('t')).toBeNull();
    expect(screen.getByText('game')).toBeInTheDocument();
  });

  it('renders headerAction button when provided', async () => {
    mockMatchMedia(false);
    const onAction = vi.fn();
    render(
      <AppShell
        title="Lobby"
        tabs={tabs}
        activeTabId="lobby"
        onTabChange={() => {}}
        headerAction={{ label: 'Créer', onClick: onAction }}
      >
        <div>x</div>
      </AppShell>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Créer' }));
    expect(onAction).toHaveBeenCalled();
  });

  it('renders activeTableBanner when provided', () => {
    mockMatchMedia(false);
    render(
      <AppShell
        title="t"
        tabs={tabs}
        activeTabId="lobby"
        onTabChange={() => {}}
        activeTableBanner={<div>Tu joues à Cash #12</div>}
      >
        <div>x</div>
      </AppShell>,
    );
    expect(screen.getByText('Tu joues à Cash #12')).toBeInTheDocument();
  });
});
```

- [ ] **Step 11.2 : Vérifier l'échec**

Run: `npx vitest run tests/ui/AppShell.test.tsx`
Expected: FAIL (module introuvable).

- [ ] **Step 11.3 : Implémenter `src/shared/ui/AppShell.tsx`**

```tsx
import React from 'react';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { TabBar, type TabItem } from './TabBar';
import { cn } from '../utils/cn';

export interface AppShellProps {
  title: string;
  tabs: TabItem[];
  activeTabId: string;
  onTabChange: (id: string) => void;
  /** Action contextuelle dans le header (ex: bouton "Créer"). */
  headerAction?: { label: string; onClick: () => void; icon?: React.ReactNode };
  /** Bandeau persistant "table active" (mobile en haut, sidebar en desktop). */
  activeTableBanner?: React.ReactNode;
  /** Mode plein écran (table de jeu) : masque header + tabs. */
  fullscreen?: boolean;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  title,
  tabs,
  activeTabId,
  onTabChange,
  headerAction,
  activeTableBanner,
  fullscreen = false,
  children,
}) => {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  if (fullscreen) {
    return <div className="min-h-screen bg-bg-base text-text-primary">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex">
      {isDesktop && (
        <TabBar items={tabs} activeId={activeTabId} onChange={onTabChange} variant="rail" />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header
          className={cn(
            'sticky top-0 z-20 bg-bg-surface border-b border-border-default safe-top',
            'flex items-center justify-between px-4 h-11',
          )}
        >
          <h1 className="text-base font-semibold truncate">{title}</h1>
          {headerAction && (
            <button
              type="button"
              onClick={headerAction.onClick}
              className="min-h-tap min-w-tap inline-flex items-center justify-center text-accent font-medium"
            >
              {headerAction.icon ?? null}
              <span className={cn(headerAction.icon ? 'ml-1' : '')}>{headerAction.label}</span>
            </button>
          )}
        </header>

        {activeTableBanner && (
          <div className="bg-felt text-white px-4 py-2 text-sm">{activeTableBanner}</div>
        )}

        <main
          className={cn(
            'flex-1 overflow-y-auto',
            !isDesktop && 'pb-14',
          )}
        >
          {children}
        </main>

        {!isDesktop && (
          <TabBar items={tabs} activeId={activeTabId} onChange={onTabChange} variant="bottom" />
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 11.4 : Vérifier le pass**

Run: `npx vitest run tests/ui/AppShell.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 11.5 : Lancer toute la suite UI**

Run: `npx vitest run tests/ui`
Expected: tous les tests UI passent (Button, Card, Input, BottomSheet, TabBar, AppShell, useOrientation, useMediaQuery, smoke).

- [ ] **Step 11.6 : Commit**

```bash
git add src/shared/ui/index.ts src/shared/ui/AppShell.tsx tests/ui/AppShell.test.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(ui): AppShell responsive (header, tabs/sidebar, fullscreen, banner slot)"
```

---

## Task 12 : Intégrer `AppShell` dans `AppMain` sans régression

**Files:**
- Modify: `src/core/components/App/AppMain.tsx`

**Approche** : on définit les 4 onglets (Lobby / Tournois / Stats / Profil) ; les onglets non encore implémentés (Tournois, Profil) renvoient sur des écrans placeholder *à l'intérieur du shell* — ils n'auront leur refonte qu'aux Sprints 3 et 5. Le mode `fullscreen` est activé quand `currentView === "table"`. Les écrans existants (`Lobby`, `PokerTable`, `StatsPage`, `CreateTableForm`, `LoginForm`) ne sont PAS modifiés.

- [ ] **Step 12.1 : Modifier `src/core/components/App/AppMain.tsx`**

Remplacer le `switch (currentView)` final dans `AppContent` par un rendu encapsulé dans `AppShell`. Garder toute la logique existante (effects, mutations, handlers) inchangée.

```tsx
// Imports à ajouter en haut du fichier (après les imports existants) :
import { AppShell } from "../../../shared/ui/AppShell";
import type { TabItem } from "../../../shared/ui/TabBar";

// ... (tout le reste du composant AppContent reste identique jusqu'au switch final)

// Remplacer le bloc `switch (currentView) { ... }` final par :

  type TabId = "lobby" | "tournois" | "stats" | "profil";

  const tabs: TabItem[] = [
    { id: "lobby", label: "Lobby", icon: <span aria-hidden>🃏</span> },
    { id: "tournois", label: "Tournois", icon: <span aria-hidden>🏆</span> },
    { id: "stats", label: "Stats", icon: <span aria-hidden>📊</span> },
    { id: "profil", label: "Profil", icon: <span aria-hidden>👤</span> },
  ];

  const viewToTab = (v: AppView): TabId => {
    if (v === "stats") return "stats";
    return "lobby";
  };

  const onTabChange = (id: string) => {
    if (id === "stats") setCurrentView("stats");
    else if (id === "lobby") setCurrentView("lobby");
    // tournois / profil : placeholders, on reste sur la vue courante en attendant Sprint 3 / 5
    else if (id === "tournois") {
      setCurrentView("lobby");
      alert("La refonte Tournois arrive au Sprint 3.");
    } else if (id === "profil") {
      setCurrentView("lobby");
      alert("La refonte Profil arrive au Sprint 5.");
    }
  };

  const headerTitle = (() => {
    switch (currentView) {
      case "lobby": return title;
      case "create-table": return "Créer une table";
      case "stats": return "Stats";
      case "table": return title;
      default: return title;
    }
  })();

  const renderView = () => {
    switch (currentView) {
      case "lobby":
        return (
          <Lobby
            title={title}
            onJoinTable={handleJoinTable}
            onCreateTable={handleCreateTable}
            onViewStats={() => setCurrentView("stats")}
          />
        );
      case "table":
        if (!user || !selectedTableId) {
          return (
            <div className="min-h-[60vh] flex items-center justify-center p-4">
              <div className="bg-white rounded-lg p-8 shadow-xl text-center">
                <h2 className="text-2xl font-bold mb-4">Erreur</h2>
                <p className="text-gray-600 mb-6">Impossible de charger la table</p>
                <button
                  onClick={() => setCurrentView("lobby")}
                  className="bg-poker-green-600 text-white px-4 py-2 rounded hover:bg-poker-green-700"
                >
                  Retour au lobby
                </button>
              </div>
            </div>
          );
        }
        return (
          <Suspense fallback={<SuspenseFallback />}>
            <PokerTable
              key={selectedTableId}
              tableId={selectedTableId}
              appTitle={title}
              onLeaveTable={handleLeaveTable}
              onJoinSeat={handleJoinSeat}
            />
          </Suspense>
        );
      case "create-table":
        return (
          <Suspense fallback={<SuspenseFallback />}>
            <CreateTableForm
              onSubmit={handleTableCreated}
              onCancel={handleCancelCreateTable}
            />
          </Suspense>
        );
      case "stats":
        return (
          <Suspense fallback={<SuspenseFallback />}>
            <StatsPage onBack={() => setCurrentView("lobby")} />
          </Suspense>
        );
      default:
        return (
          <Lobby
            title={title}
            onJoinTable={handleJoinTable}
            onCreateTable={handleCreateTable}
            onViewStats={() => setCurrentView("stats")}
          />
        );
    }
  };

  return (
    <AppShell
      title={headerTitle}
      tabs={tabs}
      activeTabId={viewToTab(currentView)}
      onTabChange={onTabChange}
      fullscreen={currentView === "table"}
    >
      {renderView()}
    </AppShell>
  );
```

Remplacer **uniquement** la partie qui retourne directement les vues par cette nouvelle structure. Les blocs `if (isLoading)` et `if (!user)` restent intacts en amont (ils retournent avant d'arriver à `AppShell`).

- [ ] **Step 12.2 : Vérifier le typecheck**

Run: `npm run typecheck`
Expected: 0 erreur.

- [ ] **Step 12.3 : Vérifier le build**

Run: `npm run build`
Expected: build réussi.

- [ ] **Step 12.4 : Lancer le dev server et tester manuellement**

Run: `npm run dev` (en arrière-plan)

Tester dans un navigateur (ou via l'URL prod après déploiement) :

1. Page connexion s'affiche normalement (pas dans AppShell).
2. Une fois connecté, la page Lobby s'affiche avec un header en haut (titre "Poker Famille !") et une bottom tab bar à 4 onglets en bas.
3. Tap sur l'onglet "Stats" → la page Stats apparaît, header devient "Stats".
4. Tap sur "Tournois" → alerte "Sprint 3" et retour Lobby.
5. Tap sur une table existante → mode fullscreen activé, le shell disparaît, la table prend tout l'écran (chrome cachée).
6. Quitter la table → retour au Lobby avec shell visible.
7. Redimensionner la fenêtre à 1024px+ : la bottom tab bar disparaît, un rail vertical apparaît à gauche.
8. Repasser en < 1024px : la bottom tab bar revient.
9. Sur 320px (DevTools mobile) : pas d'overflow horizontal, header et tabs s'adaptent.

Run: arrêter le serveur dev avec Ctrl+C ou `kill %1`.

- [ ] **Step 12.5 : Lancer toute la suite de tests**

Run: `npm run test -- --run`
Expected: tous les tests passent (anciens + UI nouveaux).

- [ ] **Step 12.6 : Commit**

```bash
git add src/core/components/App/AppMain.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(shell): intégrer AppShell dans AppMain (4 onglets, fullscreen pour la table)"
```

---

## Task 13 : Captures de référence et clôture du sprint

**Files:**
- Create: `docs/superpowers/specs/screenshots/sprint-0/.gitkeep`

- [ ] **Step 13.1 : Créer le dossier captures**

```bash
mkdir -p docs/superpowers/specs/screenshots/sprint-0
touch docs/superpowers/specs/screenshots/sprint-0/.gitkeep
```

- [ ] **Step 13.2 : Lancer le dev server et capturer les vues**

Run: `npm run dev` (en arrière-plan)

Prendre des captures (manuellement, depuis https://home-poker.vjdev.tech/ après push, ou en local) à 320, 375, 768, 1024, 1280 px de large pour :
- Lobby (avec shell)
- Stats (avec shell)
- Vue table (mode fullscreen, sans shell)

Stocker dans `docs/superpowers/specs/screenshots/sprint-0/`. Nommer clairement : `lobby-320.png`, `lobby-1024.png`, etc.

(Si le projet n'a pas encore de pipeline de screenshots automatisé, c'est manuel — c'est OK pour Sprint 0.)

Arrêter le dev server.

- [ ] **Step 13.3 : Lancer un audit final**

```bash
npm run lint
npm run typecheck
npm run test -- --run
npm run build
```

Expected: tout réussit.

- [ ] **Step 13.4 : Commit final captures + dossier**

```bash
git add docs/superpowers/specs/screenshots/sprint-0/
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "docs(sprint-0): captures de référence à 320/375/768/1024/1280 px"
```

- [ ] **Step 13.5 : Mettre à jour le CHANGELOG**

Ouvrir `CHANGELOG.md` et ajouter en haut une entrée :

```md
## [Unreleased] — Sprint 0 fondations mobile-first

### Ajouté
- Tokens Tailwind étendus : breakpoints `xs 320` à `2xl 1536`, couleurs UI minimaliste, motion, tap targets 44px.
- Variables CSS dynamiques (`src/shared/styles/tokens.css`) + helpers safe-area iOS.
- Primitives partagées dans `src/shared/ui/` : `Button`, `Card`, `Input`, `BottomSheet`, `TabBar`, `AppShell`.
- Hooks `useMediaQuery` et `useOrientation`.
- Infra de test composants (jsdom + Testing Library), suite `tests/ui/**`.
- `AppShell` responsive (bottom tabs < 1024px, sidebar rail ≥ 1024px, mode fullscreen pour la table).
```

Commit :

```bash
git add CHANGELOG.md
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "docs(changelog): clore Sprint 0 fondations mobile-first"
```

---

## Critères de "Done" du Sprint 0

- [ ] `npm run lint`, `npm run typecheck`, `npm run test -- --run`, `npm run build` passent tous.
- [ ] L'app se lance, on peut se connecter, voir le lobby, ouvrir une table (fullscreen), revenir, naviguer Stats, sans régression fonctionnelle.
- [ ] La bottom tab bar apparaît sur mobile et disparaît sur desktop ≥ 1024px (remplacée par sidebar rail).
- [ ] Le mode fullscreen masque tout le chrome sur la vue table.
- [ ] Les 8 fichiers de tests UI (`tests/ui/*.test.tsx`) passent.
- [ ] Captures de référence à 320 / 375 / 768 / 1024 / 1280 px stockées.
- [ ] Aucun fichier `src/core/components/UI/*` modifié (legacy intact).

## Risques connus

- **Conflit Tailwind 3 + breakpoint `xs` 320** : Tailwind 3.3 supporte `screens` custom, mais l'ordre matters. Vérifier qu'aucune classe `xs:...` existante dans le code n'est cassée (la convention Tailwind ne définit pas `xs` par défaut). Faire un `grep -r "xs:" src/ --include="*.tsx"` avant de déployer ; si présent, vérifier le rendu.
- **`environmentMatchGlobs` Vitest** : disponible depuis Vitest 1+. La version installée est 4.x → OK.
- **`@import` dans `index.css`** : doit venir après les `@tailwind` directives en Tailwind 3 ; testé en Step 2.4.
- **Autoprefixer + `env(safe-area-inset-*)`** : pas de polyfill nécessaire (CSS standard, supporté iOS 11.2+).

---

## Self-review

- **Couverture spec** : Tokens (Task 2), `useOrientation` (Task 4), 5 primitives P0 du Sprint 0 spec (Button Task 5, BottomSheet Task 8, Card Task 6, Input Task 7, TabBar Task 9), `AppShell` (Task 11), intégration sans régression (Task 12), captures (Task 13). ✅ Tout couvert.
- **Pas de placeholder** : chaque step a code ou commande exacte.
- **Cohérence des types** : `TabItem` défini Task 9, importé Task 10 et 12. `AppShellProps` exporté Task 10 après création Task 11 (barrel créé en avance, importable après Task 11). `Orientation` exporté de `useOrientation`.
- **Ordre des tasks** : 1 (test infra) → 2 (tokens, dépendance pour les classes Tailwind dans tous les composants) → 3 (`useMediaQuery`, dépendance de `useOrientation` et `AppShell`) → 4 (`useOrientation`) → 5–9 (primitives indépendantes) → 10 (barrel) → 11 (`AppShell` qui dépend de `TabBar` et `useMediaQuery`) → 12 (intégration) → 13 (clôture). ✅ Pas de dépendance brisée.
