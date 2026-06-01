"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

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
 * 2. PopoverSkeleton 컴포넌트
 * 팝오버 창이 열렸을 때 내부 데이터가 로딩 중이면 보여줄 뼈대입니다.
 * 실제 팝오버의 기본 너비(w-72)와 내부 패딩안에서 자연스럽게 작동하도록 설계했습니다.
 */
function PopoverSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3 w-full py-1">
      {/* 제목 부분 뼈대 */}
      <Skeleton className="h-4 w-[40%] mb-1" />
      
      {/* 설명 및 본문 부분 뼈대들 */}
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton 
            key={i} 
            className={cn("h-3 w-full", i === lines - 1 && "w-[70%]")} 
          />
        ))}
      </div>
    </div>
  );
}

/**
 * 3. 실제 Popover 관련 컴포넌트들
 */
function Popover({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 origin-(--radix-hover-card-content-transform-origin) rounded-md border p-4 shadow-md outline-hidden",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

export { 
  Popover, 
  PopoverTrigger, 
  PopoverContent, 
  PopoverAnchor, 
  PopoverSkeleton // 스켈레톤 내보내기
};