import { createMMKV } from 'react-native-mmkv';
import { StateStorage } from 'zustand/middleware';

export const appStorage = createMMKV({
  id: 'kaagaz-storage',
});

export const zustandStorage: StateStorage = {
  getItem: (key) => appStorage.getString(key) ?? null,
  setItem: (key, value) => {
    appStorage.set(key, value);
  },
  removeItem: (key) => {
    appStorage.remove(key);
  },
};
