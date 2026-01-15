import { createFileRoute } from "@tanstack/react-router";
import { useInstances } from "@/hooks/useInstances";
import { InstanceCard } from "@/components/instance-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const { instances, loading, error, refetch } = useInstances();

  const stats = {
    total: instances.length,
    online: instances.filter((i) => i.status === "online").length,
    offline: instances.filter((i) => i.status === "offline").length,
    error: instances.filter((i) => i.status === "error").length,
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">Loading instances...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-destructive">Error: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-medium mb-2">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Monitor all Home Assistant instances</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-xs">Total Instances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-medium">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xs">Online</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-medium text-primary">{stats.online}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xs">Offline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-medium">{stats.offline}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xs">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-medium text-destructive">{stats.error}</div>
          </CardContent>
        </Card>
      </div>

      {/* Instances Grid */}
      {instances.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No instances enrolled yet
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {instances.map((instance) => (
            <InstanceCard key={instance.id} instance={instance} onDelete={refetch} />
          ))}
        </div>
      )}

    </div>
  );
}
