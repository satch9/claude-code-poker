// tests/lib/auth-test.ts
//
// Helpers d'authentification pour les tests Convex.
//
// LIMITATION ACTUELLE :
// La migration vers `@convex-dev/auth` (Password provider) n'est pas encore faite
// (elle est prévue dans la Task 2 du plan 1C). Ces helpers sont écrits avec l'API
// que nous attendons APRÈS Task 2 :
//   - `api.auth.signIn` action avec `provider: 'password'`, `flow: 'signUp' | 'signIn'`
//   - `api.auth.loggedInUser` query
//
// Pour l'instant ces helpers vont logiquement échouer au setup (signup), ce qui
// rend les tests « rouges » par défaut — comportement attendu pour Task 1 (TDD red).
//
// TODO(Task 2) : une fois `@convex-dev/auth` câblé, vérifier que
// `ConvexHttpClient` propage bien la session ; sinon utiliser
// `client.setAuth(token)` après signIn (le token JWT est exposé via l'action signIn
// du provider Password).
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api.js';

const DEPLOYMENT_URL =
  process.env.VITE_CONVEX_URL || 'https://incredible-hedgehog-551.convex.cloud';

export type AuthedClient = {
  client: ConvexHttpClient;
  userId: string;
  email: string;
  sessionToken?: string;
};

export function makeClient(): ConvexHttpClient {
  return new ConvexHttpClient(DEPLOYMENT_URL);
}

export async function signupAndSignIn(
  email: string,
  password: string,
  name: string,
): Promise<AuthedClient> {
  const client = makeClient();
  // API attendue après Task 2 (migration @convex-dev/auth Password provider)
  await (client as any).action(api.auth.signIn, {
    provider: 'password',
    flow: 'signUp',
    params: { email, password, name },
  });
  const session: any = await (client as any).query(api.auth.loggedInUser, {});
  if (!session?._id) {
    throw new Error('signupAndSignIn: no session returned (auth not wired yet?)');
  }
  return { client, userId: session._id as string, email };
}

export async function expectThrowsUnauthorized(promise: Promise<unknown>) {
  try {
    await promise;
    throw new Error('Expected throw, got success');
  } catch (e: any) {
    if (!String(e.message).match(/Unauthorized|RateLimited|Locked/)) {
      throw new Error(
        `Expected Unauthorized/RateLimited/Locked, got: ${e.message}`,
      );
    }
  }
}
