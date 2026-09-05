import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Shift {
  id: string;
  openedAt: string;
  closedAt?: string;
  openedBy: string;
  closedBy?: string;
  startCash: number;
  endCash?: number;
  cashSales: number;
  cashlessSales: number;
  totalSales: number;
  ordersCount: number;
  deposits: Deposit[];
  withdrawals: Withdrawal[];
  status: 'open' | 'closed';
}

export interface Deposit {
  id: string;
  amount: number;
  note: string;
  date: string;
  by: string;
}

export interface Withdrawal {
  id: string;
  amount: number;
  note: string;
  date: string;
  by: string;
}

interface ShiftStore {
  currentShift: Shift | null;
  shifts: Shift[];

  // ДЕЙСТВИЯ
  openShift: (cashierName: string, startCash: number) => Shift;
  closeShift: (cashierName: string, endCash: number) => Shift | null;
  addDeposit: (amount: number, note: string, by: string) => void;
  addWithdrawal: (amount: number, note: string, by: string) => void;
  updateShiftTotals: (cashSales: number, cashlessSales: number, ordersCount: number) => void;

  // РАСЧЁТЫ
  getExpectedCash: () => number;
  getDifference: (actualCash: number) => number;
}

export const useShiftStore = create<ShiftStore>()(
  persist(
    (set, get) => ({
      currentShift: null,
      shifts: [],

      openShift: (cashierName, startCash) => {
        const shift: Shift = {
          id: `SHIFT-${Date.now()}`,
          openedAt: new Date().toISOString(),
          openedBy: cashierName,
          startCash,
          cashSales: 0,
          cashlessSales: 0,
          totalSales: 0,
          ordersCount: 0,
          deposits: [],
          withdrawals: [],
          status: 'open',
        };
        set((state) => ({
          currentShift: shift,
          shifts: [shift, ...state.shifts],
        }));
        return shift;
      },

      closeShift: (cashierName, endCash) => {
        const current = get().currentShift;
        if (!current) return null;

        const closedShift: Shift = {
          ...current,
          closedAt: new Date().toISOString(),
          closedBy: cashierName,
          endCash,
          status: 'closed',
        };

        set((state) => ({
          currentShift: null,
          shifts: state.shifts.map((s) => (s.id === current.id ? closedShift : s)),
        }));

        return closedShift;
      },

      addDeposit: (amount, note, by) => {
        const current = get().currentShift;
        if (!current) return;

        const deposit: Deposit = {
          id: `DEP-${Date.now()}`,
          amount,
          note,
          date: new Date().toISOString(),
          by,
        };

        set((state) => ({
          currentShift: state.currentShift
            ? { ...state.currentShift, deposits: [...state.currentShift.deposits, deposit] }
            : null,
        }));
      },

      addWithdrawal: (amount, note, by) => {
        const current = get().currentShift;
        if (!current) return;

        const withdrawal: Withdrawal = {
          id: `WDR-${Date.now()}`,
          amount,
          note,
          date: new Date().toISOString(),
          by,
        };

        set((state) => ({
          currentShift: state.currentShift
            ? { ...state.currentShift, withdrawals: [...state.currentShift.withdrawals, withdrawal] }
            : null,
        }));
      },

      updateShiftTotals: (cashSales, cashlessSales, ordersCount) => {
        set((state) => ({
          currentShift: state.currentShift
            ? {
                ...state.currentShift,
                cashSales,
                cashlessSales,
                totalSales: cashSales + cashlessSales,
                ordersCount,
              }
            : null,
        }));
      },

      getExpectedCash: () => {
        const shift = get().currentShift;
        if (!shift) return 0;
        const deposits = shift.deposits.reduce((sum, d) => sum + d.amount, 0);
        const withdrawals = shift.withdrawals.reduce((sum, w) => sum + w.amount, 0);
        return shift.startCash + shift.cashSales + deposits - withdrawals;
      },

      getDifference: (actualCash) => {
        const expected = get().getExpectedCash();
        return actualCash - expected;
      },
    }),
    { name: 'restaurant-crm-shifts' },
  ),
);
