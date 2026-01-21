import { useState, useCallback } from 'react';

export interface GitChange {
  file: string;
  status: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
  timestamp: number;
}

export function useGitChanges(projectName: string | null) {
  const [changes, setChanges] = useState<GitChange[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchChanges = useCallback(async () => {
    if (!projectName) {
      setChanges([]);
      return;
    }

    console.log('[useGitChanges] Fetching changes for project:', projectName);
    setLoading(true);
    try {
      const result = await window.commanddeck.getGitChanges(projectName);
      console.log('[useGitChanges] Result:', result);
      
      if (result.ok && result.changes) {
        console.log('[useGitChanges] Found changes:', result.changes.length);
        setChanges(result.changes);
      } else {
        console.log('[useGitChanges] No changes or error:', result.reason);
        setChanges([]);
      }
    } catch (err) {
      console.error('[useGitChanges] Failed to fetch changes:', err);
      setChanges([]);
    } finally {
      setLoading(false);
    }
  }, [projectName]);

  const approveChange = useCallback(async (filePath: string) => {
    if (!projectName) return { ok: false };
    
    const result = await window.commanddeck.approveGitChange(projectName, filePath);
    if (result.ok) {
      await fetchChanges(); // Refresh list
    }
    return result;
  }, [projectName, fetchChanges]);

  const rejectChange = useCallback(async (filePath: string) => {
    if (!projectName) return { ok: false };
    
    const result = await window.commanddeck.rejectGitChange(projectName, filePath);
    if (result.ok) {
      await fetchChanges(); // Refresh list
    }
    return result;
  }, [projectName, fetchChanges]);

  const approveAll = useCallback(async () => {
    if (!projectName) return;
    
    for (const change of changes) {
      await window.commanddeck.approveGitChange(projectName, change.file);
    }
    await fetchChanges();
  }, [projectName, changes, fetchChanges]);

  const rejectAll = useCallback(async () => {
    if (!projectName) return;
    
    for (const change of changes) {
      await window.commanddeck.rejectGitChange(projectName, change.file);
    }
    await fetchChanges();
  }, [projectName, changes, fetchChanges]);

  return {
    changes,
    loading,
    fetchChanges,
    approveChange,
    rejectChange,
    approveAll,
    rejectAll,
  };
}
