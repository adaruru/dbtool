import { create } from 'zustand';
import type { ConnectionConfig, ConnectionTestResult, ConnectionHistory } from '../types';
import {
  TestMSSQLConnection,
  TestPostgresConnection,
  SaveConnection,
  GetConnectionHistory,
  DeleteConnection,
  SaveConnectionHistory,
  GetConnectionHistories,
  DeleteConnectionHistory
} from '../../wailsjs/go/main/App';

interface ConnectionState {
  sourceConnection: ConnectionConfig | null;
  targetConnection: ConnectionConfig | null;
  sourceTestResult: ConnectionTestResult | null;
  targetTestResult: ConnectionTestResult | null;
  connectionHistory: ConnectionConfig[];
  connectionHistories: ConnectionHistory[];
  loading: boolean;
  error: string | null;

  testMSSQLConnection: (connString: string) => Promise<ConnectionTestResult>;
  testPostgresConnection: (connString: string) => Promise<ConnectionTestResult>;
  saveConnection: (config: ConnectionConfig) => Promise<void>;
  loadConnectionHistory: () => Promise<void>;
  deleteConnection: (id: string) => Promise<void>;
  saveConnectionHistory: (connHistory: ConnectionHistory) => Promise<void>;
  loadConnectionHistories: () => Promise<void>;
  deleteConnectionHistory: (id: string) => Promise<void>;
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
  connectionHistories: [],
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
  clearError: () => set({ error: null }),

  saveConnectionHistory: async (connHistory: ConnectionHistory) => {
    try {
      await SaveConnectionHistory(connHistory as never);
      await get().loadConnectionHistories();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to save connection history';
      set({ error: message });
      throw e;
    }
  },

  loadConnectionHistories: async () => {
    try {
      const connectionHistories = await GetConnectionHistories();
      set({ connectionHistories: (connectionHistories || []) as unknown as ConnectionHistory[] });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load connection histories';
      set({ error: message });
    }
  },

  deleteConnectionHistory: async (id: string) => {
    try {
      await DeleteConnectionHistory(id);
      await get().loadConnectionHistories();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to delete connection history';
      set({ error: message });
      throw e;
    }
  }
}));
