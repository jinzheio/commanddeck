import { useCallback, useEffect, useState } from 'react';
import type { DeployStatus } from '../../types/ipc';

type DeployState = {
  loading: boolean;
  error: string | null;
  status: DeployStatus | null;
};

export function useDeployStatus(projectName: string | null) {
  const [state, setState] = useState<DeployState>({
    loading: false,
    error: null,
    status: null,
  });

  const fetchStatus = useCallback(async (force = false) => {
    if (!projectName) {
      setState({ loading: false, error: null, status: null });
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await window.commanddeck.getDeployStatus(projectName, { force });
      if (result.ok && result.status) {
        setState({ loading: false, error: null, status: result.status });
      } else {
        setState({
          loading: false,
          error: result.reason || 'Deploy status unavailable',
          status: null,
        });
      }
    } catch (error: any) {
      setState({
        loading: false,
        error: error?.message || 'Deploy status unavailable',
        status: null,
      });
    }
  }, [projectName]);

  useEffect(() => {
    fetchStatus();
    if (!projectName) return;
    const interval = setInterval(() => fetchStatus(false), 60_000);
    return () => clearInterval(interval);
  }, [projectName, fetchStatus]);

  return { ...state, refresh: () => fetchStatus(true) };
}
