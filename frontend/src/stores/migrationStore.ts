import { create } from 'zustand';
import type {
  MigrationConfig,
  MigrationState,
  MigrationRecord,
  LogEntry,
  TableInfo,
  ProgressEvent
} from '../types';
import {
  StartMigration,
  PauseMigration,
  ResumeMigration,
  CancelMigration,
  GetMigrationStatus,
  GetMigrationHistory,
  GetMigrationLogs,
  GetTables
} from '../../wailsjs/go/main/App';
import { EventsOn, EventsOff } from '../../wailsjs/runtime/runtime';

interface MigrationStoreState {
  activeMigrationId: string | null;
  status: MigrationState | null;
  history: MigrationRecord[];
  logs: LogEntry[];
  tables: TableInfo[];
  selectedTables: string[];
  progress: Record<string, ProgressEvent>;
  loading: boolean;
  error: string | null;

  loadTables: (connString: string, database: string) => Promise<void>;
  startMigration: (config: MigrationConfig, name: string) => Promise<string>;
  pauseMigration: () => Promise<void>;
  resumeMigration: () => Promise<void>;
  cancelMigration: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  loadHistory: (limit?: number) => Promise<void>;
  loadLogs: (migrationId: string, limit?: number) => Promise<void>;
  toggleTableSelection: (tableName: string) => void;
  selectAllTables: () => void;
  deselectAllTables: () => void;
  clearError: () => void;
  reset: () => void;
}

export const useMigrationStore = create<MigrationStoreState>((set, get) => ({
  activeMigrationId: null,
  status: null,
  history: [],
  logs: [],
  tables: [],
  selectedTables: [],
  progress: {},
  loading: false,
  error: null,

  loadTables: async (connString: string, database: string) => {
    set({ loading: true, error: null });
    try {
      const result = await GetTables(connString, database);
      const tables = result || [];
      set({
        tables,
        selectedTables: tables.map(t => `${t.schema}.${t.name}`),
        loading: false
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load tables';
      set({ error: message, loading: false });
      throw e;
    }
  },

  startMigration: async (config: MigrationConfig, name: string) => {
    set({ loading: true, error: null });
    try {
      // Setup event listeners
      setupEventListeners(set, get);

      const migrationId = await StartMigration(config as never, name);
      set({ activeMigrationId: migrationId, loading: false });
      return migrationId;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to start migration';
      set({ error: message, loading: false });
      throw e;
    }
  },

  pauseMigration: async () => {
    try {
      await PauseMigration();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to pause';
      set({ error: message });
      throw e;
    }
  },

  resumeMigration: async () => {
    try {
      await ResumeMigration();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to resume';
      set({ error: message });
      throw e;
    }
  },

  cancelMigration: async () => {
    try {
      await CancelMigration();
      cleanupEventListeners();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to cancel';
      set({ error: message });
      throw e;
    }
  },

  refreshStatus: async () => {
    try {
      const result = await GetMigrationStatus();
      if (result) {
        set({ status: result as MigrationState });
      }
    } catch (e) {
      console.error('Failed to refresh status:', e);
    }
  },

  loadHistory: async (limit = 50) => {
    try {
      const result = await GetMigrationHistory(limit);
      set({ history: (result || []) as unknown as MigrationRecord[] });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load history';
      set({ error: message });
    }
  },

  loadLogs: async (migrationId: string, limit = 100) => {
    try {
      const result = await GetMigrationLogs(migrationId, limit);
      set({ logs: (result || []) as unknown as LogEntry[] });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load logs';
      set({ error: message });
    }
  },

  toggleTableSelection: (tableName: string) => {
    const { selectedTables } = get();
    const index = selectedTables.indexOf(tableName);
    if (index > -1) {
      set({ selectedTables: selectedTables.filter(t => t !== tableName) });
    } else {
      set({ selectedTables: [...selectedTables, tableName] });
    }
  },

  selectAllTables: () => {
    const { tables } = get();
    set({ selectedTables: tables.map(t => `${t.schema}.${t.name}`) });
  },

  deselectAllTables: () => {
    set({ selectedTables: [] });
  },

  clearError: () => set({ error: null }),

  reset: () => {
    cleanupEventListeners();
    set({
      activeMigrationId: null,
      status: null,
      logs: [],
      progress: {},
      error: null
    });
  }
}));

function setupEventListeners(
  set: (state: Partial<MigrationStoreState>) => void,
  get: () => MigrationStoreState
) {
  EventsOn('migration:progress', (event: ProgressEvent) => {
    const { progress } = get();
    set({ progress: { ...progress, [event.table]: event } });
    get().refreshStatus();
  });

  EventsOn('migration:log', (event: { migrationId: string; level: string; message: string; timestamp: string }) => {
    const { logs } = get();
    const newLog: LogEntry = {
      id: Date.now(),
      migrationId: event.migrationId,
      level: event.level as LogEntry['level'],
      message: event.message,
      tableName: '',
      details: '',
      createdAt: event.timestamp
    };
    set({ logs: [newLog, ...logs].slice(0, 500) });
  });

  EventsOn('migration:complete', () => {
    get().refreshStatus();
    cleanupEventListeners();
  });

  EventsOn('migration:error', (data: { migrationId: string; error: string }) => {
    set({ error: data.error });
    get().refreshStatus();
    cleanupEventListeners();
  });

  EventsOn('migration:table-complete', () => {
    get().refreshStatus();
  });
}

function cleanupEventListeners() {
  EventsOff('migration:progress');
  EventsOff('migration:log');
  EventsOff('migration:complete');
  EventsOff('migration:error');
  EventsOff('migration:table-complete');
}
