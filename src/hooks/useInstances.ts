import { api, type Instance } from "@/lib/api";

export function useInstances() {
  const query = api.useQuery(
    "get",
    "/instances",
    undefined,
    { refetchInterval: 30000 }
  );

  return {
    instances: (query.data ?? []) as Instance[],
    loading: query.isLoading,
    error: (query.error ?? null) as Error | null,
    refetch: query.refetch,
  };
}
