"use client";

import * as React from "react";

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
 * 2. TextareaSkeleton 컴포넌트
 * 장문 입력창이 초기화 상태이거나 데이터를 로딩 중일 때 표시할 뼈대 레이아웃입니다.
 * 실제 Textarea가 가지는 최소 높이(min-h-16)와 안쪽 패딩, 외각 둥글기를 완벽히 재현하고
 * 내부의 가짜 텍스트 줄 2개를 배치해 장문 인풋 영역임을 직관적으로 알려줍니다.
 */
function TextareaSkeleton({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading text area"
      className={cn(
        "border border-input/40 min-h-16 w-full rounded-md p-3 space-y-2 bg-input-background/20",
        className
      )}
    >
      <Skeleton className="h-3 w-[85%]" />
      <Skeleton className="h-3 w-[50%]" />
    </div>
  );
}

/**
 * 3. 실제 Textarea 컴포넌트
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "resize-none border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-input-background px-3 py-2 text-base transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea, TextareaSkeleton };