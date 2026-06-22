/* eslint-disable react-refresh/only-export-components, react-hooks/refs */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getDefaultWebSocketUrl } from "../services/wsClient";

const WebSocketContext = createContext(null);

const CONNECT_TIMEOUT_MS = 8000;
const MAX_RECONNECT_DELAY_MS = 15000;
const BASE_RECONNECT_DELAY_MS = 1000;

export const WebSocketProvider = ({ children, url }) => {
  const wsRef = useRef(null);
  const connectRef = useRef(null);
  const reconnectTimer = useRef(null);
  const connectTimeoutTimer = useRef(null);
  const reconnectAttempt = useRef(0);
  const shouldReconnect = useRef(true);
  const mountedRef = useRef(true);

  const [status, setStatus] = useState("connecting");
  const [lastMessage, setLastMessage] = useState(null);

  const wsUrl = useMemo(() => url || getDefaultWebSocketUrl({ path: "/ws" }), [url]);

  const clearTimers = () => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (connectTimeoutTimer.current) {
      clearTimeout(connectTimeoutTimer.current);
      connectTimeoutTimer.current = null;
    }
  };

  const sendJson = useCallback((data) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    try {
      ws.send(JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }, []);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    clearTimers();

    let ws;
    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      setStatus("error");
      return;
    }
    wsRef.current = ws;
    setStatus("connecting");

    connectTimeoutTimer.current = setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    }, CONNECT_TIMEOUT_MS);

    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return; }
      clearTimers();
      reconnectAttempt.current = 0;
      setStatus("open");
      try {
        ws.send(JSON.stringify({ type: "subscribe", topics: ["public", "products"] }));
      } catch {
        // socket already closed
      }
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
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
      if (!mountedRef.current) return;
      setStatus("closed");
      wsRef.current = null;

      if (!shouldReconnect.current) return;

      const attempt = reconnectAttempt.current + 1;
      reconnectAttempt.current = attempt;
      const delay = Math.min(
        MAX_RECONNECT_DELAY_MS,
        BASE_RECONNECT_DELAY_MS * Math.min(attempt, 6)
      );
      reconnectTimer.current = setTimeout(() => connectRef.current?.(), delay);
    };
  }, [wsUrl]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    mountedRef.current = true;
    shouldReconnect.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      shouldReconnect.current = false;
      clearTimers();
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
