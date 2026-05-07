# Sprint 5 — Refonte Profil + Auth + Invitations — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Refondre les écrans Auth (`LoginForm`, `EmailPasswordForm`, `PasswordResetForm`) en dark Sprint 0, créer un nouvel écran `ProfileScreen` minimal pour la vue Profil de l'AppShell (actuellement un alert placeholder), refondre l'`InviteDialog` du jeu en dark. Garder l'API et la logique d'auth intacte (Convex auth flow).

**Architecture:** Pas de modification de `convex/auth.ts` ni des hooks d'auth. Travail purement front : adopter les tokens Sprint 0 et les primitives `Input` / `Button` / `Card`. Le `UserProfile` actuel (669 lignes — dialog avec avatar selector + stats) est trop large pour être réécrit ici ; on se contente de refondre le composant `compact` (utilisé dans les headers — il l'était avant Sprint 2/4 où on l'a retiré). Pour Sprint 5, on crée un nouvel écran simple `ProfileScreen` qui montre l'identité, un placeholder préférences, et le bouton déconnexion. Le dialog complet (avatar + stats détaillées) reste accessible via le bouton "Modifier le profil" pour l'instant — refonte profonde laissée pour itération future.

**Tech Stack:** React 18 + TS 6 + Tailwind 3.3.6 + tokens/primitives Sprint 0 + Convex auth.

---

## File Structure

### Files to create

| Path | Purpose |
|---|---|
| `src/core/components/Profile/ProfileScreen.tsx` | Écran profil pour l'onglet AppShell |
| `src/core/components/Profile/index.ts` | Barrel |

### Files to modify

| Path | Reason |
|---|---|
| `src/core/components/Auth/LoginForm.tsx` | Tokens dark, primitives Sprint 0 |
| `src/core/components/Auth/EmailPasswordForm.tsx` | Tokens dark, primitives Sprint 0 (`Input` avec `error`) |
| `src/core/components/Auth/PasswordResetForm.tsx` | Tokens dark, primitives Sprint 0 |
| `src/core/components/Game/InviteDialog.tsx` | Tokens dark |
| `src/core/components/App/AppMain.tsx` | Wirer l'onglet Profil, retirer l'alert placeholder, monter `ProfileScreen` |

### Files NOT touched

- `convex/auth.ts`, `convex/passwordReset.ts`, `convex/users.ts` — logique inchangée.
- `UserProfile.tsx` (669 lignes) — refonte complète du dialog avatar/stats laissée pour itération future. On l'expose via un bouton "Modifier le profil" dans `ProfileScreen`.

---

## Task 1 : Refondre `LoginForm`

**Files:**
- Modify: `src/core/components/Auth/LoginForm.tsx`

### Step 1.1 — Replace ENTIRE content

```tsx
import React from "react";
import { useAuth } from "../../hooks/useAuth";
import { SignInButton } from "./SignInButton";
import { EmailPasswordForm } from "./EmailPasswordForm";
import { Card } from "../../../shared/ui/Card";

interface LoginFormProps {
  onSuccess?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="w-full max-w-md mx-auto">
        <Card>
          <div className="text-center p-4">
            <div className="animate-spin text-2xl" aria-hidden>⏳</div>
            <p className="mt-2 text-text-muted">Chargement...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (isAuthenticated) {
    onSuccess?.();
    return null;
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <Card variant="elevated">
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-2">
            Bienvenue sur Poker Famille
          </h1>
          <p className="text-text-muted text-sm">
            Choisissez votre méthode de connexion
          </p>
        </div>

        <div className="space-y-4">
          <SignInButton provider="google" className="w-full" />
          <SignInButton provider="github" className="w-full" />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-default" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-bg-elevated text-text-muted">ou</span>
            </div>
          </div>

          <EmailPasswordForm onSuccess={onSuccess} />
        </div>

        <p className="mt-6 text-center text-xs text-text-muted">
          Vos jetons seront attribués{" "}
          <span className="font-semibold text-sem-success">à chaque table</span>{" "}
          selon les règles du jeu.
        </p>
      </Card>
    </div>
  );
};
```

### Step 1.2 — Verify

```bash
npm run typecheck && npm run build && npx vitest run tests/ui
```

### Step 1.3 — Commit

```bash
git add src/core/components/Auth/LoginForm.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(auth): LoginForm refondu (dark tokens, Card Sprint 0)"
```

---

## Task 2 : Refondre `EmailPasswordForm`

**Files:**
- Modify: `src/core/components/Auth/EmailPasswordForm.tsx`

### Step 2.1 — Read the file fully (188 lignes)

Lire le fichier pour identifier toutes les zones à passer en dark + remplacer les `<input>` natifs par la primitive `Input`.

### Step 2.2 — Replace ENTIRE content

