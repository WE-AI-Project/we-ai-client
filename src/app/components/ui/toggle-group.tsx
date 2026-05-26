"use client";

import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { type VariantProps } from "class-variance-authority";

import { cn } from "./utils";
import { toggleVariants } from "./toggle";

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
 * 2. ToggleGroupSkeleton 컴포넌트
 * 버튼들이 일렬로 조립되어 결합되어 있는 토글 그룹 특유의 인터페이스 구조를
 * 완벽히 모방하여 레이아웃 시프트를 효과적으로 방어해 주는 뼈대 부품입니다.
 */
function ToggleGroupSkeleton({
  count = 3,
  size = "default",
  className,
}: {
  count?: number;
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  // 실제 toggleVariants 크기 구조에 맞추어 스켈레톤의 정사각형 규격을 실시간 동기화합니다.
  const sizeClass =
    size === "sm" ? "h-8 w-8" : size === "lg" ? "h-10 w-10" : "h-9 w-9";

  return (
    <div
      role="status"
      aria-label="Loading toggle options"
      className={cn(
        "flex w-fit items-center rounded-md border border-input/40 p-[2px] bg-input-background/20",
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            sizeClass,
            "rounded-none first:rounded-l-md last:rounded-r-md border-r last:border-r-0 border-input/10"
          )}
        />
      ))}
    </div>
  );
}

/**
 * 3. 실제 ToggleGroup 관련 컴포넌트 프리미티브 및 컨텍스트 로직들
 */
const ToggleGroupContext = React.createContext<
  VariantProps<typeof toggleVariants>
>({
  size: "default",
  variant: "default",
});

function ToggleGroup({
  className,
  variant,
  size,
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      className={cn(
        "group/toggle-group flex w-fit items-center rounded-md data-[variant=outline]:shadow-xs",
        className,
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
}

function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> &
  VariantProps<typeof toggleVariants>) {
  const context = React.useContext(ToggleGroupContext);

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={context.variant || variant}
      data-size={context.size || size}
      className={cn(
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        "min-w-0 flex-1 shrink-0 rounded-none shadow-none first:rounded-l-md last:rounded-r-md focus:z-10 focus-visible:z-10 data-[variant=outline]:border-l-0 data-[variant=outline]:first:border-l",
        className,
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
}

export { ToggleGroup, ToggleGroupItem, ToggleGroupSkeleton };