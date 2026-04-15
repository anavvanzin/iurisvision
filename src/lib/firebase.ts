// Lazy re-exports from @shared — initFirebase() is called in main.tsx before app renders
import { getDb, getAuthInstance } from '@shared';
import { GoogleAuthProvider } from 'firebase/auth';

// These are getter-based to avoid calling before initFirebase()
export { getDb as getDatabase } from '@shared';

// For backwards compat with components that import `db` and `auth` directly,
// we use a Proxy that defers access until after initialization
export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_, prop) {
    return (getDb() as any)[prop];
  },
});

export const auth = new Proxy({} as ReturnType<typeof getAuthInstance>, {
  get(_, prop) {
    return (getAuthInstance() as any)[prop];
  },
});

export const googleProvider = new GoogleAuthProvider();
