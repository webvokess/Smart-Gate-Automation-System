import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
      transports: ["websocket"],
    });
  }
  return socket;
};

export const useSocket = (events = {}) => {
  const socketRef = useRef(getSocket());

  useEffect(() => {
    const s = socketRef.current;
    Object.entries(events).forEach(([event, handler]) => s.on(event, handler));
    return () => Object.keys(events).forEach((event) => s.off(event));
  }, []);

  return socketRef.current;
};
