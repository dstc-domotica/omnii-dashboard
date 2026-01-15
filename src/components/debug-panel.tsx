import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DebugPanelProps {
  title?: string;
  data: any;
  className?: string;
}

export function DebugPanel({ title = "Debug Info", data, className }: DebugPanelProps) {
  return (
    <Collapsible className={className}>
      <CollapsibleTrigger>
        <div className="flex items-center justify-between w-full">
          <span>{title}</span>
          <span className="text-muted-foreground text-xs">Click to expand</span>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card className="mt-2">
          <CardHeader>
            <CardTitle className="text-xs">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs overflow-auto bg-muted p-2 rounded border">
              {JSON.stringify(data, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}

