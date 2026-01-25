import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import {
  api,
  type Instance,
  type SystemInfo,
  type AvailableUpdate,
  type Heartbeat,
	type ConnectivityCheck,
  type TriggerUpdateBody,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DotsThreeVerticalIcon, TrashIcon, ArrowClockwiseIcon } from "@phosphor-icons/react";
import { toast } from "@/lib/toast";
import { AvailabilityTimeline, LatencyChart } from "@/components/heartbeat-charts";
import { ConnectivityLatencyChart, ConnectivitySummary } from "@/components/connectivity-charts";

export const Route = createFileRoute("/instances/$id")({
  component: InstanceDetail,
});

/**
 * Get heartbeat status based on lastSeen timestamp
 */
function getHeartbeatStatus(lastSeen: number | null): {
  color: "green" | "yellow" | "red" | "gray";
  label: string;
  description: string;
} {
  if (!lastSeen) {
    return { color: "gray", label: "Never", description: "No heartbeat received" };
  }

  const now = Date.now();
  const diffMs = now - lastSeen;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);

  let label: string;
  if (diffSeconds < 60) {
    label = diffSeconds <= 1 ? "Just now" : `${diffSeconds}s ago`;
  } else if (diffMinutes < 60) {
    label = `${diffMinutes}m ago`;
  } else {
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      label = `${diffHours}h ago`;
    } else {
      label = new Date(lastSeen).toLocaleDateString();
    }
  }

  if (diffMinutes < 1) {
    return { color: "green", label, description: "Recently active" };
  } else if (diffMinutes < 5) {
    return { color: "yellow", label, description: "Slightly stale" };
  } else {
    return { color: "red", label, description: "Unreachable" };
  }
}

function HeartbeatIndicator({ lastSeen }: { lastSeen: number | null }) {
  const status = getHeartbeatStatus(lastSeen);

  const colorClasses = {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
    gray: "bg-gray-400",
  };

  return (
    <div className="flex items-center gap-2" title={status.description}>
      <span
        className={`inline-block w-2 h-2 rounded-full ${colorClasses[status.color]}`}
      />
      <span>{status.label}</span>
    </div>
  );
}

function getUpdateTypeBadgeVariant(updateType: string): "default" | "secondary" | "destructive" | "outline" {
  switch (updateType) {
    case "core":
      return "default";
    case "os":
      return "destructive";
    case "supervisor":
      return "secondary";
    case "addon":
      return "outline";
    default:
      return "outline";
  }
}

function InstanceDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [triggeringUpdate, setTriggeringUpdate] = useState<string | null>(null);

  const instanceQuery = api.useQuery(
    "get",
    "/v1/instances/{id}",
    { params: { path: { id } } },
    { refetchInterval: 30000 }
  );
  const systemInfoQuery = api.useQuery(
    "get",
    "/v1/instances/{id}/system-info",
    { params: { path: { id } } },
    { refetchInterval: 30000 }
  );
  const updatesQuery = api.useQuery(
    "get",
    "/v1/instances/{id}/updates",
    { params: { path: { id } } },
    { refetchInterval: 30000 }
  );
  const heartbeatsQuery = api.useQuery(
    "get",
    "/v1/instances/{id}/heartbeats",
    { params: { path: { id }, query: { minutes: 1440 } } },
    { refetchInterval: 30000 }
  );
  const connectivityQuery = api.useQuery(
    "get",
    "/v1/instances/{id}/connectivity",
    { params: { path: { id }, query: { minutes: 1440 } } },
    { refetchInterval: 30000 }
  );

  const triggerUpdateMutation = api.useMutation(
    "post",
    "/v1/instances/{id}/trigger-update"
  );
  const deleteMutation = api.useMutation("delete", "/v1/instances/{id}");

  const instance = (instanceQuery.data ?? null) as Instance | null;
  const systemInfo: SystemInfo | null =
    (systemInfoQuery.data as SystemInfo | null) ?? null;
  const updates = (updatesQuery.data ?? []) as AvailableUpdate[];
  const heartbeats = (heartbeatsQuery.data ?? []) as Heartbeat[];
  const connectivityChecks = (connectivityQuery.data ?? []) as ConnectivityCheck[];
  const loading =
    instanceQuery.isLoading ||
    systemInfoQuery.isLoading ||
    updatesQuery.isLoading ||
    heartbeatsQuery.isLoading ||
    connectivityQuery.isLoading;
  const error = (instanceQuery.error ||
    systemInfoQuery.error ||
    updatesQuery.error ||
    heartbeatsQuery.error ||
    connectivityQuery.error ||
    null) as Error | null;

  const refetchAll = useCallback(() => {
    void instanceQuery.refetch();
    void systemInfoQuery.refetch();
    void updatesQuery.refetch();
    void heartbeatsQuery.refetch();
    void connectivityQuery.refetch();
  }, [
    instanceQuery.refetch,
    systemInfoQuery.refetch,
    updatesQuery.refetch,
    heartbeatsQuery.refetch,
    connectivityQuery.refetch,
  ]);

  const handleTriggerUpdate = async (update: AvailableUpdate) => {
    const updateKey = `${update.updateType}-${update.slug || update.name || ""}`;
    try {
      setTriggeringUpdate(updateKey);
      const updateType = update.updateType as TriggerUpdateBody["updateType"];
      const result = await triggerUpdateMutation.mutateAsync({
        params: { path: { id } },
        body: {
          updateType,
          addonSlug: updateType === "addon" ? update.slug || undefined : undefined,
        },
      });
      toast.success(result?.message || `Update triggered for ${update.updateType}`);
      // Refresh data after triggering update
      setTimeout(refetchAll, 2000);
    } catch (err) {
      console.error("Failed to trigger update:", err);
      toast.error("Failed to trigger update. Please try again.");
    } finally {
      setTriggeringUpdate(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isDeleting) return;
    
    try {
      setIsDeleting(true);
      await deleteMutation.mutateAsync({ params: { path: { id } } });
      setDeleteDialogOpen(false);
      toast.success(`Instance "${instance?.name}" deleted successfully`);
      navigate({ to: "/" });
    } catch (err) {
      console.error("Failed to delete instance:", err);
      toast.error("Failed to delete instance. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">Loading instance details...</div>
      </div>
    );
  }

  if (error || !instance) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-destructive">
          Error: {error?.message || "Instance not found"}
        </div>
      </div>
    );
  }

  function formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-medium mb-2">{instance.name}</h1>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="outline" size="sm" />}
          >
            <DotsThreeVerticalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                setDeleteDialogOpen(true);
              }}
            >
              <TrashIcon className="size-4 mr-2" />
              Delete Instance
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Instance</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{instance.name}</strong>? This action cannot be undone and will delete all associated data including metrics and heartbeats.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Instance Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Instance Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status:</span>
            <Badge variant={instance.status === "online" ? "default" : instance.status === "error" ? "destructive" : "secondary"}>
              {instance.status}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Last Heartbeat:</span>
            <HeartbeatIndicator lastSeen={instance.lastSeen} />
          </div>
          {instance.enrolledAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Enrolled:</span>
              <span>{formatTimestamp(instance.enrolledAt)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created:</span>
            <span>{formatTimestamp(instance.createdAt)}</span>
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      {systemInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">System Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {systemInfo.homeassistant && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Home Assistant:</span>
                <span>{systemInfo.homeassistant}</span>
              </div>
            )}
            {systemInfo.supervisor && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Supervisor:</span>
                <span>{systemInfo.supervisor}</span>
              </div>
            )}
            {systemInfo.hassos && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">OS:</span>
                <span>{systemInfo.hassos}</span>
              </div>
            )}
            {systemInfo.hostname && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hostname:</span>
                <span>{systemInfo.hostname}</span>
              </div>
            )}
            {systemInfo.operatingSystem && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Operating System:</span>
                <span>{systemInfo.operatingSystem}</span>
              </div>
            )}
            {systemInfo.machine && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Machine:</span>
                <span>{systemInfo.machine}</span>
              </div>
            )}
            {systemInfo.arch && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Architecture:</span>
                <span>{systemInfo.arch}</span>
              </div>
            )}
            {systemInfo.channel && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Channel:</span>
                <Badge variant="outline">{systemInfo.channel}</Badge>
              </div>
            )}
            {systemInfo.state && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">State:</span>
                <Badge variant={systemInfo.state === "running" ? "default" : "secondary"}>
                  {systemInfo.state}
                </Badge>
              </div>
            )}
            {systemInfo.docker && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Docker:</span>
                <span>{systemInfo.docker}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-muted-foreground pt-2">
              <span>Last updated:</span>
              <span>{formatTimestamp(systemInfo.updatedAt)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Updates */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Available Updates</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={refetchAll}
              className="h-7 w-7 p-0"
              title="Refresh"
            >
              <ArrowClockwiseIcon className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {updates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No updates available</p>
          ) : (
            <div className="space-y-3">
              {updates.map((update) => {
                const updateKey = `${update.updateType}-${update.slug || update.name || ""}`;
                const isTriggering = triggeringUpdate === updateKey;
                
                return (
                  <div key={update.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant={getUpdateTypeBadgeVariant(update.updateType)}>
                        {update.updateType}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium">
                          {update.name || update.updateType.charAt(0).toUpperCase() + update.updateType.slice(1)}
                        </p>
                        {update.versionLatest && (
                          <p className="text-xs text-muted-foreground">
                            Version: {update.versionLatest}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTriggerUpdate(update)}
                      disabled={isTriggering || instance.status !== "online"}
                    >
                      {isTriggering ? "Updating..." : "Update"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Availability Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Availability (Last 24h)</CardTitle>
        </CardHeader>
        <CardContent>
          <AvailabilityTimeline heartbeats={heartbeats} />
        </CardContent>
      </Card>

      {/* Latency Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Latency</CardTitle>
        </CardHeader>
        <CardContent>
          <LatencyChart heartbeats={heartbeats} />
        </CardContent>
      </Card>

      {/* Connectivity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Connectivity (Last 24h)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <ConnectivitySummary checks={connectivityChecks} />
          <div className="grid gap-6 lg:grid-cols-2">
            <ConnectivityLatencyChart
              checks={connectivityChecks}
              target="8.8.8.8"
              label="Google DNS (8.8.8.8)"
            />
            <ConnectivityLatencyChart
              checks={connectivityChecks}
              target="1.1.1.1"
              label="Cloudflare (1.1.1.1)"
            />
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
