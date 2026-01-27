import { create } from 'zustand';
import type {
  ConnectionTestResult,
  Connection,
  ConnectionType
} from '../types';
import {
  TestMSSQLConnection,
  TestPostgresConnection,
  SaveConnection,
  GetConnections,
  DeleteConnection
} from '../../wailsjs/go/main/App';
import { types } from '../../wailsjs/go/models';

interface ConnectionState {
  sourceTestResult: ConnectionTestResult | null;
  connections: Connection[];
  loading: boolean;
  error: string | null;

  testMSSQLConnection: (connString: string) => Promise<ConnectionTestResult>;
  testPostgresConnection: (connString: string) => Promise<ConnectionTestResult>;
  saveConnection: (connection: Connection) => Promise<void>;
  loadConnections: () => Promise<void>;
  deleteConnection: (id: string) => Promise<void>;
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

  // Save connection via backend API
  saveConnection: async (connection: Connection) => {
    try {
      const config = new types.ConnectionConfig({
        id: connection.id || '',
        name: '',
        type: connection.connectionType,
        connectionString: connection.connectionString,
        database: connection.selectedDatabase || '',
        createdAt: connection.createdAt || new Date().toISOString(),
        lastUsedAt: new Date().toISOString()
      });

      console.log('Saving connection to backend:', config);
      await SaveConnection(config);
      
      // Reload connections from backend to sync state
      await get().loadConnections();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to save connection';
      console.error('Save connection error:', message, e);
      set({ error: message });
      throw e;
    }
  },

  // Load connections from backend API
  loadConnections: async () => {
    try {
      console.log('Loading connections from backend...');
      const configs = await GetConnections();
      console.log('Loaded connection configs:', configs);
      
      if (!configs) {
        set({ connections: [], error: null });
        return;
      }

      const connections: Connection[] = configs.map(config => ({
        id: config.id,
        connectionType: config.type as ConnectionType,
        connectionString: config.connectionString,
        selectedDatabase: config.database,
        createdAt: config.createdAt,
        testResult: { 
          success: true, 
          message: '', 
          databases: config.database ? [config.database] : [] 
        }
      }));

      console.log('Mapped connections:', connections);
      set({ connections, error: null });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load connections';
      console.error('Load connections error:', message, e);
      set({ error: message, connections: [] });
    }
  },

  // Soft delete connection via backend API
  deleteConnection: async (id: string) => {
    try {
      console.log('Deleting connection:', id);
      await DeleteConnection(id);
      
      // Reload connections from backend to sync state
      await get().loadConnections();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to delete connection';
      console.error('Delete connection error:', message, e);
      set({ error: message });
      throw e;
    }
  },

  // Get only non-deleted connections
  getActiveConnections: () => {
    return get().connections; //filter((conn) => !conn.deletedAt) 不需要，api 層過濾
  },

  recordTestedConnection: (connectionType, connectionString, testResult, selectedDatabase = '') =>
    set((state) => {
      if (!testResult.success) {
        return state;
      }

      const existingIndex = state.connections.findIndex(
        (conn) =>
          conn.connectionType === connectionType &&
          conn.connectionString === connectionString
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

      return { connections: updatedConnections };
    }),

  updateConnectionDatabase: (connectionType, connectionString, selectedDatabase) =>
    set((state) => {
      const idx = state.connections.findIndex(
        (conn) =>
          conn.connectionType === connectionType &&
          conn.connectionString === connectionString
      );
      if (idx === -1) return state;

      const updated = [...state.connections];
      updated[idx] = { ...updated[idx], selectedDatabase };

      return { connections: updated };
    })
}));
