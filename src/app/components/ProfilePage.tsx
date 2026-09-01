import { useState, useEffect, useRef, useCallback } from "react";
import {
  User, GitCommit, Bot, FolderGit2, MapPin, Mail, Code2,
  Monitor, Cpu, MemoryStick, Wifi,
  Activity, Pencil, Plus,
} from "lucide-react";
import { ProfileEditModal } from "./ProfileEditModal";
// 기존 localStorage 기반 loadProfile 대신 초기값 뼈대만 사용 (ProfileData 타입은 유지)
import { ProfileData, AVATAR_GRADIENTS } from "../data/profileStore";
import { deviconUrl } from "../data/devicons";

// 🌟 API 통신 함수들 가져오기
import { 
  fetchCurrentUser, 
  fetchMyActivitySummary, 
  fetchMyActivities,
  updateMyProfile,
  MyActivitySummary,
  MyActivity,
  ProfileUpdatePayload
} from "../lib/api"; 

// ── 재사용 가능한 스켈레톤 뼈대 컴포넌트 ──
function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-black/10 ${className || ""}`}
      style={style}
    />
  );
}

// ── 디자인 토큰 ──
import {
  BORDER, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL,
  ACCENT, ACCENT_BG, ACCENT_BORDER, ACCENT_SAGE,
  GRADIENT_PAGE, GRADIENT_ORB_1, GRADIENT_ORB_2,
  UI_CYAN, UI_CYAN_BG,
} from "../colors";

// ── 브라우저 Memory API 타입 ──
type PerfMemory = {
  usedJSHeapSize:  number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
};

type NavWithExtras = Navigator & {
  deviceMemory?: number;
  connection?: {
    effectiveType: string;
    downlink:      number;
    rtt:           number;
    saveData:      boolean;
  };
};

function fmtBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(decimals)} ${sizes[i]}`;
}

function GaugeBar({ value, color, bg }: { value: number; color: string; bg?: string }) {
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: bg ?? "rgba(0,0,0,0.08)" }}>
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }}
      />
    </div>
  );
}

// ── 시스템 스탯 훅 ──
function useSystemStats() {
  const [fps,       setFps]       = useState(60);
  const [heapUsed,  setHeapUsed]  = useState(0);
  const [heapTotal, setHeapTotal] = useState(0);
  const [network,   setNetwork]   = useState<{ type: string; downlink: number; rtt: number } | null>(null);
  const rafRef  = useRef<number>(0);
  const lastRef = useRef<number>(performance.now());
  const fpsArr  = useRef<number[]>([]);

  const measureFPS = useCallback(() => {
    const now   = performance.now();
    const delta = now - lastRef.current;
    lastRef.current = now;
    if (delta > 0) {
      const instantFps = Math.min(120, 1000 / delta);
      fpsArr.current = [...fpsArr.current.slice(-9), instantFps];
      const avg = fpsArr.current.reduce((a, b) => a + b, 0) / fpsArr.current.length;
      setFps(Math.round(avg));
    }
    rafRef.current = requestAnimationFrame(measureFPS);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(measureFPS);
    return () => cancelAnimationFrame(rafRef.current);
  }, [measureFPS]);

  useEffect(() => {
    const poll = () => {
      const perf = performance as Performance & { memory?: PerfMemory };
      if (perf.memory) {
        setHeapUsed(perf.memory.usedJSHeapSize);
        setHeapTotal(perf.memory.jsHeapSizeLimit);
      }
      const nav = navigator as NavWithExtras;
      if (nav.connection) {
        setNetwork({ type: nav.connection.effectiveType, downlink: nav.connection.downlink, rtt: nav.connection.rtt });
      }
    };
    poll();
    const id = setInterval(poll, 1000);
    return () => clearInterval(id);
  }, []);

  const nav            = navigator as NavWithExtras;
  const cpuCores       = navigator.hardwareConcurrency ?? 1;
  const deviceMemoryGB = nav.deviceMemory ?? null;
  const renderLoad     = Math.max(0, Math.min(100, Math.round((1 - fps / 60) * 100)));

  return { fps, renderLoad, cpuCores, heapUsed, heapTotal, deviceMemoryGB, network };
}

function TechBadge({ name, slug, variant }: { name: string; slug: string; variant: string }) {
  const [err, setErr] = useState(false);
  const url = slug ? deviconUrl(slug, variant) : "";
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all"
      style={{
        background: ACCENT_BG,
        border: `1px solid ${ACCENT_BORDER}`,
      }}
    >
      {slug && !err ? (
        <img
          src={url}
          alt={name}
          className="w-4 h-4 shrink-0"
          onError={() => setErr(true)}
        />
      ) : (
        <Code2 className="w-3.5 h-3.5 shrink-0" style={{ color: ACCENT }} />
      )}
      <span className="text-[10px] font-medium" style={{ color: TEXT_PRIMARY }}>{name}</span>
    </div>
  );
}

