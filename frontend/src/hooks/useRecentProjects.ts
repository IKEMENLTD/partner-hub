import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { projectService } from '@/services';
import type { Project } from '@/types';

const STORAGE_KEY = 'recentProjects';
const MAX_RECENT_PROJECTS = 5;

interface RecentProjectEntry {
  projectId: string;
  accessedAt: number;
}

/**
 * LocalStorageから最近使った案件のIDリストを取得
 */
export function getRecentProjects(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const entries: RecentProjectEntry[] = JSON.parse(stored);
    // アクセス日時の降順でソートして、IDのみを返す
    return entries
      .sort((a, b) => b.accessedAt - a.accessedAt)
      .slice(0, MAX_RECENT_PROJECTS)
      .map((entry) => entry.projectId);
  } catch {
    return [];
  }
}

/**
 * LocalStorageに案件アクセス履歴を追加
 */
export function addToRecentProjects(projectId: string): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let entries: RecentProjectEntry[] = stored ? JSON.parse(stored) : [];

    // 既存のエントリを削除（重複防止）
    entries = entries.filter((entry) => entry.projectId !== projectId);

    // 新しいエントリを先頭に追加
    entries.unshift({
      projectId,
      accessedAt: Date.now(),
    });

    // 最大件数を超えたら古いものを削除
    if (entries.length > MAX_RECENT_PROJECTS) {
      entries = entries.slice(0, MAX_RECENT_PROJECTS);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));

    // カスタムイベントを発火して他のコンポーネントに通知
    window.dispatchEvent(new CustomEvent('recentProjectsUpdated'));
  } catch {
    // LocalStorageへの書き込みに失敗した場合は無視
  }
}

/**
 * LocalStorageから案件アクセス履歴を削除
 */
export function removeFromRecentProjects(projectId: string): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    let entries: RecentProjectEntry[] = JSON.parse(stored);
    entries = entries.filter((entry) => entry.projectId !== projectId);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));

    window.dispatchEvent(new CustomEvent('recentProjectsUpdated'));
  } catch {
    // LocalStorageへの書き込みに失敗した場合は無視
  }
}

/**
 * 最近使った案件を管理するカスタムフック
 * LocalStorageの履歴を監視し、案件データを取得して返す
 */
export function useRecentProjects() {
  const [recentProjectIds, setRecentProjectIds] = useState<string[]>(() => getRecentProjects());

  // LocalStorageの変更を監視
  useEffect(() => {
    const handleStorageChange = () => {
      setRecentProjectIds(getRecentProjects());
    };

    // カスタムイベントを監視
    window.addEventListener('recentProjectsUpdated', handleStorageChange);

    // 他のタブからのstorage変更も監視
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) {
        handleStorageChange();
      }
    });

    return () => {
      window.removeEventListener('recentProjectsUpdated', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // 複数のプロジェクトを一度に取得するクエリ
  const {
    data: projects,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['recent-projects', recentProjectIds],
    queryFn: async () => {
      if (recentProjectIds.length === 0) return [];

      // 各プロジェクトを並行して取得
      const projectPromises = recentProjectIds.map(async (id) => {
        try {
          return await projectService.getById(id);
        } catch {
          // 削除されたプロジェクトは除外
          removeFromRecentProjects(id);
          return null;
        }
      });

      const results = await Promise.all(projectPromises);
      // 配列チェックを追加
      if (!Array.isArray(results)) {
        console.error('Unexpected results from Promise.all');
        return [];
      }
      return results.filter((p): p is Project => p !== null);
    },
    enabled: recentProjectIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  // プロジェクトを追加する関数
  const addProject = useCallback((projectId: string) => {
    addToRecentProjects(projectId);
  }, []);

  // プロジェクトを削除する関数
  const removeProject = useCallback((projectId: string) => {
    removeFromRecentProjects(projectId);
  }, []);

  return {
    projects: projects || [],
    projectIds: recentProjectIds,
    isLoading,
    error,
    refetch,
    addProject,
    removeProject,
  };
}
