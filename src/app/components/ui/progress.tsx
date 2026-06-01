"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "./utils";

/**
 * 1. 기초가 되는 Skeleton 조각
 * SynAIpse 프로젝트의 모든 컴포넌트와 동일한 animate-pulse 효과를 공유합니다.
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
 * 2. ProgressSkeleton 컴포넌트
 * 진행도 데이터가 초기화되거나 로딩 중일 때 표시할 뼈대입니다.
 * 실제 Progress 바와 완벽히 동일한 높이(h-2)와 테두리 둥글기(rounded-full)를 가집니다.
 */
function ProgressSkeleton({ className }: { className?: string }) {
  return (
    <Skeleton className={cn("h-2 w-full rounded-full", className)} />
  );
}

/**
 * 3. 실제 Progress 컴포넌트
 */
function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="bg-primary h-full w-full flex-1 transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress, ProgressSkeleton }; // 스켈레톤도 함께 내보냅니다!