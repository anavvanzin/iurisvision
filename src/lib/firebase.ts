// Lazy re-exports from @shared — initFirebase() is called in main.tsx before app renders
import { getDb, getAuthInstance } from '@shared';
import { GoogleAuthProvider } from 'firebase/auth';
import type { DocumentData, Firestore } from 'firebase/firestore';
import type { Auth } from 'firebase/auth';

// These are getter-based to avoid calling before initFirebase()
export { getDb as getDatabase } from '@shared';

// For backwards compat with components that import `db` and `auth` directly,
// we use a Proxy that defers access until after initialization
type DbProxy = Firestore & ReturnType<typeof getDb>;
type AuthProxy = Auth & ReturnType<typeof getAuthInstance>;

export const db = new Proxy({} as DbProxy, {
  get(_, prop) {
    const dbInstance = getDb();
    return (dbInstance as Record<string, unknown>)[prop as string];
  },
});

export const auth = new Proxy({} as AuthProxy, {
  get(_, prop) {
    const authInstance = getAuthInstance();
    return (authInstance as Record<string, unknown>)[prop as string];
  },
});

export const googleProvider = new GoogleAuthProvider();
