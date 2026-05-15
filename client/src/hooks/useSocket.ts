import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { AUTOSAVE_INTERVAL_MS } from '../utils/constants';

interface UseSocketResult {
  socket: Socket | null;
  isConnected: boolean;
  remainingSeconds: number | null;
  lastSaved: string | null;
  forceSubmitMsg: string | null;
  triggerSave: (answers: Record<string, string>) => void;
}

export function useSocket(examId: string, initialAnswers: Record<string, string>): UseSocketResult {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [forceSubmitMsg, setForceSubmitMsg] = useState<string | null>(null);
  
  const answersRef = useRef(initialAnswers);
  const savedAnswersRef = useRef(initialAnswers); // To track dirty state

  // Update ref when component state changes
  useEffect(() => {
    answersRef.current = initialAnswers;
  }, [initialAnswers]);

  const triggerSave = useCallback((answers: Record<string, string>) => {
    if (!socket || !isConnected) return;
    
    // Check if answers actually changed since last save
    const current = JSON.stringify(answers);
    const saved = JSON.stringify(savedAnswersRef.current);
    
    if (current !== saved) {
      socket.emit('exam:autosave', { answers });
      savedAnswersRef.current = answers;
    }
  }, [socket, isConnected]);

  useEffect(() => {
    // We don't manually send the token via query params because the server
    // uses standard HTTP cookies (exam_token is httpOnly).
    // Socket.io automatically includes credentials (cookies) due to withCredentials: true
    const socketUrl = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') 
      : window.location.origin;

    const s = io(socketUrl, {
      path: '/socket.io',
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => {
      setIsConnected(true);
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    s.on('exam:timer:sync', (payload: { remaining: number }) => {
      setRemainingSeconds(payload.remaining);
    });

    s.on('exam:autosave:ack', (payload: { savedAt: string }) => {
      setLastSaved(payload.savedAt);
    });

    s.on('exam:force-submit', (payload: { message: string }) => {
      setForceSubmitMsg(payload.message);
    });

    s.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });

    setSocket(s);

    // Setup auto-save interval
    const interval = setInterval(() => {
      if (s.connected) {
        const answers = answersRef.current;
        const currentStr = JSON.stringify(answers);
        const savedStr = JSON.stringify(savedAnswersRef.current);
        if (currentStr !== savedStr) {
          s.emit('exam:autosave', { answers });
          savedAnswersRef.current = answers;
        }
      }
    }, AUTOSAVE_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      s.disconnect();
    };
  }, [examId]);

  return { socket, isConnected, remainingSeconds, lastSaved, forceSubmitMsg, triggerSave };
}
