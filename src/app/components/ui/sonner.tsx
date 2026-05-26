"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

import { cn } from "./utils";

/**
 * 1. 기초가 되는 Skeleton 조각
 * SynAIpse 프로젝트의 일정한 pulse 맥박 애니메이션 리듬을 공유합니다.
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
 * 2. ToastSkeleton 컴포넌트
 * 알림 메시지 상자가 동적으로 화면에 마킹되거나 로딩 중인 토스트 디자인 레이아웃을
 * 중간 점검/테스트 스위치 화면에서 미리 시각화해 주는 고정형 뼈대 부품입니다.
 */
function ToastSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="status"
      aria-label="Loading notification"
      className={cn(
        "flex items-start gap-3 p-4 rounded-xl border bg-popover shadow-md w-80 text-popover-foreground pointer-events-none animate-pulse",
        className
      )}
      {...props}
    >
      {/* 알림 상태 아이콘 자리 뼈대 */}
      <Skeleton className="size-5 rounded-full shrink-0" />
      <div className="space-y-1.5 flex-1">
        {/* 토스트 대제목 뼈대 */}
        <Skeleton className="h-4 w-[45%]" />
        {/* 토스트 본문 설명문 뼈대 */}
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  );
}

/**
 * 3. 실제 Toaster 글로벌 프로바이더 컴포넌트
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster, ToastSkeleton };