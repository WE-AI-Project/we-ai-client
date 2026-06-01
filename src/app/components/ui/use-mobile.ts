"use client";

import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * SynAIpse 시스템이 현재 모바일 환경(768px 미만)에서 구동 중인지 실시간 감지하는 훅입니다.
 * window.innerWidth를 매번 직접 측정하는 대신 브라우저 내장 미디어쿼리 이벤트를 활용하여
 * 불필요한 리렌더링 성능 오버헤드를 물리적으로 최소화했습니다.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    // 768px 미만인지 판별하는 미디어 쿼리 리스너 생성
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    
    const onChange = () => {
      // 윈도우 너비를 직접 재는 것보다 matches 프로퍼티를 사용하는 것이 성능상 훨씬 우수합니다.
      setIsMobile(mql.matches);
    };

    // 브레이크포인트를 넘나들 때만 이벤트가 트리거되도록 설정
    mql.addEventListener("change", onChange);
    
    // 첫 클라이언트 마운트 시점의 상태를 최초 기록
    setIsMobile(mql.matches);

    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}