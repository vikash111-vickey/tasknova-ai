import { useEffect, useRef, useState, useCallback } from 'react';
import { ExecutionEvent, Task, TaskStep, GeneratedFile, api } from './api';

export interface TaskSSEState {
  task: Task | null;
  steps: TaskStep[];
  events: ExecutionEvent[];
  files: GeneratedFile[];
  isRunning: boolean;
  connected: boolean;
  error: string | null;
}

export function useTaskSSE(taskId: string | null) {
  const [state, setState] = useState<TaskSSEState>({
    task: null,
    steps: [],
    events: [],
    files: [],
    isRunning: false,
    connected: false,
    error: null,
  });

  const eventSourceRef = useRef<EventSource | null>(null);

  // Full fetch of current execution state
  const refreshExecution = useCallback(async () => {
    if (!taskId) return;
    try {
      const res = await api.getExecution(taskId);
      if (res.success && res.data) {
        setState((prev) => ({
          ...prev,
          task: res.data.task,
          steps: res.data.steps || [],
          events: res.data.events || [],
          files: res.data.files || [],
          isRunning: Boolean(res.data.isRunning),
          error: null,
        }));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch execution state';
      setState((prev) => ({ ...prev, error: msg }));
    }
  }, [taskId]);

  useEffect(() => {
    if (!taskId) {
      setState({
        task: null,
        steps: [],
        events: [],
        files: [],
        isRunning: false,
        connected: false,
        error: null,
      });
      return;
    }

    refreshExecution();

    const token = api.getToken();
    const url = `/api/executions/${taskId}/stream?token=${encodeURIComponent(token || '')}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      setState((prev) => ({ ...prev, connected: true, error: null }));
    };

    es.onerror = () => {
      // EventSource reconnects automatically
      setState((prev) => ({ ...prev, connected: false }));
    };

    // Generic execution event listener
    es.addEventListener('execution_event', (e: MessageEvent) => {
      try {
        const eventData: ExecutionEvent = JSON.parse(e.data);
        setState((prev) => {
          // Avoid duplicate event ids
          const exists = prev.events.some((ev) => ev.id === eventData.id);
          const nextEvents = exists ? prev.events : [...prev.events, eventData];

          // Check if payload has task status updates
          let updatedTask = prev.task;
          if (eventData.type === 'status_change' && eventData.payload?.status) {
            updatedTask = prev.task
              ? { ...prev.task, status: eventData.payload.status as any }
              : prev.task;
          }

          return {
            ...prev,
            events: nextEvents,
            task: updatedTask,
          };
        });

        // Whenever an event fires, refresh steps & files to keep state 100% in sync
        refreshExecution();
      } catch {
        // Ignore parse error
      }
    });

    // Step status change listener
    es.addEventListener('step_status', () => {
      refreshExecution();
    });

    // Task status change listener
    es.addEventListener('task_status', () => {
      refreshExecution();
    });

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [taskId, refreshExecution]);

  return {
    ...state,
    refresh: refreshExecution,
  };
}
