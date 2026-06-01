"use client";

import * as React from "react";
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
 * 2. CardSkeleton 컴포넌트
 * 실제 Card와 동일한 패딩과 간격을 가져서 로딩 전후의 시각적 차이를 최소화합니다.
 */
function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-card flex flex-col gap-6 rounded-xl border p-6",
        className
      )}
    >
      {/* 헤더 부분 뼈대 */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-1/3" /> {/* 제목 자리 */}
        <Skeleton className="h-4 w-1/2" /> {/* 설명 자리 */}
      </div>
      
      {/* 본문 부분 뼈대 */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* 푸터 부분 뼈대 */}
      <div className="flex items-center pt-2">
        <Skeleton className="h-9 w-24" /> {/* 버튼 등 액션 자리 */}
      </div>
    </div>
  );
}

/**
 * 3. 실제 Card 관련 컴포넌트들
 */
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <h4
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6 [&:last-child]:pb-6", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 pb-6 [.border-t]:pt-6", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  CardSkeleton, // 스켈레톤도 함께 내보냅니다!
};