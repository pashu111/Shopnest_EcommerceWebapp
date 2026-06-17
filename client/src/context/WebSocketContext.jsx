/* eslint-disable react-refresh/only-export-components, react-hooks/refs */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getDefaultWebSocketUrl } from "../services/wsClient";

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children, url }) => {
  const wsRef = useRef(null);
  const connectRef = useRef(null);
  const reconnectTimer = useRef(null);
  const reconnectAttempt = useRef(0);
  const shouldReconnect = useRef(true);

  const [status, setStatus] = useState("connecting"); // connecting | open | closed | error
  const [lastMessage, setLastMessage] = useState(null);

  const wsUrl = useMemo(() => url || getDefaultWebSocketUrl({ path: "/ws" }), [url]);

  const clearReconnectTimer = () => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  };

  const sendJson = useCallback((data) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify(data));
    return true;
  }, []);

  const connect = useCallback(() => {
    clearReconnectTimer();

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    setStatus("connecting");

    ws.onopen = () => {
      reconnectAttempt.current = 0;
      setStatus("open");
      sendJson({ type: "subscribe", topics: ["public", "products"] });
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        setLastMessage(parsed);
      } catch {
        setLastMessage({ type: "raw", payload: event.data, ts: Date.now() });
      }
    };

    ws.onerror = () => {
      setStatus("error");
    };

    ws.onclose = () => {
      setStatus("closed");
      wsRef.current = null;

      if (!shouldReconnect.current) return;

      const attempt = reconnectAttempt.current + 1;
      reconnectAttempt.current = attempt;
      const delay = Math.min(10000, 500 * 2 ** Math.min(attempt, 5));
      reconnectTimer.current = setTimeout(() => connectRef.current?.(), delay);
    };
  }, [sendJson, wsUrl]);
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    shouldReconnect.current = true;
    connect();

    return () => {
      shouldReconnect.current = false;
      clearReconnectTimer();
      try {
        wsRef.current?.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    };
  }, [connect]);

  const value = useMemo(
    () => ({
      status,
      lastMessage,
      sendJson,
      url: wsUrl,
    }),
    [lastMessage, sendJson, status, wsUrl]
  );

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};

export const useWebSocket = () => {
  const ctx = useContext(WebSocketContext);
  if (!ctx) {
    throw new Error("useWebSocket must be used inside WebSocketProvider");
  }
  return ctx;
};
