import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { AUTOSAVE_INTERVAL_MS } from '../utils/constants';

interface UseSocketResult {
  socket: Socket | null;
  isConnected: boolean;
  remainingSeconds: number | null;
  lastSaved: string | null;
  forceSubmitMsg: string | null;
  triggerSave: (answers: Record<string, string>) => void;
}

export function useSocket(examId: string, initialAnswers: Record<string, string>, examToken?: string): UseSocketResult {
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

  // Fallback REST auto-save when WebSocket is unavailable or disconnected
  const saveViaRest = useCallback(async (answers: Record<string, string>) => {
    try {
      const res = await axios.put('/seb/submission/save', { answers }, { withCredentials: true });
      if (res.data?.savedAt) {
        setLastSaved(res.data.savedAt);
        savedAnswersRef.current = answers;
      }
    } catch (err: any) {
      console.warn('[autosave] REST fallback error:', err.message);
    }
  }, []);

  // Smooth local countdown ticker every second so the timer never freezes on network disconnect
  useEffect(() => {
    if (remainingSeconds === null || remainingSeconds <= 0) return;
    const ticker = setInterval(() => {
      setRemainingSeconds((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(ticker);
  }, [remainingSeconds !== null]);

  const triggerSave = useCallback((answers: Record<string, string>) => {
    const current = JSON.stringify(answers);
    const saved = JSON.stringify(savedAnswersRef.current);
    if (current === saved) return;

    if (socket && isConnected) {
      socket.emit('exam:autosave', { answers });
      savedAnswersRef.current = answers;
    } else {
      saveViaRest(answers);
    }
  }, [socket, isConnected, saveViaRest]);

  useEffect(() => {
    // Socket.io automatically includes credentials (cookies) due to withCredentials: true
    const socketUrl = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') 
      : window.location.origin;

    console.info('[socket-client] connecting to:', socketUrl, { path: '/api/socket.io', hasToken: !!examToken });

    const s = io(socketUrl, {
      path: '/api/socket.io',
      withCredentials: true,
      transports: ['websocket', 'polling'],
      auth: examToken ? { examToken } : undefined,
    });

    s.on('connect', () => {
      console.info('[socket-client] connected successfully');
      setIsConnected(true);

      // Flush any dirty answers immediately on connection/reconnection
      const current = JSON.stringify(answersRef.current);
      const saved = JSON.stringify(savedAnswersRef.current);
      if (current !== saved) {
        s.emit('exam:autosave', { answers: answersRef.current });
        savedAnswersRef.current = answersRef.current;
      }
    });

    s.on('disconnect', () => {
      console.info('[socket-client] disconnected — falling back to REST autosave');
      setIsConnected(false);
    });

    s.on('exam:timer:sync', (payload: { remaining: number }) => {
      setRemainingSeconds(payload.remaining);
    });

    s.on('exam:autosave:ack', (payload: { savedAt: string }) => {
      setLastSaved(payload.savedAt);
    });

    s.on('exam:force-save', (_payload: { message: string }) => {
      const answerState = answersRef.current;
      if (s.connected) {
        s.emit('exam:autosave', { answers: answerState });
      } else {
        saveViaRest(answerState);
      }
    });

    s.on('exam:force-submit', (payload: { message: string }) => {
      setForceSubmitMsg(payload.message);
    });

    s.on('connect_error', (err) => {
      console.warn('[socket-client] connection error, relying on REST:', err.message);
      setIsConnected(false);
    });

    s.on('error', (err) => {
      console.error('[socket-client] socket error:', err);
    });

    setSocket(s);

    // Setup auto-save interval with dual-transport resilience (WebSocket + REST fallback)
    const interval = setInterval(() => {
      const answers = answersRef.current;
      const currentStr = JSON.stringify(answers);
      const savedStr = JSON.stringify(savedAnswersRef.current);
      if (currentStr !== savedStr) {
        if (s.connected) {
          s.emit('exam:autosave', { answers });
          savedAnswersRef.current = answers;
        } else {
          saveViaRest(answers);
        }
      }
    }, AUTOSAVE_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      s.disconnect();
    };
  }, [examId, examToken, saveViaRest]);

  return { socket, isConnected, remainingSeconds, lastSaved, forceSubmitMsg, triggerSave };
}
