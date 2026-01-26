import type { Project } from '../stores/projectStore';
import type { AnalyticsRow } from '../hooks/useAnalytics';
import { useLastActiveTime } from '../hooks/useLastActiveTime';

type TrafficPanelProps = {
  project: Project | null;
  rows: AnalyticsRow[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onRefresh: () => void;
};

function formatHour(ts: string) {
  const date = new Date(ts);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) return '--';
  return `${Math.round(value * 100)}%`;
}

function parseCountries(rows: AnalyticsRow[]) {
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const raw = rows[i].countries_top3;
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [];
    }
  }
  return [];
}

function sparkline(values: number[]) {
  if (!values.length) return '';
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1 || 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

function formatLastActive(timestamp: number | null | undefined) {
  if (!timestamp) return '--';
  const diffMs = Date.now() - timestamp;
  if (diffMs < 0) return '0 min';
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hrs`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} days`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} months`;
  const years = Math.floor(days / 365);
  return `${years} years`;
}

export function TrafficPanel({
  project,
  rows,
  loading,
  error,
  onClose,
  onRefresh,
}: TrafficPanelProps) {
  const latest = rows[rows.length - 1];
  const values = rows.map((row) => row.requests ?? 0);
  const polyline = sparkline(values);
  const { timestamp: lastActiveTimestamp } = useLastActiveTime(project);
  const lastActiveLabel = formatLastActive(lastActiveTimestamp);

  return (
    <div className="absolute top-16 right-6 z-30 w-80 bg-rim-panel/10 border border-rim-border shadow-xl rounded backdrop-blur-sm">
      <div className="panel-header">
        <span>Stats</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="text-rim-muted hover:text-white"
          >
            ↻
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-rim-muted hover:text-white"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="p-4 space-y-3 text-sm">
        {!project?.domain && (
          <div className="text-rim-muted">
            No Cloudflare domain configured.
          </div>
        )}
        {error && <div className="text-rim-error">Error: {error}</div>}
        {loading && <div className="text-rim-muted">Loading analytics…</div>}
        {!loading && project && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-rim-bg/60 p-2 rounded col-span-2">
                <div className="text-xs text-rim-muted">Last active</div>
                <div className="text-lg font-semibold flex items-center gap-2">
                  <span>🕒</span>
                  <span>{lastActiveLabel}</span>
                </div>
              </div>
              {project?.domain && (
                <>
                  <div className="bg-rim-bg/60 p-2 rounded">
                    <div className="text-xs text-rim-muted">Requests</div>
                    <div className="text-lg font-semibold">
                      {latest?.requests ?? '--'}
                    </div>
                  </div>
                  <div className="bg-rim-bg/60 p-2 rounded">
                    <div className="text-xs text-rim-muted">Cache Hit</div>
                    <div className="text-lg font-semibold">
                      {formatPercent(latest?.cache_hit_ratio ?? null)}
                    </div>
                  </div>
                  <div className="bg-rim-bg/60 p-2 rounded">
                    <div className="text-xs text-rim-muted">4xx</div>
                    <div className="text-lg font-semibold text-rim-warning">
                      {latest?.status_4xx ?? '--'}
                    </div>
                  </div>
                  <div className="bg-rim-bg/60 p-2 rounded">
                    <div className="text-xs text-rim-muted">5xx</div>
                    <div className="text-lg font-semibold text-rim-error">
                      {latest?.status_5xx ?? '--'}
                    </div>
                  </div>
                </>
              )}
            </div>

            {project?.domain && (
              <div className="bg-rim-bg/40 p-2 rounded">
                <div className="flex items-center justify-between text-xs text-rim-muted mb-2">
                  <span>Last 24h</span>
                  <span>{rows.length ? formatHour(rows[0].ts_hour_utc) : '--'}</span>
                </div>
                <svg viewBox="0 0 100 40" className="w-full h-10">
                  {polyline && (
                    <polyline
                      fill="none"
                      stroke="var(--color-rim-accent)"
                      strokeWidth="2"
                      points={polyline}
                    />
                  )}
                </svg>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
