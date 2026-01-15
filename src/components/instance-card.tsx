import { Link, useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { DotsThreeVerticalIcon, TrashIcon } from "@phosphor-icons/react";
import { deleteInstance, type Instance } from "@/lib/api";
import { useState } from "react";

interface InstanceCardProps {
  instance: Instance;
  onDelete?: () => void;
}

/**
 * Get heartbeat status based on lastSeen timestamp
 * - Green: < 1 minute ago
 * - Yellow: 1-5 minutes ago
 * - Red: > 5 minutes ago (unreachable)
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
      <span className="text-xs text-muted-foreground">{status.label}</span>
    </div>
  );
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "online":
      return "default";
    case "offline":
      return "secondary";
    case "error":
      return "destructive";
    default:
      return "outline";
  }
}

export function InstanceCard({ instance, onDelete }: InstanceCardProps) {
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isDeleting) return;
    
    try {
      setIsDeleting(true);
      await deleteInstance(instance.id);
      setDeleteDialogOpen(false);
      toast.success(`Instance "${instance.name}" deleted successfully`);
      if (onDelete) {
        onDelete();
      }
    } catch (error) {
      console.error("Failed to delete instance:", error);
      toast.error("Failed to delete instance. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-sm">{instance.name}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">ID: {instance.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusVariant(instance.status)}>{instance.status}</Badge>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="sm" className="h-7 w-7 p-0" />}
              >
                <DotsThreeVerticalIcon className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    navigate({ to: "/instances/$id", params: { id: instance.id } });
                  }}
                >
                  View Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
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
          </div>
        </div>
      </CardHeader>
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
      <CardContent>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Last heartbeat:</span>
            <HeartbeatIndicator lastSeen={instance.lastSeen} />
          </div>
          {instance.enrolledAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Enrolled:</span>
              <span>{new Date(instance.enrolledAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>
        <div className="mt-4">
          <Link to="/instances/$id" params={{ id: instance.id }}>
            <Button variant="outline" size="sm" className="w-full">
              View Details
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
