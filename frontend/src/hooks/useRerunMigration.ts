import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { GetMigration, GetMigrationTables } from '../../wailsjs/go/main/App';
import type { MigrationConfig } from '../types';

export interface RerunTableItem {
  schemaName: string;
  tableName: string;
  migrateOrder: number;
}

export interface UseRerunMigrationResult {
  isRerunMode: boolean;
  originalName: string | null;
  config: MigrationConfig | null;
  tables: string[];
  isLoading: boolean;
  error: string | null;
  clearRerun: () => void;
}

function parseConfigJson(configJson: string): MigrationConfig | null {
  try {
    return JSON.parse(configJson) as MigrationConfig;
  } catch {
    return null;
  }
}

function tableListToFullNames(items: RerunTableItem[]): string[] {
  return items
    .sort((a, b) => a.migrateOrder - b.migrateOrder)
    .map((t) => (t.schemaName ? `${t.schemaName}.${t.tableName}` : t.tableName));
}

/**
 * 依 rerunId 載入歷史遷移設定，供 Migration 頁面預填表單。
 * 回傳 config、表格清單（依 migrate_order）、originalName，及 clearRerun 清除參數。
 */
export function useRerunMigration(rerunId: string | null): UseRerunMigrationResult {
  const navigate = useNavigate();
  const [config, setConfig] = useState<MigrationConfig | null>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [originalName, setOriginalName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRerunMode = !!rerunId;

  useEffect(() => {
    if (!rerunId) {
      setConfig(null);
      setTables([]);
      setOriginalName(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([GetMigration(rerunId), GetMigrationTables(rerunId)])
      .then(([record, tableStates]) => {
        if (cancelled) return;
        if (!record) {
          setError('Migration record not found');
          setConfig(null);
          setTables([]);
          setOriginalName(null);
          return;
        }
        const parsed = parseConfigJson(record.config || '{}');
        setConfig(parsed);
        setOriginalName(record.name || null);
        const fullNames = tableListToFullNames(
          (tableStates || []) as RerunTableItem[]
        );
        setTables(fullNames);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load migration');
          setConfig(null);
          setTables([]);
          setOriginalName(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [rerunId]);

  const clearRerun = useCallback(() => {
    navigate('/migration', { replace: true, state: {} });
    setConfig(null);
    setTables([]);
    setOriginalName(null);
    setError(null);
  }, [navigate]);

  return {
    isRerunMode,
    originalName,
    config,
    tables,
    isLoading,
    error,
    clearRerun
  };
}
