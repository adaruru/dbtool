import { create } from 'zustand';
import type {
  ConnectionTestResult,
  Connection,
  ConnectionType
} from '../types';
import {
  TestMSSQLConnection,
  TestPostgresConnection
} from '../../wailsjs/go/main/App';

interface ConnectionState {
  sourceTestResult: ConnectionTestResult | null;
  connections: Connection[];
  loading: boolean;
  error: string | null;

  testMSSQLConnection: (connString: string) => Promise<ConnectionTestResult>;
  testPostgresConnection: (connString: string) => Promise<ConnectionTestResult>;
  saveConnection: (connection: Connection) => void;
  loadConnections: () => void;
  deleteConnection: (id: string) => void;
  getActiveConnections: () => Connection[];
  recordTestedConnection: (
    connectionType: ConnectionType,
    connectionString: string,
    testResult: ConnectionTestResult,
    selectedDatabase?: string
  ) => void;
  updateConnectionDatabase: (
    connectionType: ConnectionType,
    connectionString: string,
    selectedDatabase: string
  ) => void;
  clearError: () => void;
  clearTestResult: () => void;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  sourceTestResult: null,
  connections: [],
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
      set({ sourceTestResult: result, loading: false });
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

  // Save connection to localStorage
  saveConnection: (connection: Connection) => {
    const state = get();
    const existingIndex = state.connections.findIndex(
      (conn) =>
        conn.connectionType === connection.connectionType &&
        conn.connectionString === connection.connectionString &&
        !conn.deletedAt
    );

    let updatedConnections: Connection[];
    if (existingIndex >= 0) {
      updatedConnections = [...state.connections];
      updatedConnections[existingIndex] = { ...connection, id: updatedConnections[existingIndex].id };
    } else {
      updatedConnections = [...state.connections, connection];
    }

    set({ connections: updatedConnections });
    localStorage.setItem('connections', JSON.stringify(updatedConnections));
  },

  // Load connections from localStorage
  loadConnections: () => {
    try {
      const stored = localStorage.getItem('connections');
      if (stored) {
        const connections = JSON.parse(stored) as Connection[];
        set({ connections });
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load connections';
      set({ error: message });
    }
  },

  // Soft delete connection
  deleteConnection: (id: string) => {
    const state = get();
    const updatedConnections = state.connections.map((conn) =>
      conn.id === id ? { ...conn, deletedAt: new Date().toISOString() } : conn
    );
    set({ connections: updatedConnections });
    localStorage.setItem('connections', JSON.stringify(updatedConnections));
  },

  // Get only non-deleted connections
  getActiveConnections: () => {
    return get().connections.filter((conn) => !conn.deletedAt);
  },

  recordTestedConnection: (connectionType, connectionString, testResult, selectedDatabase = '') =>
    set((state) => {
      if (!testResult.success) {
        return state;
      }

      const existingIndex = state.connections.findIndex(
        (conn) =>
          conn.connectionType === connectionType &&
          conn.connectionString === connectionString &&
          !conn.deletedAt
      );

      const mergedSelectedDb =
        selectedDatabase ||
        (existingIndex >= 0 ? state.connections[existingIndex].selectedDatabase : '') ||
        testResult.databases?.[0] ||
        '';

      const now = new Date().toISOString();

      const newEntry: Connection = {
        id:
          existingIndex >= 0
            ? state.connections[existingIndex].id
            : (typeof crypto !== 'undefined' && 'randomUUID' in crypto
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(16).slice(2)}`),
        connectionType,
        connectionString,
        testResult,
        selectedDatabase: mergedSelectedDb,
        createdAt: existingIndex >= 0 ? state.connections[existingIndex].createdAt : now
      };

      let updatedConnections: Connection[];
      if (existingIndex >= 0) {
        updatedConnections = [...state.connections];
        updatedConnections[existingIndex] = { ...updatedConnections[existingIndex], ...newEntry };
      } else {
        updatedConnections = [...state.connections, newEntry];
      }

      // Save to localStorage
      localStorage.setItem('connections', JSON.stringify(updatedConnections));

      return { connections: updatedConnections };
    }),

  updateConnectionDatabase: (connectionType, connectionString, selectedDatabase) =>
    set((state) => {
      const idx = state.connections.findIndex(
        (conn) =>
          conn.connectionType === connectionType &&
          conn.connectionString === connectionString &&
          !conn.deletedAt
      );
      if (idx === -1) return state;

      const updated = [...state.connections];
      updated[idx] = { ...updated[idx], selectedDatabase };

      // Save to localStorage
      localStorage.setItem('connections', JSON.stringify(updated));

      return { connections: updated };
    })
}));
