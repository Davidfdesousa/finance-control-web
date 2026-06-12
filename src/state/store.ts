import type {
  Category,
  MonthRef,
  PaymentMethod,
  UserProfile,
  UserSettings,
} from '../domain/models';
import { DEFAULT_USER_SETTINGS } from '../domain/models';
import { getCurrentMonthRef } from '../utils/month';

type Listener<T> = (state: T) => void;

/** Store minimalista de pub/sub — suficiente para o MVP, sem dependências. */
export class Store<T extends object> {
  private listeners = new Set<Listener<T>>();

  constructor(private state: T) {}

  get(): T {
    return this.state;
  }

  set(patch: Partial<T>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of [...this.listeners]) listener(this.state);
  }

  /** Inscreve e notifica imediatamente com o estado atual. Retorna o unsubscribe. */
  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export interface AppState {
  authReady: boolean;
  user: UserProfile | null;
  settings: UserSettings;
  monthRef: MonthRef;
  categories: Category[];
  paymentMethods: PaymentMethod[];
}

export const appStore = new Store<AppState>({
  authReady: false,
  user: null,
  settings: DEFAULT_USER_SETTINGS,
  monthRef: getCurrentMonthRef(),
  categories: [],
  paymentMethods: [],
});

export function setMonthRef(monthRef: MonthRef): void {
  appStore.set({ monthRef });
}
