import { useEffect, useState, useRef, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { api } from '../api';
import type { Exam } from '../types';

export interface Participant {
  submissionId: string;
  studentName: string;
  studentRegNumber: string;
  firstJoinedAt: string;
  lastSeenAt: string;
  isConnected: boolean;
  connections: number;
  hasSubmitted?: boolean;
}

export interface RoomEvent {
  type: 'joined' | 'left' | 'reconnected';
  submissionId: string;
  studentName: string;
  studentRegNumber: string;
  timestamp: string;
  message: string;
}

export interface ExamMonitorData {
  exam: Exam | null;
  participants: Participant[];
  events: RoomEvent[];
  activeCount: number;
  submittedCount: number;
  remainingSeconds: number | null;
  isConnectedToSocket: boolean;
  isLoading: boolean;
  error: string | null;
  refetchStats: () => Promise<void>;
}

export function useExamMonitor(examId: string | undefined): ExamMonitorData {
  const [exam, setExam] = useState<Exam | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [events, setEvents] = useState<RoomEvent[]>([]);
  const [submittedCount, setSubmittedCount] = useState<number>(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [isConnectedToSocket, setIsConnectedToSocket] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const fetchInitialData = useCallback(async () => {
    if (!examId) return;
    try {
      setError(null);
      const [examRes, statsRes, logsRes] = await Promise.all([
        api.get(`/exams/${examId}`),
        api.get(`/exams/${examId}/stats`).catch(() => ({ data: { totalSubmitted: 0 } })),
        api.get(`/exams/${examId}/room-logs?per=50`).catch(() => ({ data: { events: [] } })),
      ]);

      setExam(examRes.data.exam);
      setSubmittedCount(statsRes.data.totalSubmitted ?? 0);
      if (Array.isArray(logsRes.data.events) && logsRes.data.events.length > 0) {
        setEvents(logsRes.data.events);
      }
    } catch (err: any) {
      console.error('[useExamMonitor] fetch error:', err);
      setError(err?.response?.data?.error || err.message || 'Failed to load exam data');
    } finally {
      setIsLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (!examId) return;

    const socketUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
      : window.location.origin;

    const socket: Socket = io(socketUrl, {
      path: '/api/socket.io',
      withCredentials: true,
      transports: ['websocket', 'polling'],
      auth: { watchExamId: examId },
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnectedToSocket(true);
    });

    socket.on('disconnect', () => {
      setIsConnectedToSocket(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('[useExamMonitor] socket connect_error:', err.message);
      setIsConnectedToSocket(false);
    });

    socket.on('exam:room:state', (state: { currentCount: number; participants: Participant[] }) => {
      if (Array.isArray(state?.participants)) {
        setParticipants(state.participants);
      }
    });

    socket.on('exam:room:event', (newEvent: RoomEvent) => {
      setEvents((prev) => [newEvent, ...prev.slice(0, 99)]);
      if (newEvent.message?.includes('submitted') || newEvent.type === 'reconnected' && newEvent.message?.includes('answers')) {
        setSubmittedCount((c) => c + 1);
      }
    });

    socket.on('exam:room:logs', (logs: RoomEvent[]) => {
      if (Array.isArray(logs)) {
        setEvents(logs);
      }
    });

    socket.on('exam:timer:sync', (payload: { remaining: number }) => {
      if (typeof payload?.remaining === 'number') {
        setRemainingSeconds(payload.remaining);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [examId]);

  const activeCount = participants.filter((p) => p.isConnected).length;

  return {
    exam,
    participants,
    events,
    activeCount,
    submittedCount,
    remainingSeconds,
    isConnectedToSocket,
    isLoading,
    error,
    refetchStats: fetchInitialData,
  };
}
