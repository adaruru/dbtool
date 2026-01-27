import { create } from 'zustand';
import type {
  ConnectionTestResult,
  ConnectionHistory,
  ConnectionType,
  TestedConnection
} from '../types';
import {
  TestMSSQLConnection,
  TestPostgresConnection,
  SaveConnectionHistory,
  GetConnectionHistories,
  DeleteConnectionHistory
} from '../../wailsjs/go/main/App';

interface ConnectionState {
  sourceTestResult: ConnectionTestResult | null;
  connectionHistories: ConnectionHistory[];
  testedConnections: TestedConnection[];
  loading: boolean;
  error: string | null;

  testMSSQLConnection: (connString: string) => Promise<ConnectionTestResult>;
  testPostgresConnection: (connString: string) => Promise<ConnectionTestResult>;
  saveConnectionHistory: (connHistory: ConnectionHistory) => Promise<void>;
  loadConnectionHistories: () => Promise<void>;
  deleteConnectionHistory: (id: string) => Promise<void>;
  recordTestedConnection: (
    connectionType: ConnectionType,
    connectionString: string,
    testResult: ConnectionTestResult,
    selectedDatabase?: string
  ) => void;
  updateTestedConnectionDatabase: (
    connectionType: ConnectionType,
    connectionString: string,
    selectedDatabase: string
  ) => void;
  clearError: () => void;
  clearTestResult: () => void;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  sourceTestResult: null,
  connectionHistories: [],
  testedConnections: [],
  loading: false,
  error: null,

  testMSSQLConnection: async (connString: string) => {
    set({ loading: true, error: null });
    try {
      const result = await TestMSSQLConnection(connString);
      set({ sourceTestResult: result, loading: false });
      get().recordTestedConnection('mssql', connString, result, result.databases?.[0]);
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
      set({ loading: false });
      get().recordTestedConnection('postgres', connString, result, result.databases?.[0]);
      return result;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Connection test failed';
      set({ error: message, loading: false });
      throw e;
    }
  },

  clearError: () => set({ error: null }),
  clearTestResult: () => set({ sourceTestResult: null }),

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
  },

  recordTestedConnection: (connectionType, connectionString, testResult, selectedDatabase = '') =>
    set((state) => {
      if (!testResult.success) {
        return state;
      }

      const existingIndex = state.testedConnections.findIndex(
        (conn) =>
          conn.connectionType === connectionType && conn.connectionString === connectionString
      );

      const mergedSelectedDb =
        selectedDatabase ||
        (existingIndex >= 0 ? state.testedConnections[existingIndex].selectedDatabase : '') ||
        testResult.databases?.[0] ||
        '';

      const now = new Date().toISOString();

      const newEntry: TestedConnection = {
        id:
          existingIndex >= 0
            ? state.testedConnections[existingIndex].id
            : (typeof crypto !== 'undefined' && 'randomUUID' in crypto
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(16).slice(2)}`),
        connectionType,
        connectionString,
        testResult,
        selectedDatabase: mergedSelectedDb,
        createdAt: now
      };

      if (existingIndex >= 0) {
        const updated = [...state.testedConnections];
        updated[existingIndex] = { ...updated[existingIndex], ...newEntry };
        return { testedConnections: updated };
      }

      return { testedConnections: [...state.testedConnections, newEntry] };
    }),

  updateTestedConnectionDatabase: (connectionType, connectionString, selectedDatabase) =>
    set((state) => {
      const idx = state.testedConnections.findIndex(
        (conn) =>
          conn.connectionType === connectionType && conn.connectionString === connectionString
      );
      if (idx === -1) return state;

      const updated = [...state.testedConnections];
      updated[idx] = { ...updated[idx], selectedDatabase };
      return { testedConnections: updated };
    })
}));
