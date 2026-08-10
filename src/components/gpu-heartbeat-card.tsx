"use client";

import * as React from "react";
import { Activity, Heart, PauseCircle, PlayCircle, Server, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function GpuHeartbeatCard() {
  const [isActive, setIsActive] = React.useState<boolean>(true);
  const [pingStatus, setPingStatus] = React.useState<"idle" | "alive" | "error" | "unreachable">("idle");
  const [pingCount, setPingCount] = React.useState<number>(0);
  const [lastPingTime, setLastPingTime] = React.useState<string | null>(null);
  const [gpuInfo, setGpuInfo] = React.useState<string | null>(null);

  const sendHeartbeatPing = React.useCallback(async () => {
    try {
      const res = await fetch("/api/agent/heartbeat");
      const data = await res.json();
      setLastPingTime(new Date().toLocaleTimeString());
      setPingCount((c) => c + 1);

      if (data.status === "alive") {
        setPingStatus("alive");
        if (data.gpuData?.gpu_memory_used_mb) {
          setGpuInfo(`${data.gpuData.gpu_memory_used_mb.toFixed(1)} MB VRAM used`);
        }
      } else {
        setPingStatus("unreachable");
      }
    } catch {
      setPingStatus("error");
    }
  }, []);

  React.useEffect(() => {
    if (!isActive) return;
    // Initial ping on start
    sendHeartbeatPing();

    // Ping every 25 seconds to keep Colab runtime active
    const interval = setInterval(sendHeartbeatPing, 25000);
    return () => clearInterval(interval);
  }, [isActive, sendHeartbeatPing]);

  return (
    <Card className="border border-slate-200 dark:border-border/60 bg-white dark:bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className={`h-4 w-4 ${isActive ? "text-rose-500 animate-pulse" : "text-slate-400"}`} />
            <CardTitle className="text-base font-semibold">Google Colab GPU Heartbeat</CardTitle>
          </div>
          <Badge variant={isActive ? "signal" : "secondary"}>
            {isActive ? "Heartbeat Active" : "Heartbeat Stopped"}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Keeps your Google Colab / Lightning AI GPU server runtime active and prevents idle timeouts without affecting subagent execution.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-0 text-xs">
        <div className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-border/40 bg-slate-50/50 dark:bg-card/40 p-2.5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Server className="h-3.5 w-3.5" />
            <span>Pings Sent: <strong className="text-foreground">{pingCount}</strong></span>
          </div>
          {lastPingTime && (
            <span className="text-[11px] text-muted-foreground">
              Last Ping: <strong className="text-foreground">{lastPingTime}</strong>
            </span>
          )}
        </div>

        {gpuInfo && (
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">
            <Zap className="h-3 w-3" />
            <span>GPU Memory: {gpuInfo}</span>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          {isActive ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsActive(false)}
              className="w-full text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900"
            >
              <PauseCircle className="h-3.5 w-3.5 mr-1.5" />
              Stop Heartbeat
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setIsActive(true);
                sendHeartbeatPing();
              }}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white"
            >
              <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
              Start Heartbeat
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={sendHeartbeatPing}
            title="Trigger Manual Ping"
            className="text-muted-foreground"
          >
            <Activity className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
