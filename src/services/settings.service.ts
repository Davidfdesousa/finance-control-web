/**
 * Perfil, configurações e dados padrão (seed) do usuário.
 */
import { doc, getDoc, setDoc, writeBatch } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { firestore } from './firebase';
import { buildDefaultCategories, buildDefaultPaymentMethods } from '../domain/seed';
import {
  DEFAULT_USER_SETTINGS,
  type Category,
  type PaymentMethod,
  type PropertyStatus,
  type UserProfile,
  type UserSettings,
} from '../domain/models';
import { listUserDocs, stripUndefined } from './firestore.repository';
import { nowISO } from '../utils/month';

export interface UserDocData {
  profile: UserProfile;
  settings: UserSettings;
}

/**
 * Garante que o usuário tem perfil + seed inicial.
 * No primeiro login cria categorias, subcategorias e formas de pagamento padrão.
 */
export async function ensureUserSetup(firebaseUser: User): Promise<UserDocData> {
  const db = firestore();
  const userRef = doc(db, 'users', firebaseUser.uid);
  const snapshot = await getDoc(userRef);
  const now = nowISO();

  if (snapshot.exists()) {
    const data = snapshot.data() as Partial<UserDocData>;
    const profile: UserProfile = {
      id: firebaseUser.uid,
      name: firebaseUser.displayName ?? data.profile?.name ?? 'Usuário',
      email: firebaseUser.email ?? data.profile?.email ?? '',
      photoURL: firebaseUser.photoURL ?? data.profile?.photoURL ?? null,
      createdAt: data.profile?.createdAt ?? now,
      updatedAt: now,
    };
    const settings: UserSettings = { ...DEFAULT_USER_SETTINGS, ...data.settings };
    await setDoc(userRef, stripUndefined({ profile, settings }), { merge: true });
    return { profile, settings };
  }

  const profile: UserProfile = {
    id: firebaseUser.uid,
    name: firebaseUser.displayName ?? 'Usuário',
    email: firebaseUser.email ?? '',
    photoURL: firebaseUser.photoURL ?? null,
    createdAt: now,
    updatedAt: now,
  };
  const settings: UserSettings = { ...DEFAULT_USER_SETTINGS };

  const batch = writeBatch(db);
  batch.set(userRef, { profile, settings });
  for (const category of buildDefaultCategories(now)) {
    batch.set(
      doc(db, 'users', firebaseUser.uid, 'categories', category.id),
      stripUndefined(category),
    );
  }
  for (const method of buildDefaultPaymentMethods(now)) {
    batch.set(
      doc(db, 'users', firebaseUser.uid, 'paymentMethods', method.id),
      stripUndefined(method),
    );
  }
  await batch.commit();

  return { profile, settings };
}

const CATEGORY_TYPE_ORDER: Record<Category['type'], number> = {
  income: 0,
  expense: 1,
  special: 2,
};

export async function loadCategories(uid: string): Promise<Category[]> {
  const categories = await listUserDocs<Category>(uid, 'categories');
  return categories.sort(
    (a, b) =>
      CATEGORY_TYPE_ORDER[a.type] - CATEGORY_TYPE_ORDER[b.type] ||
      a.name.localeCompare(b.name, 'pt-BR'),
  );
}

export async function loadPaymentMethods(uid: string): Promise<PaymentMethod[]> {
  const methods = await listUserDocs<PaymentMethod>(uid, 'paymentMethods');
  return methods.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export async function updateAptoMoocaStatus(
  uid: string,
  status: PropertyStatus,
): Promise<UserSettings> {
  const settings: UserSettings = { aptoMoocaStatus: status };
  await setDoc(doc(firestore(), 'users', uid), { settings }, { merge: true });
  return settings;
}
