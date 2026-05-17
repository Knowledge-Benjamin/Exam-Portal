import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

export type SubmissionStatus = 'idle' | 'active' | 'left' | 'submitted';

export interface SubmissionStatusMap {
  [submissionId: string]: SubmissionStatus;
}

export function useSubmissionStatus(
  examId: string | undefined,
): SubmissionStatusMap {
  const [statusMap, setStatusMap] = useState<SubmissionStatusMap>({});

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
    });

    socket.on('exam:room:event', (event) => {
      setStatusMap((prev) => ({
        ...prev,
        [event.submissionId]: event.type === 'joined' ? 'active' : 'left',
      }));
    });

    socket.on('exam:room:state', (state) => {
      const newMap: SubmissionStatusMap = {};
      state.participants.forEach((p: any) => {
        newMap[p.submissionId] = p.isConnected ? 'active' : 'left';
      });
      setStatusMap(newMap);
    });

    return () => {
      socket.disconnect();
    };
  }, [examId]);

  return statusMap;
}
