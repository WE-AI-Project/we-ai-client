"use client";

import * as React from "react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";

import { cn } from "./utils";

/**
 * 1. 기초가 되는 Skeleton 조각
 * SynAIpse 프로젝트의 다른 컴포넌트들과 동일한 animate-pulse 효과를 공유합니다.
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
 * 2. CollapsibleSkeleton 컴포넌트
 * 접이식 메뉴가 로딩 중일 때 표시할 뼈대입니다.
 * 제목 영역과 접혀 있는 느낌을 시각적으로 재현했습니다.
 */
function CollapsibleSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("w-full space-y-2 py-2", className)}>
      <div className="flex items-center justify-between px-4 py-2 border rounded-md">
        {/* 제목 뼈대 */}
        <Skeleton className="h-4 w-32" />
        {/* 우측 아이콘/버튼 뼈대 */}
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
    </div>
  );
}

/**
 * 3. 실제 Collapsible 관련 컴포넌트들
 */
function Collapsible({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

function CollapsibleTrigger({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot="collapsible-trigger"
      {...props}
    />
  );
}

function CollapsibleContent({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot="collapsible-content"
      {...props}
    />
  );
}

export { 
  Collapsible, 
  CollapsibleTrigger, 
  CollapsibleContent, 
  CollapsibleSkeleton // 스켈레톤도 함께 내보냅니다!
};