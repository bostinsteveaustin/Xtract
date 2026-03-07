"use client";

import { useRouter } from "next/navigation";
import { useSidebar } from "@/hooks/use-sidebar";
import { useWorkflows } from "@/hooks/use-workflows";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { PanelLeftClose, PanelLeftOpen, User } from "lucide-react";
import { SidebarWorkflowItem } from "./sidebar-workflow-item";
import { CreateWorkflowDialog } from "./create-workflow-dialog";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  user: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export function AppSidebar({ user }: AppSidebarProps) {
  const { isCollapsed, toggle } = useSidebar();
  const { workflows, isLoading } = useWorkflows();
  const router = useRouter();

  const initials = (user.displayName ?? user.email)
    .split(/[\s@]/)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join("");

  return (
    <aside
      className={cn(
        "h-screen flex flex-col border-r bg-muted/30 transition-all duration-300 flex-shrink-0",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header: logo + collapse toggle */}
      <div className="h-16 flex items-center justify-between px-3 border-b flex-shrink-0">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              X
            </div>
            <span className="font-semibold text-sm">Xtract</span>
          </div>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={toggle}
              className={cn(
                "p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground",
                isCollapsed && "mx-auto"
              )}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* New Pipeline button */}
      <div className="px-2 py-2 flex-shrink-0">
        <CreateWorkflowDialog />
      </div>

      {/* Pipeline list */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1 py-1">
          {isLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className={cn("h-9 rounded-md", isCollapsed ? "w-10 mx-auto" : "w-full")} />
              ))}
            </>
          ) : workflows.length === 0 ? (
            !isCollapsed && (
              <p className="text-xs text-muted-foreground text-center py-4">
                No pipelines yet
              </p>
            )
          ) : (
            workflows.map((w) => (
              <SidebarWorkflowItem
                key={w.id}
                id={w.id}
                name={w.name}
                status={w.status}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Bottom: profile */}
      <Separator />
      <div className="p-2 flex-shrink-0">
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => router.push("/profile")}
                className="w-10 h-10 mx-auto flex items-center justify-center"
              >
                <Avatar className="h-8 w-8">
                  {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Profile</TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={() => router.push("/profile")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm"
          >
            <Avatar className="h-8 w-8">
              {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left min-w-0">
              <div className="truncate font-medium text-sm">
                {user.displayName ?? "Profile"}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {user.email}
              </div>
            </div>
            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </button>
        )}
      </div>
    </aside>
  );
}
