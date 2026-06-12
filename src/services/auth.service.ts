import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { firebaseAuth } from './firebase';
import { appStore } from '../state/store';
import { ensureUserSetup, loadCategories, loadPaymentMethods } from './settings.service';
import { DEFAULT_USER_SETTINGS } from '../domain/models';

/** Observa o estado de autenticação e popula o store global. */
export function watchAuth(): void {
  onAuthStateChanged(firebaseAuth(), async (firebaseUser) => {
    if (!firebaseUser) {
      appStore.set({
        authReady: true,
        user: null,
        settings: DEFAULT_USER_SETTINGS,
        categories: [],
        paymentMethods: [],
      });
      return;
    }

    try {
      const { profile, settings } = await ensureUserSetup(firebaseUser);
      const [categories, paymentMethods] = await Promise.all([
        loadCategories(firebaseUser.uid),
        loadPaymentMethods(firebaseUser.uid),
      ]);
      appStore.set({ authReady: true, user: profile, settings, categories, paymentMethods });
    } catch (error) {
      console.error('Falha ao preparar os dados do usuário:', error);
      appStore.set({ authReady: true, user: null });
    }
  });
}

export async function loginWithGoogle(): Promise<void> {
  await signInWithPopup(firebaseAuth(), new GoogleAuthProvider());
}

export async function logout(): Promise<void> {
  await signOut(firebaseAuth());
}
