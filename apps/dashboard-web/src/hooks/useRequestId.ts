import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

let lastRequestId: string | null = null;

// Listen for request ID updates from window
if (typeof window !== 'undefined') {
  const updateRequestId = () => {
    const id = (window as any).__lastRequestId;
    if (id) {
      lastRequestId = id;
    }
  };

  // Check periodically (simple approach)
  setInterval(updateRequestId, 100);
}

export const useRequestId = () => {
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(lastRequestId);

  useEffect(() => {
    const checkRequestId = () => {
      const id = typeof window !== 'undefined' ? (window as any).__lastRequestId : null;
      if (id && id !== currentRequestId) {
        lastRequestId = id;
        setCurrentRequestId(id);
      }
    };

    const interval = setInterval(checkRequestId, 100);
    return () => clearInterval(interval);
  }, [currentRequestId]);

  const generateRequestId = useCallback((): string => {
    const id = uuidv4();
    lastRequestId = id;
    if (typeof window !== 'undefined') {
      (window as any).__lastRequestId = id;
    }
    setCurrentRequestId(id);
    return id;
  }, []);

  return {
    generateRequestId,
    lastRequestId: currentRequestId,
  };
};

// Global function to get last request ID (for error handling)
export const getLastRequestId = (): string | undefined => {
  if (typeof window !== 'undefined' && (window as any).__lastRequestId) {
    return (window as any).__lastRequestId;
  }
  return lastRequestId ?? undefined;
};