```tsx
import React, { useState } from 'react';
import { useMutation } from 'convex/react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { api } from '../../../../convex/_generated/api';
import { formatAuthError } from '../../../shared/utils/authErrors';

interface EmailPasswordFormProps {
  onSuccess?: () => void;
}

export const EmailPasswordForm: React.FC<EmailPasswordFormProps> = ({ onSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const requestPasswordReset = useMutation(api.passwordReset.requestPasswordReset);

  const { signUp, signIn } = useAuth();

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await requestPasswordReset({ email: forgotEmail.trim().toLowerCase() });
      setForgotSent(true);
    } catch (_err) {
      // Anti-enumeration : on signale toujours "envoyé"
      setForgotSent(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password, name);
      } else {
        await signIn(email, password);
      }
      onSuccess?.();
    } catch (err: unknown) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  if (showForgot) {
    return (
      <form onSubmit={handleForgot} className="space-y-3">
        <div>
          <h3 className="text-base font-semibold text-text-primary">
            Mot de passe oublié
          </h3>
          <p className="text-sm text-text-muted">
            Saisis ton email, nous t'enverrons un lien de réinitialisation.
          </p>
        </div>
        <Input
          type="email"
          label="Email"
          value={forgotEmail}
          onChange={(e) => setForgotEmail(e.target.value)}
          required
        />
        {forgotSent && (
          <p className="text-sm text-sem-success">
            Si un compte existe pour cette adresse, un email a été envoyé.
          </p>
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setShowForgot(false);
              setForgotSent(false);
              setForgotEmail('');
            }}
            className="flex-1"
          >
            Retour
          </Button>
          <Button type="submit" variant="primary" className="flex-1" disabled={forgotSent}>
            Envoyer
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        id="email"
        type="email"
        label="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      {isSignUp && (
        <Input
          id="name"
          type="text"
          label="Nom"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
        />
      )}

      <Input
        id="password"
        type="password"
        label="Mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={6}
        error={error || undefined}
      />

      <Button type="submit" variant="primary" className="w-full" loading={loading} disabled={loading}>
        {isSignUp ? "S'inscrire" : 'Se connecter'}
      </Button>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => setIsSignUp((v) => !v)}
          className="text-accent hover:underline"
        >
          {isSignUp ? 'Déjà un compte ?' : 'Créer un compte'}
        </button>
        {!isSignUp && (
          <button
            type="button"
            onClick={() => setShowForgot(true)}
            className="text-text-muted hover:text-text-primary"
          >
            Mot de passe oublié ?
          </button>
        )}
      </div>
    </form>
  );
};
```

### Step 2.3 — Verify + Commit

```bash
npm run typecheck && npm run build && npx vitest run tests/ui
git add src/core/components/Auth/EmailPasswordForm.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(auth): EmailPasswordForm refondu (dark, primitives Input/Button)"
```

---

## Task 3 : Refondre `PasswordResetForm`

**Files:**
- Modify: `src/core/components/Auth/PasswordResetForm.tsx`

### Step 3.1 — Read + apply changes

Lire le fichier (92 lignes), remplacer `bg-white` / `text-gray-*` / `border-gray-*` par les tokens Sprint 0, remplacer les `<input>` natifs par `Input` Sprint 0, le bouton par `Button`. Wrapper la card via `Card` Sprint 0.

Modèle (à adapter au contenu réel) :

```tsx
import React, { useState } from "react";
import { useMutation } from "convex/react";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import { Card } from "../../../shared/ui/Card";
import { api } from "../../../../convex/_generated/api";

export const PasswordResetForm: React.FC = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") ?? "";

  const resetPassword = useMutation(api.passwordReset.resetPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 6) {
      setError("6 caractères minimum.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await resetPassword({ token, newPassword: password });
      setDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
        <Card variant="elevated" className="w-full max-w-md">
          <h1 className="text-xl font-bold text-text-primary mb-2">Lien invalide</h1>
          <p className="text-sm text-text-muted">
            Le lien de réinitialisation est manquant ou incorrect.
          </p>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
        <Card variant="elevated" className="w-full max-w-md">
          <h1 className="text-xl font-bold text-text-primary mb-2">Mot de passe mis à jour</h1>
          <p className="text-sm text-text-muted mb-4">
            Tu peux maintenant te reconnecter.
          </p>
          <a href="/" className="text-accent hover:underline">
            Retour à la connexion
          </a>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <Card variant="elevated" className="w-full max-w-md">
        <h1 className="text-xl font-bold text-text-primary mb-4">
          Nouveau mot de passe
        </h1>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="password"
            label="Nouveau mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
          <Input
            type="password"
            label="Confirmer"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={6}
            required
            error={error ?? undefined}
          />
          <Button type="submit" variant="primary" className="w-full" loading={loading} disabled={loading}>
            Réinitialiser
          </Button>
        </form>
      </Card>
    </div>
  );
};
```

