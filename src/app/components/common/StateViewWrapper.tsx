import React from 'react';
import LoadingState from './LoadingState';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';
import UnauthorizedState from './UnauthorizedState';

// 공통 상태 타입 정의
export type ApiStatus = 'loading' | 'empty' | 'error' | 'unauthorized' | 'success';

interface StateViewWrapperProps {
  status: ApiStatus;
  children: React.ReactNode; // 정상적일 때 보여줄 실제 화면 내용
  emptyMessage?: string;
  errorMessage?: string;
  onRetry?: () => void;
}

export default function StateViewWrapper({
  status,
  children,
  emptyMessage,
  errorMessage,
  onRetry,
}: StateViewWrapperProps) {
  // 1. 로딩 상태일 때
  if (status === 'loading') {
    return <LoadingState />;
  }

  // 2. 인증 오류(로그인 필요)일 때
  if (status === 'unauthorized') {
    return <UnauthorizedState />;
  }

  // 3. 에러 발생했을 때
  if (status === 'error') {
    return <ErrorState message={errorMessage} onRetry={onRetry} />;
  }

  // 4. 데이터가 없는 빈 상태일 때
  if (status === 'empty') {
    return <EmptyState message={emptyMessage} />;
  }

  // 5. 성공(success)일 때만 실제 화면을 보여줌
  return <>{children}</>;
}