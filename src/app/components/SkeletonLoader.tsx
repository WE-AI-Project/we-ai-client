import { ACCENT_BG, BEIGE, BORDER, BRIGHT_BEIGE, CREAM } from "../colors";

const SKELETON_BG = "rgba(65,67,27,0.06)";
const SKELETON_SHIMMER = "rgba(65,67,27,0.11)";
const PAGE_BG = BRIGHT_BEIGE;

export function SkeletonBox({
  className = "",
  style = {},
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
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

export function DashboardSkeleton() {
  return (
    <div className="flex-1 flex flex-col p-6 gap-5 overflow-y-auto" style={{ background: PAGE_BG }}>
      <div className="space-y-2">
        <SkeletonBox style={{ width: "240px", height: "28px" }} />
        <SkeletonBox style={{ width: "180px", height: "16px" }} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 rounded-xl border" style={{ borderColor: BORDER, background: CREAM }}>
            <SkeletonBox style={{ width: "100px", height: "14px", marginBottom: "12px" }} />
            <SkeletonBox style={{ width: "80px", height: "32px", marginBottom: "8px" }} />
            <SkeletonBox style={{ width: "60px", height: "12px" }} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="p-5 rounded-xl border" style={{ borderColor: BORDER, background: CREAM }}>
            <SkeletonBox style={{ width: "140px", height: "18px", marginBottom: "20px" }} />
            <SkeletonBox style={{ width: "100%", height: "180px" }} />
          </div>
        ))}
      </div>

      <div className="p-5 rounded-xl border" style={{ borderColor: BORDER, background: CREAM }}>
        <SkeletonBox style={{ width: "160px", height: "18px", marginBottom: "16px" }} />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
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

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="flex-1 flex flex-col p-6 gap-4 overflow-y-auto" style={{ background: PAGE_BG }}>
      <div className="flex items-center justify-between">
        <SkeletonBox style={{ width: "200px", height: "24px" }} />
        <SkeletonBox style={{ width: "120px", height: "36px", borderRadius: "8px" }} />
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: BORDER }}>
        <div className="flex items-center gap-4 px-5 py-3 border-b" style={{ background: BEIGE, borderColor: BORDER }}>
          {[1, 2, 3, 4].map((i) => (
            <SkeletonBox key={i} style={{ width: i === 1 ? "30%" : "20%", height: "14px" }} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-5 py-4 border-b"
            style={{ borderColor: BORDER, background: i % 2 === 0 ? PAGE_BG : CREAM }}
          >
            {[1, 2, 3, 4].map((j) => (
              <SkeletonBox key={j} style={{ width: j === 1 ? "30%" : "20%", height: "16px" }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="flex-1 flex flex-col p-6 gap-5 overflow-y-auto" style={{ background: PAGE_BG }}>
      <div className="flex items-center gap-4">
        <SkeletonBox style={{ width: "80px", height: "80px", borderRadius: "50%" }} />
        <div className="flex-1 space-y-2">
          <SkeletonBox style={{ width: "200px", height: "24px" }} />
          <SkeletonBox style={{ width: "150px", height: "16px" }} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 rounded-xl border" style={{ borderColor: BORDER, background: CREAM }}>
            <SkeletonBox style={{ width: "80px", height: "14px", marginBottom: "12px" }} />
            <SkeletonBox style={{ width: "120px", height: "20px" }} />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg" style={{ background: BEIGE }}>
            <SkeletonBox style={{ width: "120px", height: "14px" }} />
            <SkeletonBox style={{ width: "180px", height: "14px" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProjectSettingsSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-5" style={{ background: PAGE_BG }}>
      <div className="mx-auto max-w-6xl space-y-5">
        <section
          className="rounded-[28px] border px-6 py-6"
          style={{ background: "rgba(255,255,255,0.9)", borderColor: BORDER }}
        >
          <div className="space-y-3">
            <SkeletonBox style={{ width: "140px", height: "14px" }} />
            <SkeletonBox style={{ width: "280px", height: "36px" }} />
            <SkeletonBox style={{ width: "65%", height: "14px" }} />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBox
                key={index}
                style={{ width: index === 2 ? "96px" : "84px", height: "34px", borderRadius: "999px" }}
              />
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl px-4 py-4" style={{ background: ACCENT_BG }}>
              <SkeletonBox style={{ width: "78px", height: "12px", marginBottom: "10px" }} />
              <SkeletonBox style={{ width: index === 0 ? "96px" : "56px", height: "24px" }} />
            </div>
          ))}
        </section>

        <section
          className="grid gap-4 rounded-[28px] border px-5 py-5 md:grid-cols-2"
          style={{ background: "rgba(255,255,255,0.9)", borderColor: BORDER }}
        >
          {Array.from({ length: 2 }).map((_, sectionIndex) => (
            <div key={sectionIndex} className="space-y-4">
              <SkeletonBox style={{ width: "120px", height: "20px" }} />
              <div className="space-y-3">
                {Array.from({ length: sectionIndex === 0 ? 3 : 4 }).map((__, itemIndex) => (
                  <div
                    key={itemIndex}
                    className="rounded-2xl border px-4 py-3"
                    style={{ borderColor: "rgba(65,67,27,0.08)", background: ACCENT_BG }}
                  >
                    <SkeletonBox style={{ width: "84px", height: "11px", marginBottom: "10px" }} />
                    <SkeletonBox
                      style={{
                        width: sectionIndex === 0 ? `${70 - itemIndex * 10}%` : `${55 + itemIndex * 8}%`,
                        height: "16px",
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

export function ProjectPickerSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="w-full rounded-xl px-4 py-3"
          style={{ background: "rgba(0,0,0,0.03)", border: `1.5px solid ${BORDER}` }}
        >
          <div className="flex items-center gap-3">
            <SkeletonBox style={{ width: "32px", height: "32px", borderRadius: "12px" }} />
            <div className="min-w-0 flex-1 space-y-2">
              <SkeletonBox style={{ width: `${56 + index * 6}%`, height: "12px" }} />
              <SkeletonBox style={{ width: `${44 + index * 5}%`, height: "10px" }} />
              <SkeletonBox style={{ width: `${62 + index * 4}%`, height: "10px" }} />
            </div>
            <SkeletonBox style={{ width: "16px", height: "16px", borderRadius: "999px" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

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
