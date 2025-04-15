import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '../types/auth';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  hydrated: boolean; // Track hydration state
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
  setHydrated: (state: boolean) => void; // Set hydration state
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      hydrated: false,
      setAuth: (token, user) => {
        set({ token, user, isAuthenticated: true });
      },
      clearAuth: () => {
        set({ token: null, user: null, isAuthenticated: false });
      },
      updateUser: (updatedUser) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updatedUser } : null,
        }));
      },
      setHydrated: (state) => {
        set({ hydrated: state });
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => {
        // Handle server-side rendering
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {}
          };
        }
        
        return localStorage;
      }),
      partialize: (state) => {
        return { 
          token: state.token, 
          user: state.user,
          isAuthenticated: state.isAuthenticated 
        };
      },
      onRehydrateStorage: (state) => {
        return (rehydratedState, error) => {
          if (!error && typeof window !== 'undefined') {
            setTimeout(() => {
              useAuthStore.getState().setHydrated(true);
            }, 0);
          }
        };
      },
    }
  )
); 