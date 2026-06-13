import type { EmergencyReserve } from '../domain/models';
import { listUserDocs, saveUserDoc } from './firestore.repository';
import { nowISO } from '../utils/month';
import { round2 } from '../utils/format';

const COLLECTION = 'emergencyReserve';
const DEFAULT_ID = 'default';

export interface EmergencyReserveInput {
  targetValue: number;
  currentValue: number;
  monthlyTargetValue: number;
  currentMonthPlannedContribution: number;
  currentMonthActualContribution: number;
}

export function buildEmergencyReserve(
  uid: string,
  input: EmergencyReserveInput,
): EmergencyReserve {
  return {
    id: DEFAULT_ID,
    userId: uid,
    targetValue: round2(input.targetValue),
    currentValue: round2(input.currentValue),
    monthlyTargetValue: round2(input.monthlyTargetValue),
    currentMonthPlannedContribution: round2(input.currentMonthPlannedContribution),
    currentMonthActualContribution: round2(input.currentMonthActualContribution),
    updatedAt: nowISO(),
  };
}

export async function getEmergencyReserve(uid: string): Promise<EmergencyReserve> {
  const existing = (await listUserDocs<EmergencyReserve>(uid, COLLECTION))[0];
  if (existing) return existing;
  const reserve = buildEmergencyReserve(uid, {
    targetValue: 0,
    currentValue: 0,
    monthlyTargetValue: 0,
    currentMonthPlannedContribution: 0,
    currentMonthActualContribution: 0,
  });
  await saveEmergencyReserve(uid, reserve);
  return reserve;
}

export async function saveEmergencyReserve(
  uid: string,
  reserve: EmergencyReserve,
): Promise<void> {
  await saveUserDoc(uid, COLLECTION, reserve);
}
