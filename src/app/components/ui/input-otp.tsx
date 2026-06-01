"use client";

import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { MinusIcon } from "lucide-react";

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
 * 2. InputOTPSkeleton 컴포넌트
 * 인증 번호 입력창이 로딩 중일 때 표시할 뼈대입니다.
 * 실제 입력 슬롯과 동일한 크기(h-9 w-9)와 간격을 재현했습니다.
 */
function InputOTPSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex items-center gap-2" role="status" aria-label="Loading OTP input">
      <div className="flex items-center gap-1">
        {Array.from({ length: count }).map((_, i) => (
          <React.Fragment key={i}>
            <Skeleton 
              className={cn(
                "h-9 w-9 border",
                i === 0 && "rounded-l-md",
                i === count - 1 && "rounded-r-md",
                i !== 0 && i !== count - 1 && "rounded-none"
              )} 
            />
            {/* 중간에 구분선을 넣고 싶을 경우를 대비한 로직 (예: 3개씩 끊기) */}
            {count > 3 && i === Math.floor(count / 2) - 1 && (
              <div className="px-1 opacity-20">
                <MinusIcon />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/**
 * 3. 실제 InputOTP 관련 컴포넌트들
 */
function InputOTP({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<typeof OTPInput> & {
  containerClassName?: string;
}) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn(
        "flex items-center gap-2 has-disabled:opacity-50",
        containerClassName,
      )}
      className={cn("disabled:cursor-not-allowed", className)}
      {...props}
    />
  );
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn("flex items-center gap-1", className)}
      {...props}
    />
  );
}

function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  index: number;
}) {
  const inputOTPContext = React.useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {};

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      className={cn(
        "data-[active=true]:border-ring data-[active=true]:ring-ring/50 data-[active=true]:aria-invalid:ring-destructive/20 dark:data-[active=true]:aria-invalid:ring-destructive/40 aria-invalid:border-destructive data-[active=true]:aria-invalid:border-destructive dark:bg-input/30 border-input relative flex h-9 w-9 items-center justify-center border-y border-r text-sm bg-input-background transition-all outline-none first:rounded-l-md first:border-l last:rounded-r-md data-[active=true]:z-10 data-[active=true]:ring-[3px]",
        className,
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="animate-caret-blink bg-foreground h-4 w-px duration-1000" />
        </div>
      )}
    </div>
  );
}

function InputOTPSeparator({ ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="input-otp-separator" role="separator" {...props}>
      <MinusIcon />
    </div>
  );
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator, InputOTPSkeleton };