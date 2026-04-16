import { useEffect, useRef } from 'react';

export const usePolling = (callback: () => void, intervalMs: number, active: boolean): void => {
  const savedCallback = useRef<() => void>(() => undefined);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!active) {
      return;
    }

    const tick = (): void => {
      savedCallback.current();
    };

    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, active]);
};
