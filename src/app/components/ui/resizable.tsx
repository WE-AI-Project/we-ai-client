"use client";

import * as React from "react";
import { GripVerticalIcon } from "lucide-react";
import * as ResizablePrimitive from "react-resizable-panels";

import { cn } from "./utils";

/**
 * 1. 기초가 되는 Skeleton 조각
 * SynAIpse 프로젝트의 통일된 로딩 애니메이션을 제공합니다.
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("bg-muted animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

/**
 * 2. ResizableSkeleton 컴포넌트
 * 메인 대시보드 구조(좌측 메뉴 바 패널 + 우측 메인 콘텐츠 판)가 로딩 중일 때
 * 전체 화면 비율이 깨지지 않도록 공간을 완벽하게 홀딩해 주는 레이아웃 뼈대입니다.
 */
function ResizableSkeleton({ className }: { className?: string }) {
  return (
    <div 
      className={cn("flex h-screen w-full gap-1 p-2 bg-background", className)}
      role="status"
      aria-label="Loading page layout"
    >
      {/* 왼쪽 사이드바 영역 뼈대 */}
      <Skeleton className="h-full w-64 shrink-0 rounded-xl" />
      
      {/* 패널 경계선 조절 바 시각화 */}
      <div className="bg-border/60 w-px h-full" />
      
      {/* 오른쪽 메인 대시보드 영역 뼈대 */}
      <Skeleton className="h-full flex-1 rounded-xl" />
    </div>
  );
}

/**
 * 3. 실제 Resizable 관련 컴포넌트들
 */
function ResizablePanelGroup({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) {
  return (
    <ResizablePrimitive.PanelGroup
      data-slot="resizable-panel-group"
      className={cn(
        "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
        className,
      )}
      {...props}
    />
  );
}

function ResizablePanel({
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Panel>) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />;
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean;
}) {
  return (
    <ResizablePrimitive.PanelResizeHandle
      data-slot="resizable-handle"
      className={cn(
        "bg-border focus-visible:ring-ring relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90",
        className,
      )}
      {...props}
    >
      {withHandle && (
        <div className="bg-border z-10 flex h-4 w-3 items-center justify-center rounded-xs border">
          <GripVerticalIcon className="size-2.5" />
        </div>
      )}
    </ResizablePrimitive.PanelResizeHandle>
  );
}

export { 
  ResizablePanelGroup, 
  ResizablePanel, 
  ResizableHandle,
  ResizableSkeleton // 스켈레톤 내보내기
};