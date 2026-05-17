import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

type RoomConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'failed';

export interface RoomParticipant {
  submissionId: string;
  studentName: string;
  studentRegNumber: string;
  firstJoinedAt: string;
  lastSeenAt: string;
  isConnected: boolean;
  connections: number;
}

export interface RoomEvent {
  type: 'joined' | 'left' | 'reconnected';
  submissionId: string;
  studentName: string;
  studentRegNumber: string;
  timestamp: string;
  message: string;
}

export interface ExamRoomMonitorResult {
  connectionStatus: RoomConnectionStatus;
  roomState: {
    currentCount: number;
    participants: RoomParticipant[];
  };
  logs: RoomEvent[];
  remainingSeconds: number | null;
  error?: string;
}

export function useExamRoomMonitor(examId: string | undefined): ExamRoomMonitorResult {
  const [connectionStatus, setConnectionStatus] = useState<RoomConnectionStatus>('connecting');
  const [roomState, setRoomState] = useState<ExamRoomMonitorResult['roomState']>({
    currentCount: 0,
    participants: [],
  });
  const [logs, setLogs] = useState<RoomEvent[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!examId) {
      setConnectionStatus('failed');
      setError('Exam ID required for live room monitoring.');
      return;
    }

    setConnectionStatus('connecting');
    setError(undefined);

    const socketUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
      : window.location.origin;

    const socket: Socket = io(socketUrl, {
      path: '/api/socket.io',
      withCredentials: true,
      transports: ['websocket', 'polling'],
      auth: { watchExamId: examId },
    });

    socket.on('connect', () => {
      setConnectionStatus('connected');
      setError(undefined);
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (err) => {
      setConnectionStatus('failed');
      setError(err instanceof Error ? err.message : String(err));
    });

    socket.on('exam:room:state', (state: ExamRoomMonitorResult['roomState']) => {
      setRoomState(state);
    });

    socket.on('exam:room:logs', (events: RoomEvent[]) => {
      setLogs(events);
    });

    socket.on('exam:room:event', (event: RoomEvent) => {
      setLogs((prev) => [event, ...prev].slice(0, 100));
    });

    socket.on('exam:timer:sync', (payload: { remaining: number }) => {
      setRemainingSeconds(payload.remaining);
    });

    socket.on('exam:force-submit', () => {
      // Teacher clients can ignore this if they want; timer will show closure.
      setRemainingSeconds(0);
    });

    return () => {
      socket.disconnect();
    };
  }, [examId]);

  return { connectionStatus, roomState, logs, remainingSeconds, error };
}