### Step 3.2 — Verify + Commit

```bash
npm run typecheck && npm run build && npx vitest run tests/ui
git add src/core/components/Auth/PasswordResetForm.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(auth): PasswordResetForm refondu (dark, primitives Sprint 0)"
```

---

## Task 4 : Créer `ProfileScreen`

**Files:**
- Create: `src/core/components/Profile/ProfileScreen.tsx`
- Create: `src/core/components/Profile/index.ts`

### Step 4.1 — Implement

```tsx
import React, { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../../../shared/ui/Button";
import { Card } from "../../../shared/ui/Card";
import { UserProfile } from "../Auth/UserProfile";

/**
 * Écran Profil minimal pour l'onglet AppShell.
 * - Identité (avatar initiale + nom + email)
 * - Préférences (placeholder pour Sprint 6+)
 * - Compte (bouton Modifier le profil → ouvre l'ancien dialog UserProfile)
 * - Déconnexion
 */
export const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const [showEditDialog, setShowEditDialog] = useState(false);

  if (!user) return null;

  const initial = (user.name || "?").charAt(0).toUpperCase();

  return (
    <div className="container mx-auto max-w-2xl px-3 md:px-4 py-4 md:py-6 space-y-4">
      {/* Identité */}
      <Card variant="elevated">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full bg-accent flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
            aria-hidden
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold text-text-primary truncate">
              {user.name}
            </h1>
            <p className="text-sm text-text-muted truncate">{user.email}</p>
          </div>
        </div>
      </Card>

      {/* Préférences (placeholder) */}
      <Card>
        <h2 className="text-base font-semibold text-text-primary mb-2">
          Préférences
        </h2>
        <p className="text-sm text-text-muted">
          Le réglage du thème, des notifications, animations et sons arrive
          dans une itération future.
        </p>
      </Card>

      {/* Compte */}
      <Card>
        <h2 className="text-base font-semibold text-text-primary mb-3">
          Compte
        </h2>
        <div className="flex flex-col gap-2">
          <Button variant="secondary" onClick={() => setShowEditDialog(true)}>
            Modifier le profil
          </Button>
          <Button variant="danger" onClick={logout}>
            Se déconnecter
          </Button>
        </div>
      </Card>

      {/* Dialog UserProfile complet (legacy, monté à la demande) */}
      {showEditDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => setShowEditDialog(false)}
        >
          <div
            className="w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <UserProfile showLogout={false} />
            <div className="mt-2 text-right">
              <Button variant="ghost" size="sm" onClick={() => setShowEditDialog(false)}>
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
```

(Note : `<UserProfile />` legacy est rendu inline dans le dialog modal — il garde ses styles light pour l'instant, refonte profonde laissée pour itération.)

### Step 4.2 — Create barrel `src/core/components/Profile/index.ts`

```ts
export { ProfileScreen } from "./ProfileScreen";
```

### Step 4.3 — Verify + Commit

```bash
npm run typecheck && npm run build && npx vitest run tests/ui
git add src/core/components/Profile/
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(profile): ProfileScreen — onglet Profil de l'AppShell"
```

---

## Task 5 : Wirer l'onglet Profil dans `AppMain`

**Files:**
- Modify: `src/core/components/App/AppMain.tsx`

### Step 5.1 — Modifier

**a)** Ajouter l'import :

```tsx
import { ProfileScreen } from "../Profile/ProfileScreen";
```

**b)** Étendre le type `AppView` :

```tsx
type AppView = "lobby" | "table" | "stats" | "tournois" | "profil";
```

**c)** Mettre à jour `viewToTab` :

```tsx
const viewToTab = (v: AppView): TabId => {
  if (v === "stats") return "stats";
  if (v === "tournois") return "tournois";
  if (v === "profil") return "profil";
  return "lobby";
};
```

**d)** Mettre à jour `onTabChange` — retirer l'alert pour profil :

```tsx
const onTabChange = (id: string) => {
  if (id === "stats") setCurrentView("stats");
  else if (id === "lobby") setCurrentView("lobby");
  else if (id === "tournois") setCurrentView("tournois");
  else if (id === "profil") setCurrentView("profil");
};
```

**e)** Ajouter le case dans `renderView()` :

```tsx
case "profil":
  return <ProfileScreen />;
```

**f)** Mettre à jour `headerTitle` :

```tsx
const headerTitle = (() => {
  switch (currentView) {
    case "lobby": return title;
    case "tournois": return "Tournois";
    case "stats": return "Stats";
    case "profil": return "Profil";
    case "table": return title;
    default: return title;
  }
})();
```

(Le `headerAction` reste tel quel : pas d'action sur la vue profil pour l'instant.)

