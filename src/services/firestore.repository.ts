/**
 * Acesso genérico às subcoleções do usuário em users/{uid}/<coleção>.
 */
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  type QueryConstraint,
} from 'firebase/firestore';
import { firestore } from './firebase';

/** Firestore não aceita `undefined`: remove esses campos recursivamente. */
export function stripUndefined<T>(data: T): T {
  if (Array.isArray(data)) {
    return data.map((item) => stripUndefined(item)) as T;
  }
  if (data !== null && typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (value !== undefined) result[key] = stripUndefined(value);
    }
    return result as T;
  }
  return data;
}

export async function listUserDocs<T>(
  uid: string,
  collectionName: string,
  constraints: QueryConstraint[] = [],
): Promise<T[]> {
  const ref = collection(firestore(), 'users', uid, collectionName);
  const snapshot = await getDocs(query(ref, ...constraints));
  return snapshot.docs.map((d) => d.data() as T);
}

/** Sobrescreve o documento inteiro — campos omitidos deixam de existir. */
export async function saveUserDoc<T extends { id: string }>(
  uid: string,
  collectionName: string,
  data: T,
): Promise<void> {
  await setDoc(doc(firestore(), 'users', uid, collectionName, data.id), stripUndefined(data));
}

export async function deleteUserDoc(
  uid: string,
  collectionName: string,
  id: string,
): Promise<void> {
  await deleteDoc(doc(firestore(), 'users', uid, collectionName, id));
}
