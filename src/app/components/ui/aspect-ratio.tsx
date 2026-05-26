"use client";

import * as React from "react";
import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio";
import { cn } from "./utils";

/**
 * 1. Skeleton 조각 컴포넌트
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
 * 2. AspectRatioSkeleton
 * 비율이 유지되는 영역 내부에 회색 뼈대를 꽉 채워 보여줍니다.
 * ratio 프롭을 조절하여 실제 컴포넌트와 동일한 크기를 유지할 수 있습니다.
 */
function AspectRatioSkeleton({ ratio = 16 / 9, className }: { ratio?: number; className?: string }) {
  return (
    <div className={cn("w-full", className)}>
      <AspectRatioPrimitive.Root ratio={ratio}>
        <Skeleton className="w-full h-full" />
      </AspectRatioPrimitive.Root>
    </div>
  );
}

/**
 * 3. 실제 AspectRatio 컴포넌트
 */
function AspectRatio({
  ...props
}: React.ComponentProps<typeof AspectRatioPrimitive.Root>) {
  return <AspectRatioPrimitive.Root data-slot="aspect-ratio" {...props} />;
}

export { AspectRatio, AspectRatioSkeleton };