// ── 메인 ProfilePage ──
// props로 현재 진입한 프로젝트 ID를 받도록 확장 (기본값 설정)
export function ProfilePage({ projectId = 1 }: { projectId?: number | string }) {
  // 로딩 상태 관리를 위해 true로 시작
  const [isLoading, setIsLoading] = useState(true);

  const stats = useSystemStats();
  const [editOpen, setEditOpen] = useState(false);

  // 🌟 API로 받아올 상태값들
  const [profile, setProfile] = useState<ProfileData>({
    displayName: "",
    role: "",
    email: "",
    location: "",
    bio: "",
    avatarColor: "olive",
    techStack: [],
  });
  
  const [activitySummary, setActivitySummary] = useState<MyActivitySummary | null>(null);
  const [recentActivities, setRecentActivities] = useState<MyActivity[]>([]);

  // 🌟 페이지 마운트 시 실서버 통신
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setIsLoading(true);
        // 병렬로 API 3개 동시 호출 (내 정보, 활동 요약, 최근 활동)
        const [sessionUser, summary, activitiesRes] = await Promise.all([
          fetchCurrentUser(),
          fetchMyActivitySummary(),
          fetchMyActivities()
        ]);

        // 받아온 정보로 프로필 상태 업데이트
        setProfile({
          displayName: sessionUser.name || "Unknown User",
          role: sessionUser.role || "Member",
          email: sessionUser.email || "",
          location: "Seoul, Korea", // API에 location 필드가 없다면 기본값 또는 빈 문자열
          bio: "SynAIpse 개발자",   // API에 bio 필드가 없다면 기본값 또는 빈 문자열
          avatarColor: "olive",     // 사용자 선호 색상 연동 시 변경 가능
          techStack: [],            // 프로필 확장 시 연동
        });

        setActivitySummary(summary);
        setRecentActivities(Array.isArray(activitiesRes) ? activitiesRes : []);
      } catch (e) {
        console.error("프로필 데이터를 불러오는 중 오류가 발생했습니다.", e);
      } finally {
        setIsLoading(false);
      }
    };
    
    void fetchAllData();
  }, [projectId]);

  // 🌟 프로필 편집 모달에서 "저장" 버튼을 눌렀을 때 호출될 핸들러
  const handleProfileSave = async (updatedProfile: ProfileData) => {
    try {
      // 1. API에 맞는 Payload 형태 구성
      const payload: ProfileUpdatePayload = {
        displayName: updatedProfile.displayName,
        role: updatedProfile.role,
        email: updatedProfile.email,
        location: updatedProfile.location,
        bio: updatedProfile.bio,
        avatarColor: updatedProfile.avatarColor,
        techStack: updatedProfile.techStack.map(t => ({
          name: t.name,
          slug: t.slug,
          variant: t.variant
        }))
      };

      // 2. 서버로 저장 요청
      await updateMyProfile(payload);
      
      // 3. 로컬 상태 업데이트 및 모달 닫기
      setProfile(updatedProfile);
      setEditOpen(false);
      
    } catch (error) {
      console.error("프로필 업데이트 실패:", error);
      alert("프로필 저장에 실패했습니다. 다시 시도해 주세요.");
    }
  };

  const memPct = stats.heapTotal > 0
    ? Math.round((stats.heapUsed / stats.heapTotal) * 100)
    : 0;

  const grad = AVATAR_GRADIENTS[profile.avatarColor] ?? AVATAR_GRADIENTS["olive"];
  const gradBg = `linear-gradient(135deg, ${grad.from}, ${grad.via}, ${grad.to})`;

  // ── 동적 통계 카드 구성 ──
  const dynamicStats = [
    { label: "Total Tasks",      value: String(activitySummary?.totalTasks ?? 0),      color: ACCENT,      bg: ACCENT_BG },
    { label: "Completed Tasks",  value: String(activitySummary?.completedTasks ?? 0),  color: "#5A8A4A",   bg: "rgba(90,138,74,0.07)" },
    { label: "Recent Commits",   value: String(activitySummary?.recentCommitsCount ?? 0), color: "#C09840", bg: "rgba(192,152,64,0.07)" },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* 배경 */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: GRADIENT_PAGE }} />
      <div className="absolute inset-0 pointer-events-none">
        <div style={{ position: "absolute", top: "-10%", left: "-5%", width: "45%", height: "45%", borderRadius: "50%", background: GRADIENT_ORB_1, filter: "blur(50px)" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-5%", width: "50%", height: "50%", borderRadius: "50%", background: GRADIENT_ORB_2, filter: "blur(50px)" }} />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-4">

          {/* ── 프로필 헤더 ── */}
          <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.85)", border: `1px solid ${BORDER}` }}>
            <div className="flex items-start gap-5">
              {isLoading ? (
                <Skeleton className="w-20 h-20 rounded-2xl shrink-0" />
              ) : (
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: gradBg }}
                >
                  <User className="w-9 h-9 text-white" style={{ opacity: 0.85 }} />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                {isLoading ? (
                  <>
                    <div className="flex items-center gap-3 mb-3">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-5 w-24 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-3/4 mb-4" />
                    <div className="space-y-2.5">
                      <Skeleton className="h-3 w-48" />
                      <Skeleton className="h-3 w-40" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h1 className="text-lg font-bold" style={{ color: TEXT_PRIMARY }}>{profile.displayName}</h1>
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: ACCENT_BG, color: ACCENT, border: `1px solid ${ACCENT_BORDER}` }}
                      >
                        {profile.role}
                      </span>
                    </div>
                    {profile.bio && (
                      <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: TEXT_SECONDARY }}>
                        {profile.bio}
                      </p>
                    )}
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <FolderGit2 className="w-3 h-3 shrink-0" style={{ color: TEXT_TERTIARY }} />
                        <span className="text-xs" style={{ color: TEXT_SECONDARY }}>SynAIpse Project Office</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3 shrink-0" style={{ color: TEXT_TERTIARY }} />
                        <span className="text-xs" style={{ color: TEXT_SECONDARY }}>{profile.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 shrink-0" style={{ color: TEXT_TERTIARY }} />
                        <span className="text-xs" style={{ color: TEXT_SECONDARY }}>{profile.location}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* 편집 버튼 */}
              {isLoading ? (
                <Skeleton className="h-8 w-28 rounded-xl shrink-0" />
              ) : (
                <button
                  onClick={() => setEditOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all shrink-0"
                  style={{
                    background: ACCENT_BG,
                    border: `1px solid ${ACCENT_BORDER}`,
                    color: ACCENT,
                  }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* ── 통계 카드 ── */}
          <div className="grid grid-cols-3 gap-2.5">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl p-3.5" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}` }}>
                  <Skeleton className="h-6 w-10 mb-2" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))
            ) : (
              dynamicStats.map(s => (
                <div key={s.label} className="rounded-xl p-3.5" style={{ background: s.bg, border: `1px solid ${BORDER}` }}>
                  <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: TEXT_LABEL }}>{s.label}</p>
                </div>
              ))
            )}
          </div>

          {/* ── 시스템 모니터 (변경 없음) ── */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.85)", border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(247,247,245,0.85)" }}>
              <Activity className="w-3.5 h-3.5" style={{ color: ACCENT }} />
              <p className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>System Monitor</p>
              {!isLoading && (
                <div className="ml-auto flex items-center gap-1.5 text-[9px]" style={{ color: TEXT_TERTIARY }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Live — browser APIs
                </div>
              )}
            </div>

            <div className="p-5 grid grid-cols-3 gap-4">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl p-4 bg-black/5 border border-black/5 space-y-4">
                    <div className="flex justify-between items-center">
                      <Skeleton className="w-16 h-4" />
                      <Skeleton className="w-10 h-4" />
                    </div>
                    <Skeleton className="w-full h-1.5 rounded-full" />
                  </div>
                ))
              ) : (
                <>
                  {/* CPU */}
                  <div className="rounded-xl p-4" style={{ background: ACCENT_BG, border: `1px solid ${ACCENT_BORDER}` }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Cpu className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                      <p className="text-[11px] font-semibold" style={{ color: TEXT_PRIMARY }}>CPU</p>
                      <span className="ml-auto text-[10px] font-mono font-semibold" style={{ color: ACCENT }}>{stats.renderLoad}%</span>
                    </div>
                    <GaugeBar
                      value={stats.renderLoad}
                      color={stats.renderLoad > 70 ? "#ef4444" : stats.renderLoad > 40 ? "#f59e0b" : ACCENT}
                      bg="rgba(65,67,27,0.10)"
                    />
                    <div className="mt-2.5 space-y-1">
                      <div className="flex justify-between text-[9px]">
                        <span style={{ color: TEXT_TERTIARY }}>Logical Cores</span>
                        <span className="font-semibold" style={{ color: TEXT_PRIMARY }}>{stats.cpuCores}</span>
                      </div>
                      <div className="flex justify-between text-[9px]">
                        <span style={{ color: TEXT_TERTIARY }}>Frame Rate</span>
                        <span className="font-semibold" style={{ color: stats.fps < 30 ? "#ef4444" : stats.fps < 50 ? "#f59e0b" : "#10b981" }}>{stats.fps} fps</span>
                      </div>
                    </div>
                  </div>

                  {/* Memory */}
                  <div className="rounded-xl p-4" style={{ background: "rgba(90,138,74,0.05)", border: "1px solid rgba(90,138,74,0.15)" }}>
                    <div className="flex items-center gap-2 mb-3">
                      <MemoryStick className="w-3.5 h-3.5" style={{ color: "#5A8A4A" }} />
                      <p className="text-[11px] font-semibold" style={{ color: TEXT_PRIMARY }}>Memory</p>
                      <span className="ml-auto text-[10px] font-mono font-semibold" style={{ color: "#5A8A4A" }}>{memPct > 0 ? `${memPct}%` : "—"}</span>
                    </div>
                    <GaugeBar value={memPct} color={memPct > 80 ? "#ef4444" : memPct > 60 ? "#f59e0b" : "#5A8A4A"} bg="rgba(90,138,74,0.12)" />
                    <div className="mt-2.5 space-y-1">
                      {stats.heapUsed > 0 ? (
                        <>
                          <div className="flex justify-between text-[9px]">
                            <span style={{ color: TEXT_TERTIARY }}>JS Heap Used</span>
                            <span className="font-semibold" style={{ color: TEXT_PRIMARY }}>{fmtBytes(stats.heapUsed)}</span>
                          </div>
                          <div className="flex justify-between text-[9px]">
                            <span style={{ color: TEXT_TERTIARY }}>Heap Limit</span>
                            <span className="font-semibold" style={{ color: TEXT_PRIMARY }}>{fmtBytes(stats.heapTotal)}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between text-[9px]">
                          <span style={{ color: TEXT_TERTIARY }}>JS Heap</span>
                          <span style={{ color: TEXT_TERTIARY }}>Not exposed</span>
                        </div>
                      )}
                      {stats.deviceMemoryGB != null && (
                        <div className="flex justify-between text-[9px]">
                          <span style={{ color: TEXT_TERTIARY }}>Device RAM</span>
                          <span className="font-semibold" style={{ color: TEXT_PRIMARY }}>{stats.deviceMemoryGB} GB</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Network */}
                  <div className="rounded-xl p-4" style={{ background: UI_CYAN_BG, border: "1px solid rgba(6,182,212,0.18)" }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Wifi className="w-3.5 h-3.5" style={{ color: UI_CYAN }} />
                      <p className="text-[11px] font-semibold" style={{ color: TEXT_PRIMARY }}>Network &amp; Display</p>
                    </div>
                    <div className="space-y-1.5">
                      {stats.network ? (
                        <>
                          <div className="flex justify-between text-[9px]">
                            <span style={{ color: TEXT_TERTIARY }}>Effective Type</span>
                            <span className="font-semibold" style={{ color: UI_CYAN }}>{stats.network.type.toUpperCase()}</span>
                          </div>
                          <div className="flex justify-between text-[9px]">
                            <span style={{ color: TEXT_TERTIARY }}>Downlink</span>
                            <span className="font-semibold" style={{ color: TEXT_PRIMARY }}>{stats.network.downlink} Mbps</span>
                          </div>
                          <div className="flex justify-between text-[9px]">
                            <span style={{ color: TEXT_TERTIARY }}>RTT</span>
                            <span className="font-semibold" style={{ color: TEXT_PRIMARY }}>{stats.network.rtt} ms</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between text-[9px]">
                          <span style={{ color: TEXT_TERTIARY }}>Network API</span>
                          <span style={{ color: TEXT_TERTIARY }}>Unavailable</span>
                        </div>
                      )}
                      <div className="my-1" style={{ borderTop: "1px solid rgba(6,182,212,0.12)" }} />
                      <div className="flex justify-between text-[9px]">
                        <span style={{ color: TEXT_TERTIARY }}>Screen</span>
                        <span className="font-semibold" style={{ color: TEXT_PRIMARY }}>{screen.width} × {screen.height}</span>
                      </div>
                      <div className="flex justify-between text-[9px]">
                        <span style={{ color: TEXT_TERTIARY }}>DPR</span>
                        <span className="font-semibold" style={{ color: TEXT_PRIMARY }}>{window.devicePixelRatio}x</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="px-5 py-3 flex items-center gap-2" style={{ borderTop: `1px solid ${BORDER}`, background: "rgba(247,247,245,0.60)" }}>
              <Monitor className="w-3 h-3 shrink-0" style={{ color: TEXT_TERTIARY }} />
              {isLoading ? (
                <Skeleton className="h-2 w-full max-w-sm" />
              ) : (
                <p className="text-[9px] font-mono truncate" style={{ color: TEXT_TERTIARY }}>
                  {navigator.userAgent.slice(0, 90)}…
                </p>
              )}
            </div>
          </div>

          {/* ── Dev Env + Tech Stack ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.80)", border: `1px solid ${BORDER}` }}>
              <div className="flex items-center gap-2 mb-4">
                <Monitor className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                <p className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>Development Environment</p>
              </div>
              <div className="space-y-2.5">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <Skeleton className="w-16 h-3" />
                      <Skeleton className="w-24 h-3" />
                    </div>
                  ))
                ) : (
                  [
                    { k: "Name",           v: profile.displayName },
                    { k: "Title",          v: profile.role        },
                    { k: "OS",             v: navigator.platform ?? "Unknown" },
                    { k: "CPU Cores",      v: `${navigator.hardwareConcurrency} logical` },
                    { k: "JDK",            v: "17.0.18+8 (LTS)"  },
                    { k: "Active Profile", v: "dev"               },
                  ].map(row => (
                    <div key={row.k} className="flex items-center justify-between gap-3">
                      <span className="text-[10px] shrink-0" style={{ color: TEXT_LABEL }}>{row.k}</span>
                      <span className="text-[10px] font-medium text-right truncate" style={{ color: TEXT_PRIMARY }}>{row.v}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Tech Stack */}
            <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.80)", border: `1px solid ${BORDER}` }}>
              <div className="flex items-center gap-2 mb-4">
                <Code2 className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                <p className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>Primary Tech Stack</p>
                {!isLoading && (
                  <button
                    onClick={() => setEditOpen(true)}
                    className="ml-auto flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full transition-all"
                    style={{ background: ACCENT_BG, color: ACCENT, border: `1px solid ${ACCENT_BORDER}` }}
                  >
                    <Plus className="w-2.5 h-2.5" /> 편집
                  </button>
                )}
              </div>
              
              {isLoading ? (
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} className="w-20 h-7 rounded-xl" />
                  ))}
                </div>
              ) : profile.techStack.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 gap-2">
                  <Code2 className="w-6 h-6" style={{ color: "rgba(65,67,27,0.20)" }} />
                  <p className="text-[10px]" style={{ color: TEXT_TERTIARY }}>기술 스택을 추가하세요</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {profile.techStack.map((tech, i) => (
                    <TechBadge key={i} name={tech.name} slug={tech.slug} variant={tech.variant} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── 최근 활동 ── */}
          <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.80)", border: `1px solid ${BORDER}` }}>
            <p className="text-xs font-semibold mb-4" style={{ color: TEXT_PRIMARY }}>Recent Activity</p>
            <div className="space-y-3">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="w-6 h-6 rounded-lg shrink-0 mt-0.5" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                ))
              ) : (
                recentActivities.length === 0 ? (
                  <div className="text-center py-4 text-xs" style={{ color: TEXT_TERTIARY }}>
                    최근 활동 내역이 없습니다.
                  </div>
                ) : (
                  recentActivities.map((a) => {
                    // API에서 주는 activityType에 따라 아이콘과 색상을 매핑합니다.
                    const isCommit = a.activityType === "COMMIT";
                    const isBot = a.activityType === "AI_ACTION";
                    const Icon = isCommit ? GitCommit : isBot ? Bot : Activity;
                    const iconColor = isCommit ? ACCENT : isBot ? "#5A8A4A" : TEXT_TERTIARY;

                    return (
                      <div key={a.activityId} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${iconColor}15` }}>
                          <Icon className="w-3 h-3" style={{ color: iconColor }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px]" style={{ color: TEXT_PRIMARY }}>
                            {a.title} {a.description && <span style={{ color: TEXT_SECONDARY }}>- {a.description}</span>}
                          </p>
                        </div>
                        <span className="text-[10px] shrink-0" style={{ color: TEXT_TERTIARY }}>
                          {new Date(a.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    );
                  })
                )
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── 프로필 편집 모달 ── */}
      {editOpen && !isLoading && (
        <ProfileEditModal
          profile={profile}
          onSave={handleProfileSave}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  );
}