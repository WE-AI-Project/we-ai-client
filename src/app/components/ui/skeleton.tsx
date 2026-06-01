"use client";

import * as React from "react";
import { cn } from "./utils";

/**
 * SynAIpse 프로젝트 전역 로딩 애니메이션의 근간이 되는 기초 Skeleton 부품입니다.
 * bg-accent 색상과 부드러운 animate-pulse 효과를 내장하고 있으며,
 * 외부에서 주입되는 className 프롭을 통해 크기(w, h)와 모양(rounded)을 가변적으로 변조할 수 있습니다.
 */
function Skeleton({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "bg-accent/40 dark:bg-accent/60 animate-pulse rounded-md", 
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };