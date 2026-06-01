"use client";

import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

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
 * 2. ScrollAreaSkeleton 컴포넌트
 * 스크롤이 적용될 내부 목록이 로딩 중일 때 표시할 레이아웃 뼈대입니다.
 */
function ScrollAreaSkeleton({ 
  count = 4, 
  className 
}: { 
  count?: number; 
  className?: string; 
}) {
  return (
    <div 
      className={cn("relative overflow-hidden border rounded-xl p-4 bg-background", className)}
      role="status"
      aria-label="Loading content area"
    >
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="space-y-2">
            {/* 리스트 아이템 제목 항목 뼈대 */}
            <Skeleton className="h-4 w-[30%]" />
            {/* 리스트 아이템 세부 설명 뼈대 */}
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
      
      {/* 우측 가짜 스크롤 바 트랙 시각화 */}
      <div className="absolute right-1 top-2 bottom-2 w-1.5 bg-muted/40 rounded-full animate-pulse" />
    </div>
  );
}

/**
 * 3. 실제 ScrollArea 관련 컴포넌트들 (오타 수정 완료)
 */
function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none",
        orientation === "vertical" &&
          "h-full w-2.5 border-l border-l-transparent",
        orientation === "horizontal" &&
          "h-2.5 flex-col border-t border-t-transparent",
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="bg-border relative flex-1 rounded-full"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
}

export { ScrollArea, ScrollBar, ScrollAreaSkeleton };