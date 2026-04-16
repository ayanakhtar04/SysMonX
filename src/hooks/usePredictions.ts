import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../services/api';
import { usePolling } from './usePolling';
import type { PredictionApiResponse, PredictionSnapshot } from '../types/predictions';

interface UsePredictionsResult {
  predictionSnapshot: PredictionSnapshot | null;
  isLoading: boolean;
  isError: boolean;
  isWarmingUp: boolean;
  message: string | null;
}

export const usePredictions = (active: boolean): UsePredictionsResult => {
  const [predictionSnapshot, setPredictionSnapshot] = useState<PredictionSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [isWarmingUp, setIsWarmingUp] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchPredictions = useCallback(async () => {
    if (!active) return;

    setIsLoading(true);
    try {
      const response = await apiClient.get<PredictionApiResponse>('/api/predictions');
      const payload = response.data;

      if (!payload.data) {
        setPredictionSnapshot(null);
        setIsWarmingUp(true);
        setMessage(payload.message ?? 'Prediction engine is warming up.');
        setIsError(false);
        return;
      }

      setPredictionSnapshot(payload.data);
      setIsWarmingUp(false);
      setMessage(null);
      setIsError(false);
    } catch {
      setIsError(true);
      setMessage('Unable to fetch AI predictions.');
    } finally {
      setIsLoading(false);
    }
  }, [active]);

  useEffect(() => {
    if (!active) {
      setPredictionSnapshot(null);
      setIsLoading(false);
      setIsError(false);
      setIsWarmingUp(false);
      setMessage(null);
      return;
    }

    void fetchPredictions();
  }, [active, fetchPredictions]);

  usePolling(() => {
    void fetchPredictions();
  }, 5000, active);

  return useMemo(
    () => ({ predictionSnapshot, isLoading, isError, isWarmingUp, message }),
    [predictionSnapshot, isLoading, isError, isWarmingUp, message],
  );
};
