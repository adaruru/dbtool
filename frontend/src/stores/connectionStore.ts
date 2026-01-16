import { create } from 'zustand';
import type { ConnectionConfig, ConnectionTestResult } from '../types';
import {
  TestMSSQLConnection,
  TestPostgresConnection,
  SaveConnection,
  GetConnectionHistory,
  DeleteConnection
} from '../../wailsjs/go/main/App';

interface ConnectionState {
  sourceConnection: ConnectionConfig | null;
  targetConnection: ConnectionConfig | null;
  sourceTestResult: ConnectionTestResult | null;
  targetTestResult: ConnectionTestResult | null;
  connectionHistory: ConnectionConfig[];
  loading: boolean;
  error: string | null;

  testMSSQLConnection: (connString: string) => Promise<ConnectionTestResult>;
  testPostgresConnection: (connString: string) => Promise<ConnectionTestResult>;
  saveConnection: (config: ConnectionConfig) => Promise<void>;
  loadConnectionHistory: () => Promise<void>;
  deleteConnection: (id: string) => Promise<void>;
  setSourceConnection: (conn: ConnectionConfig | null) => void;
  setTargetConnection: (conn: ConnectionConfig | null) => void;
  clearError: () => void;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  sourceConnection: null,
  targetConnection: null,
  sourceTestResult: null,
  targetTestResult: null,
  connectionHistory: [],
  loading: false,
  error: null,

  testMSSQLConnection: async (connString: string) => {
    set({ loading: true, error: null });
    try {
      const result = await TestMSSQLConnection(connString);
      set({ sourceTestResult: result, loading: false });
      return result;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Connection test failed';
      set({ error: message, loading: false });
      throw e;
    }
  },

  testPostgresConnection: async (connString: string) => {
    set({ loading: true, error: null });
    try {
      const result = await TestPostgresConnection(connString);
      set({ targetTestResult: result, loading: false });
      return result;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Connection test failed';
      set({ error: message, loading: false });
      throw e;
    }
  },

  saveConnection: async (config: ConnectionConfig) => {
    try {
      await SaveConnection(config as never);
      await get().loadConnectionHistory();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to save connection';
      set({ error: message });
      throw e;
    }
  },

  loadConnectionHistory: async () => {
    try {
      const history = await GetConnectionHistory();
      set({ connectionHistory: (history || []) as unknown as ConnectionConfig[] });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load history';
      set({ error: message });
    }
  },

  deleteConnection: async (id: string) => {
    try {
      await DeleteConnection(id);
      await get().loadConnectionHistory();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to delete connection';
      set({ error: message });
      throw e;
    }
  },

  setSourceConnection: (conn) => set({ sourceConnection: conn }),
  setTargetConnection: (conn) => set({ targetConnection: conn }),
  clearError: () => set({ error: null })
}));
