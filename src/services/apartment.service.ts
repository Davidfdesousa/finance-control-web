import type { ApartmentUnit, PropertyStatus } from '../domain/models';
import { listUserDocs, saveUserDoc } from './firestore.repository';
import { nowISO } from '../utils/month';
import { round2 } from '../utils/format';

const COLLECTION = 'apartmentUnits';
const APTO_MOOCA_ID = 'apto-mooca';

export interface ApartmentUnitInput {
  name: string;
  status: PropertyStatus;
  expectedRentValue?: number;
  actualRentValue?: number;
  notes?: string;
}

export function buildApartmentUnit(
  uid: string,
  input: ApartmentUnitInput,
  existing?: ApartmentUnit,
): ApartmentUnit {
  const now = nowISO();
  return {
    ...existing,
    id: existing?.id ?? APTO_MOOCA_ID,
    userId: uid,
    name: input.name.trim(),
    status: input.status,
    expectedRentValue:
      input.expectedRentValue !== undefined ? round2(input.expectedRentValue) : undefined,
    actualRentValue: input.actualRentValue !== undefined ? round2(input.actualRentValue) : undefined,
    notes: input.notes,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export async function getAptoMooca(uid: string): Promise<ApartmentUnit> {
  const units = await listUserDocs<ApartmentUnit>(uid, COLLECTION);
  const existing = units.find((unit) => unit.id === APTO_MOOCA_ID);
  if (existing) return existing;
  const unit = buildApartmentUnit(uid, {
    name: 'Apto Mooca',
    status: 'nao_alugado',
    actualRentValue: 0,
  });
  await saveApartmentUnit(uid, unit);
  return unit;
}

export async function saveApartmentUnit(uid: string, unit: ApartmentUnit): Promise<void> {
  await saveUserDoc(uid, COLLECTION, unit);
}
