import { useState, useEffect, useCallback } from "react";
import { getInstances, type Instance } from "@/lib/api";

export function useInstances() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchInstances = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getInstances();
      setInstances(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch instances"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstances();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchInstances, 30000);
    return () => clearInterval(interval);
  }, [fetchInstances]);

  return { instances, loading, error, refetch: fetchInstances };
}
