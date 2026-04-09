import { useEffect, useState } from "react";
import { BRIGHT_BEIGE, CREAM, BORDER, BEIGE } from "../colors";

// ── 스타일 상수 (팔레트 기준) ──
const SKELETON_BG      = "rgba(65,67,27,0.06)";   // 올리브 틴트 스켈레톤
const SKELETON_SHIMMER = "rgba(65,67,27,0.11)";   // 올리브 시머
const PAGE_BG          = BRIGHT_BEIGE;              // 밝은 베이지 (#FEFCF5)

// ────────────────────────────────────────────
// Skeleton 애니메이션 컴포넌트
// ────────────────────────────────────────────
export function SkeletonBox({ className = "", style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-lg overflow-hidden ${className}`}
      style={{
        background: SKELETON_BG,
        position: "relative",
        ...style,
      }}
    >
      <div
        className="absolute inset-0 animate-pulse"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${SKELETON_SHIMMER} 50%, transparent 100%)`,
          animation: "shimmer 1.5s infinite",
        }}
      />
    </div>
  );
}

// ────────────────────────────────────────────
// 페이지 로딩 래퍼 (Skeleton → 실제 컨텐츠)
// ────────────────────────────────────────────
export function PageLoader({
  children,
  skeleton,
  delay = 600,
}: {
  children: React.ReactNode;
  skeleton: React.ReactNode;
  delay?: number;
}) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!isLoaded) return <>{skeleton}</>;
  return <>{children}</>;
}

// ────────────────────────────────────────────
// 공통 Skeleton 레이아웃들
// ────────────────────────────────────────────

// Dashboard 스타일 Skeleton
export function DashboardSkeleton() {
  return (
    <div className="flex-1 flex flex-col p-6 gap-5 overflow-y-auto" style={{ background: PAGE_BG }}>
      {/* 헤더 */}
      <div className="space-y-2">
        <SkeletonBox style={{ width: "240px", height: "28px" }} />
        <SkeletonBox style={{ width: "180px", height: "16px" }} />
      </div>

      {/* 통계 카드 그리드 */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="p-4 rounded-xl border" style={{ borderColor: BORDER, background: CREAM }}>
            <SkeletonBox style={{ width: "100px", height: "14px", marginBottom: "12px" }} />
            <SkeletonBox style={{ width: "80px", height: "32px", marginBottom: "8px" }} />
            <SkeletonBox style={{ width: "60px", height: "12px" }} />
          </div>
        ))}
      </div>

      {/* 차트 영역 */}
      <div className="grid grid-cols-2 gap-4">
        {[1, 2].map(i => (
          <div key={i} className="p-5 rounded-xl border" style={{ borderColor: BORDER, background: CREAM }}>
            <SkeletonBox style={{ width: "140px", height: "18px", marginBottom: "20px" }} />
            <SkeletonBox style={{ width: "100%", height: "180px" }} />
          </div>
        ))}
      </div>

      {/* 리스트 영역 */}
      <div className="p-5 rounded-xl border" style={{ borderColor: BORDER, background: CREAM }}>
        <SkeletonBox style={{ width: "160px", height: "18px", marginBottom: "16px" }} />
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-3">
              <SkeletonBox style={{ width: "40px", height: "40px", borderRadius: "8px" }} />
              <div className="flex-1 space-y-2">
                <SkeletonBox style={{ width: "60%", height: "14px" }} />
                <SkeletonBox style={{ width: "40%", height: "12px" }} />
              </div>
              <SkeletonBox style={{ width: "60px", height: "24px", borderRadius: "6px" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Table 스타일 Skeleton
export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="flex-1 flex flex-col p-6 gap-4 overflow-y-auto" style={{ background: PAGE_BG }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <SkeletonBox style={{ width: "200px", height: "24px" }} />
        <SkeletonBox style={{ width: "120px", height: "36px", borderRadius: "8px" }} />
      </div>

      {/* 테이블 */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: BORDER }}>
        {/* 테이블 헤더 */}
        <div className="flex items-center gap-4 px-5 py-3 border-b" style={{ background: BEIGE, borderColor: BORDER }}>
          {[1, 2, 3, 4].map(i => (
            <SkeletonBox key={i} style={{ width: i === 1 ? "30%" : "20%", height: "14px" }} />
          ))}
        </div>
        {/* 테이블 행들 */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b" style={{ borderColor: BORDER, background: i % 2 === 0 ? PAGE_BG : CREAM }}>
            {[1, 2, 3, 4].map(j => (
              <SkeletonBox key={j} style={{ width: j === 1 ? "30%" : "20%", height: "16px" }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Profile/Stats 스타일 Skeleton
export function ProfileSkeleton() {
  return (
    <div className="flex-1 flex flex-col p-6 gap-5 overflow-y-auto" style={{ background: PAGE_BG }}>
      {/* 프로필 헤더 */}
      <div className="flex items-center gap-4">
        <SkeletonBox style={{ width: "80px", height: "80px", borderRadius: "50%" }} />
        <div className="flex-1 space-y-2">
          <SkeletonBox style={{ width: "200px", height: "24px" }} />
          <SkeletonBox style={{ width: "150px", height: "16px" }} />
        </div>
      </div>

      {/* 정보 카드 */}
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="p-4 rounded-xl border" style={{ borderColor: BORDER, background: CREAM }}>
            <SkeletonBox style={{ width: "80px", height: "14px", marginBottom: "12px" }} />
            <SkeletonBox style={{ width: "120px", height: "20px" }} />
          </div>
        ))}
      </div>

      {/* 상세 정보 */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg" style={{ background: BEIGE }}>
            <SkeletonBox style={{ width: "120px", height: "14px" }} />
            <SkeletonBox style={{ width: "180px", height: "14px" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// 글로벌 애니메이션 스타일 추가
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
  `;
  document.head.appendChild(style);
}