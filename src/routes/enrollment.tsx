import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { api, type EnrollmentCode } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/lib/toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/enrollment")({
  component: EnrollmentPage,
});

function EnrollmentPage() {
  const [creating, setCreating] = useState(false);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "used" | "expired" | "deactivated">("all");
  const [deactivating, setDeactivating] = useState<string | null>(null);
  const codesQuery = api.useQuery(
    "get",
    "/enrollment-codes",
    { params: { query: { all: "true" } } }
  );
  const configQuery = api.useQuery("get", "/config");
  const createMutation = api.useMutation("post", "/enrollment-codes");
  const deactivateMutation = api.useMutation("post", "/enrollment-codes/{id}/deactivate");

  const codes = (codesQuery.data ?? []) as EnrollmentCode[];
  const loading = codesQuery.isLoading;
  const error = codesQuery.error as Error | null;
  const grpcAddress = configQuery.data?.grpcAddress ?? "localhost:50051";

  async function handleCreateCode() {
    try {
      setCreating(true);
      const code = await createMutation.mutateAsync();
      setNewCode(code?.code ?? null);
      await codesQuery.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create enrollment code");
    } finally {
      setCreating(false);
    }
  }

  function formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  function isExpired(code: EnrollmentCode): boolean {
    return Date.now() > code.expiresAt;
  }

  function isUsed(code: EnrollmentCode): boolean {
    return code.usedAt !== null;
  }

  function isDeactivated(code: EnrollmentCode): boolean {
    return code.deactivatedAt !== null;
  }

  async function copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
  }

  async function handleCopy(field: string, value: string) {
    await copyToClipboard(value);
    toast.success(`${field} copied to clipboard`);
  }

  const filteredCodes = codes.filter((code) => {
    if (filter === "active") return !isUsed(code) && !isExpired(code) && !isDeactivated(code);
    if (filter === "used") return isUsed(code);
    if (filter === "expired") return isExpired(code) && !isUsed(code) && !isDeactivated(code);
    if (filter === "deactivated") return isDeactivated(code);
    return true;
  });

  const activeCount = codes.filter((c) => !isUsed(c) && !isExpired(c) && !isDeactivated(c)).length;
  const usedCount = codes.filter((c) => isUsed(c)).length;
  const expiredCount = codes.filter((c) => isExpired(c) && !isUsed(c) && !isDeactivated(c)).length;
  const deactivatedCount = codes.filter((c) => isDeactivated(c)).length;

  async function handleDeactivate(codeId: string) {
    try {
      setDeactivating(codeId);
      await deactivateMutation.mutateAsync({
        params: { path: { id: codeId } },
      });
      toast.success("Enrollment code deactivated");
      await codesQuery.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to deactivate enrollment code");
    } finally {
      setDeactivating(null);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">Loading enrollment codes...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-medium mb-2">Enrollment Codes</h1>
        <p className="text-sm text-muted-foreground">Generate and manage enrollment codes for Home Assistant instances</p>
      </div>

      {error && (
        <Card>
          <CardContent className="py-4 text-destructive">
            {error instanceof Error ? error.message : "Failed to fetch enrollment codes"}
          </CardContent>
        </Card>
      )}

      {/* Create New Code */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Generate New Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enrollment codes are valid for 1 hour after creation.
          </p>
          <Button onClick={handleCreateCode} disabled={creating}>
            {creating ? "Creating..." : "Generate Code"}
          </Button>
          {newCode && (
            <>
              <div className="p-4 bg-muted rounded border">
                <p className="text-sm font-medium mb-2">New Enrollment Code:</p>
                <p className="text-2xl font-mono font-bold">{newCode}</p>
                <p className="text-xs text-muted-foreground mt-2">Valid for 1 hour. Share this code with the Home Assistant instance to enroll.</p>
              </div>

              {/* Configuration Instructions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Add-on Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Copy these values into your Home Assistant add-on configuration:
                  </p>
                  
                  {/* Server URL Field (gRPC endpoint) */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">server_url</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={grpcAddress}
                        className="font-mono text-sm"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy("server_url", grpcAddress)}
                      >
                        Copy
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      gRPC server address (all communication happens over gRPC)
                    </p>
                  </div>

                  {/* Enrollment Code Field */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">enrollment_code</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={newCode}
                        className="font-mono text-sm font-bold"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy("enrollment_code", newCode)}
                      >
                        Copy
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      The 6-digit enrollment code (valid for 1 hour)
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </CardContent>
      </Card>

      {/* Codes List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Enrollment Codes</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
                className="text-xs"
              >
                All ({codes.length})
              </Button>
              <Button
                variant={filter === "active" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("active")}
                className="text-xs"
              >
                Active ({activeCount})
              </Button>
              <Button
                variant={filter === "used" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("used")}
                className="text-xs"
              >
                Used ({usedCount})
              </Button>
              <Button
                variant={filter === "expired" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("expired")}
                className="text-xs"
              >
                Expired ({expiredCount})
              </Button>
              <Button
                variant={filter === "deactivated" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("deactivated")}
                className="text-xs"
              >
                Deactivated ({deactivatedCount})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCodes.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {codes.length === 0
                ? "No enrollment codes"
                : `No ${filter} enrollment codes`}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCodes.map((code) => (
                <div key={code.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-mono font-bold">{code.code}</span>
                        {isUsed(code) && <Badge variant="secondary">Used</Badge>}
                        {isDeactivated(code) && <Badge variant="destructive">Deactivated</Badge>}
                        {isExpired(code) && !isUsed(code) && !isDeactivated(code) && <Badge variant="destructive">Expired</Badge>}
                        {!isExpired(code) && !isUsed(code) && !isDeactivated(code) && <Badge variant="default">Active</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Created: {formatTimestamp(code.createdAt)} | Expires: {formatTimestamp(code.expiresAt)}
                      </div>
                      {code.usedAt && (
                        <div className="text-xs text-muted-foreground">
                          Used: {formatTimestamp(code.usedAt)}
                        </div>
                      )}
                      {code.deactivatedAt && (
                        <div className="text-xs text-muted-foreground">
                          Deactivated: {formatTimestamp(code.deactivatedAt)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!isUsed(code) && !isDeactivated(code) && !isExpired(code) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={deactivating === code.id}
                            >
                              {deactivating === code.id ? "Deactivating..." : "Deactivate"}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Deactivate Enrollment Code</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to deactivate code <strong>{code.code}</strong>? 
                                This will make it unavailable for enrollment immediately.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeactivate(code.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Deactivate
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy("Code", code.code)}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                  <Separator />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
