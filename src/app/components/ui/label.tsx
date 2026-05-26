"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

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
 * 2. LabelSkeleton 컴포넌트
 * 라벨 텍스트가 로딩 중일 때 표시할 뼈대입니다.
 * 실제 Label과 동일한 높이(text-sm 기준 h-4)를 가져서 레이아웃 변화를 최소화합니다.
 */
function LabelSkeleton({ className }: { className?: string }) {
  return (
    <Skeleton className={cn("h-4 w-20 mb-2", className)} />
  );
}

/**
 * 3. 실제 Label 컴포넌트
 */
function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Label, LabelSkeleton };