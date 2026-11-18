import { create } from 'zustand';

interface SnapshotState {
  isOpen: boolean;
  imageUrl: string | null;
  imageBlob: Blob | null;
  targetTitle: string;
  dateStr: string;
  isFlashing: boolean;

  openSnapshot: (params: { imageUrl: string; imageBlob: Blob; targetTitle: string; dateStr: string }) => void;
  closeSnapshot: () => void;
  triggerFlash: () => void;
}

export const useSnapshotStore = create<SnapshotState>((set) => ({
  isOpen: false,
  imageUrl: null,
  imageBlob: null,
  targetTitle: '',
  dateStr: '',
  isFlashing: false,

  openSnapshot: ({ imageUrl, imageBlob, targetTitle, dateStr }) =>
    set({
      isOpen: true,
      imageUrl,
      imageBlob,
      targetTitle,
      dateStr,
    }),

  closeSnapshot: () =>
    set({
      isOpen: false,
      imageUrl: null,
      imageBlob: null,
    }),

  triggerFlash: () => {
    set({ isFlashing: true });
    setTimeout(() => {
      set({ isFlashing: false });
    }, 400);
  },
}));
