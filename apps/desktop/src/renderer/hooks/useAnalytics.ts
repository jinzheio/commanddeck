import { useCallback, useEffect, useState } from 'react';
import type { Project } from '../stores/projectStore';

export type AnalyticsRow = {
  project_id: string;
  zone_id: string;
  ts_hour_utc: string;
  requests: number | null;
  status_4xx: number | null;
  status_5xx: number | null;
  cache_hit_ratio: number | null;
  countries_top3: string | null;
};

type AnalyticsState = {
  loading: boolean;
  error: string | null;
  rows: AnalyticsRow[];
};

const HUB_URL = 'http://127.0.0.1:8787';

export function useAnalytics(project: Project | null, hours = 24) {
  const [state, setState] = useState<AnalyticsState>({
    loading: false,
    error: null,
    rows: [],
  });

  const fetchAnalytics = useCallback(async () => {
    if (!project?.domain) {
      setState({ loading: false, error: null, rows: [] });
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const url = `${HUB_URL}/analytics?project_id=${encodeURIComponent(
        project.domain
      )}&hours=${hours}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Hub ${response.status}`);
      }
      const data = await response.json();
      setState({ loading: false, error: null, rows: data.data ?? [] });
    } catch (error: any) {
      setState({
        loading: false,
        error: error?.message ?? 'Failed to fetch analytics',
        rows: [],
      });
    }
  }, [project?.domain, hours]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return { ...state, refresh: fetchAnalytics };
}
