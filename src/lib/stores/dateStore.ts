import { format } from "date-fns";
import { create } from "zustand";

/**
 * The selected board date (YYYY-MM-DD) — the single source of truth shared by
 * <DateSelector/>, the board, and the task query keys. Date logic never leaks
 * into task UI: components read/write this store, nothing else.
 */
interface DateState {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}

export const useDateStore = create<DateState>((set) => ({
  selectedDate: format(new Date(), "yyyy-MM-dd"),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
}));
