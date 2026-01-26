import { useState, useEffect } from 'react';
import type { Project } from '../stores/projectStore';

// Format time ago in a human-readable way
function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) {
    return 'just now';
  } else if (minutes < 60) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else if (days < 30) {
    return `${days}d ago`;
  } else if (months < 12) {
    return `${months}mo ago`;
  } else {
    return `${years}y ago`;
  }
}

export function useLastActiveTime(project: Project | null | undefined) {
  const [timeAgo, setTimeAgo] = useState<string | null>(null);
  const [timestamp, setTimestamp] = useState<number | null>(null);

  useEffect(() => {
    if (!project) {
      setTimeAgo(null);
      setTimestamp(null);
      return;
    }

    // Fetch last commit time
    const fetchLastCommitTime = async () => {
      try {
        const result = await window.commanddeck.getLastCommitTime(project.name);
        if (result.ok && result.timestamp) {
          setTimestamp(result.timestamp);
          setTimeAgo(formatTimeAgo(result.timestamp));
        } else {
          setTimeAgo(null);
          setTimestamp(null);
        }
      } catch (err) {
        console.error(`[useLastActiveTime] Failed to get last commit time for ${project.name}:`, err);
        setTimeAgo(null);
        setTimestamp(null);
      }
    };

    fetchLastCommitTime();

    // Update every minute
    const interval = setInterval(() => {
      if (timestamp) {
        setTimeAgo(formatTimeAgo(timestamp));
      } else {
        fetchLastCommitTime();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [project?.name]);

  return { timeAgo, timestamp };
}