### Step 5.2 — Verify

```bash
npm run typecheck && npm run build && npx vitest run tests/ui
```

### Step 5.3 — Commit

```bash
git add src/core/components/App/AppMain.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(profile): wirer onglet Profil dans AppMain (drop alert placeholder)"
```

---

## Task 6 : Refondre `InviteDialog` (game)

**Files:**
- Modify: `src/core/components/Game/InviteDialog.tsx`

Lire les 126 lignes existantes et appliquer un refactor visuel : tokens Sprint 0 dark, primitives `Button`/`Input` selon contenu, suppression des `bg-white` / `text-gray-*`. La logique d'invitation (mutation Convex) reste inchangée.

### Step 6.1 — Read + adapt

Lire le fichier complètement, identifier :
- Le wrapper modal (probablement `bg-white rounded-lg`).
- Les inputs / boutons / textes.
- Les éventuels feedbacks d'erreur ou success.

Remplacer :
- `bg-white` → `bg-bg-surface` ou `bg-bg-elevated`.
- `text-gray-900` → `text-text-primary`.
- `text-gray-500/600/700` → `text-text-muted`.
- `border-gray-200/300` → `border-border-default`.
- `bg-poker-green-*` boutons → `Button variant="primary"`.
- `<input className="...">` → `<Input ...>` Sprint 0 si c'est une entrée saisissable.

Garder la structure modale (overlay backdrop + content centré) mais avec les tokens Sprint 0.

### Step 6.2 — Verify + Commit

```bash
npm run typecheck && npm run build && npx vitest run tests/ui
git add src/core/components/Game/InviteDialog.tsx
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "feat(game): InviteDialog — tokens Sprint 0 dark"
```

---

## Task 7 : Audit + CHANGELOG

**Files:**
- Modify: `CHANGELOG.md`

### Step 7.1 — Audits

```bash
npm run typecheck
npm run lint
npx vitest run tests/ui
npm run test -- --run
npm run build
```

### Step 7.2 — Update `CHANGELOG.md`

```markdown
## [Unreleased] — Sprint 5 Refonte Profil + Auth + Invitations

### Ajouté
- `ProfileScreen` (`src/core/components/Profile/`) : nouvel écran pour l'onglet Profil de l'AppShell. Identité (avatar initiale, nom, email), préférences placeholder, bouton "Modifier le profil" (ouvre l'ancien dialog UserProfile en modal), bouton "Se déconnecter".

### Modifié
- `LoginForm` : tokens Sprint 0 dark, wrapper via `Card variant="elevated"`.
- `EmailPasswordForm` : tokens Sprint 0, primitives `Input` (avec `error` prop) et `Button`. Flow "Mot de passe oublié" inline préservé.
- `PasswordResetForm` : tokens Sprint 0, primitives Sprint 0.
- `InviteDialog` (game) : tokens dark.
- `AppMain` : ajout de la vue `"profil"` dans `AppView`, l'onglet Profil de l'AppShell pointe désormais vers `ProfileScreen` (au lieu de l'alert placeholder).

### Notes
- Refonte profonde du `UserProfile` legacy (669 lignes — dialog avatar selector + stats détaillées intégrées) laissée pour une itération future. Il reste accessible via le bouton "Modifier le profil" du `ProfileScreen`.
- Pas de wizard d'inscription multi-étapes — l'`EmailPasswordForm` reste un seul formulaire avec toggle Sign in / Sign up.
- Le système de notifications (préférences) reste un placeholder — à câbler dans une itération future.
```

### Step 7.3 — Commit

```bash
git add CHANGELOG.md
git -c user.email="viny1976@gmail.com" -c user.name="satch9" commit -m "docs(changelog): clore Sprint 5 refonte Profil + Auth + Invitations"
```

---

## Critères de "Done" du Sprint 5

- [ ] `npm run typecheck`, `npm run lint`, `npx vitest run tests/ui`, `npm run build` — tous OK.
- [ ] L'onglet Profil de l'AppShell ouvre `ProfileScreen` (plus d'alert).
- [ ] Login + Sign up + reset password : visuel cohérent dark Sprint 0.
- [ ] InviteDialog : visuel cohérent dark Sprint 0.
- [ ] CHANGELOG mis à jour.

## Hors scope

- Refonte profonde de `UserProfile.tsx` (669 lignes — avatar selector, stats détaillées intégrées) → laissée pour itération.
- Wizard d'inscription multi-étapes (1 champ par écran avec barre de progression) → laissée pour itération.
- Système de notifications fonctionnel → laissée pour itération.
- Acceptation d'invitation par lien direct (URL `/invite/:code`) → déjà géré par le `usePendingJoin` hook existant et l'auto-join dans AppMain. Pas de refonte UI nécessaire.
