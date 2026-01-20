import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebSocket(url: string, projectId: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const lastEventIdRef = useRef(0);

  const connect = useCallback(() => {
    if (!url || !projectId) return;
    
    // Cleanup old socket
    if (socketRef.current) {
      socketRef.current.close();
    }

    try {
      console.log("[WS] Connecting to:", url);
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        console.log("[WS] Connected");
        
        // Subscribe
        ws.send(JSON.stringify({
          type: "subscribe",
          project_id: projectId,
          since_event_id: lastEventIdRef.current,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'event' || data.type === 'init') {
            // TODO: dispatch to event store
            console.log("WS Event:", data);
          }
        } catch (e) {
          console.error("WS Parse Error", e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log("[WS] Disconnected");
      };

      ws.onerror = () => {
        setError('Connection failed');
        setIsConnected(false);
      };

      socketRef.current = ws;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  }, [url, projectId]);

  useEffect(() => {
    if (projectId) {
      connect();
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect, projectId]);

  return { isConnected, error, connect };
}
