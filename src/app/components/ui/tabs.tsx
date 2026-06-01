"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

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
 * 2. TabsSkeleton 컴포넌트
 * 탭 내비게이션 및 내부 화면 데이터셋이 로딩 중일 때 표시할 뼈대 레이아웃입니다.
 * 실제 상단 탭 리스트 규격(h-9)과 하단 본문 상자(h-44)의 공간 비율을 정밀하게 모방했습니다.
 */
function TabsSkeleton({
  triggerCount = 3,
  className,
}: {
  triggerCount?: number;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label="Loading tabs layout"
      className={cn("flex flex-col gap-2 w-full", className)}
    >
      {/* 상단 TabsList 형태의 버튼 크래들 뼈대 */}
      <div className="bg-muted inline-flex h-9 w-fit items-center justify-center rounded-xl p-[3px] gap-1">
        {Array.from({ length: triggerCount }).map((_, i) => (
          <Skeleton key={i} className="h-full w-20 rounded-xl" />
        ))}
      </div>
      
      {/* 하단 TabsContent 형태의 대형 본문 상자 뼈대 */}
      <Skeleton className="h-44 w-full rounded-xl" />
    </div>
  );
}

/**
 * 3. 실제 Tabs 관련 컴포넌트 프리미티브들
 */
function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-xl p-[3px] flex",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "data-[state=active]:bg-card dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-xl border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, TabsSkeleton }; // 스켈레톤 홀더를 패밀리로 함께 안전하게 내보냅니다.