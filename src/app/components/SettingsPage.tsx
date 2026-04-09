import { useState } from "react";
import { Settings, User, Bell, Monitor, Palette, Shield, Save, ChevronRight } from "lucide-react";
import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL, ACCENT,
  UI_GREEN, UI_GREEN_BG, UI_RED, UI_RED_BG, UI_AMBER, UI_AMBER_BG, UI_VIOLET, UI_VIOLET_BG, UI_INDIGO,
  GRADIENT_HEADER, BTN_DARK,
} from "../colors";

// 토글 스위치 컴포넌트
function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className="relative w-9 h-5 rounded-full transition-colors shrink-0"
      style={{ background: checked ? ACCENT : "rgba(0,0,0,0.12)" }}
    >
      <div
        className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all"
        style={{ left: checked ? "calc(100% - 1.125rem)" : "0.125rem" }}
      />
    </button>
  );
}

// 설정 행 컴포넌트
function SettingRow({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: `1px solid ${BORDER_SUBTLE}` }}>
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-xs font-medium" style={{ color: TEXT_PRIMARY }}>{label}</p>
        {sub && <p className="text-[10px] mt-0.5" style={{ color: TEXT_TERTIARY }}>{sub}</p>}
      </div>
      {children}
    </div>
  );
}

// 섹션 헤더 컴포넌트
function SectionCard({ icon: Icon, iconColor, iconBg, title, children }: {
  icon: any; iconColor: string; iconBg: string; title: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
      <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(247,247,245,0.8)" }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: iconBg }}>
          <Icon className="w-3.5 h-3.5" style={{ color: iconColor }} />
        </div>
        <p className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>{title}</p>
      </div>
      <div className="px-4 pb-1">{children}</div>
    </div>
  );
}

export function SettingsPage() {
  // 알림 토글 상태
  const [notifs, setNotifs] = useState({
    agentAlerts:      true,
    commitNotifs:     true,
    taskUpdates:      true,
    systemNotifs:     false,
    emailDigest:      false,
  });

  // 개발 환경 상태
  const [devSettings, setDevSettings] = useState({
    autoReload:   true,
    debugMode:    false,
    verboseLogs:  false,
  });

  // 테마 선택
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light");

  // 저장 피드백
  const [saved, setSaved] = useState(false);
  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleNotif = (key: keyof typeof notifs) =>
    setNotifs(prev => ({ ...prev, [key]: !prev[key] }));

  const toggleDev = (key: keyof typeof devSettings) =>
    setDevSettings(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* 배경 */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 20%, #e8d5f5 40%, #fce7f3 60%, #fde6d5 80%, #fef3c7 100%)" }} />
      <div className="absolute inset-0 pointer-events-none">
        <div style={{ position: "absolute", top: "-10%", left: "-5%", width: "45%", height: "45%", borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)", filter: "blur(50px)" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-5%", width: "50%", height: "50%", borderRadius: "50%", background: "radial-gradient(circle, rgba(251,191,122,0.12) 0%, transparent 70%)", filter: "blur(50px)" }} />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto p-5">
        <div className="max-w-2xl mx-auto space-y-4">

          {/* 헤더 + 저장 버튼 */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" style={{ color: TEXT_SECONDARY }} />
                <h1 className="text-base font-bold" style={{ color: TEXT_PRIMARY }}>Settings</h1>
              </div>
              <p className="text-[11px] mt-0.5" style={{ color: TEXT_TERTIARY }}>앱 환경 · 알림 · 개발 설정</p>
            </div>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{ background: saved ? "#10b981" : "#1c1c1e", color: "rgba(255,255,255,0.92)" }}
            >
              <Save className="w-3 h-3" />
              {saved ? "Saved!" : "Save changes"}
            </button>
          </div>

          {/* 프로필 정보 */}
          <SectionCard icon={User} iconColor={ACCENT} iconBg="rgba(99,91,255,0.10)" title="Profile">
            <SettingRow label="Display Name" sub="사이드바 및 댓글에 표시되는 이름">
              <input
                defaultValue="병권"
                className="px-2.5 py-1.5 text-xs rounded-lg outline-none text-right"
                style={{ background: "rgba(0,0,0,0.04)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY, width: 120 }}
              />
            </SettingRow>
            <SettingRow label="Email" sub="알림 수신 이메일">
              <input
                defaultValue="user@example.com"
                className="px-2.5 py-1.5 text-xs rounded-lg outline-none text-right"
                style={{ background: "rgba(0,0,0,0.04)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY, width: 160 }}
              />
            </SettingRow>
            <SettingRow label="Role / Title" sub="프로필 카드에 표시">
              <input
                defaultValue="Student Developer"
                className="px-2.5 py-1.5 text-xs rounded-lg outline-none text-right"
                style={{ background: "rgba(0,0,0,0.04)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY, width: 160 }}
              />
            </SettingRow>
            <div className="py-3">
              <p className="text-[10px] font-semibold mb-2" style={{ color: TEXT_LABEL }}>Organization</p>
              <div
                className="px-3 py-2 rounded-xl text-xs"
                style={{ background: "rgba(99,91,255,0.06)", border: "1px solid rgba(99,91,255,0.12)", color: ACCENT }}
              >
                WE&amp;AI Project Office
              </div>
            </div>
          </SectionCard>

          {/* 알림 설정 */}
          <SectionCard icon={Bell} iconColor="#f59e0b" iconBg="rgba(245,158,11,0.10)" title="Notifications">
            {[
              { key: "agentAlerts" as const,  label: "Agent Alerts",        sub: "에이전트 오류 및 상태 변경 알림"      },
              { key: "commitNotifs" as const,  label: "Commit Notifications",sub: "Git 커밋 및 PR 병합 알림"           },
              { key: "taskUpdates" as const,   label: "Task Updates",        sub: "작업 할당 및 상태 변경 알림"         },
              { key: "systemNotifs" as const,  label: "System Notifications",sub: "서버 재시작, 빌드 완료 알림"         },
              { key: "emailDigest" as const,   label: "Daily Email Digest",  sub: "하루 요약 이메일 (매일 오전 9시)"    },
            ].map(n => (
              <SettingRow key={n.key} label={n.label} sub={n.sub}>
                <Toggle checked={notifs[n.key]} onChange={() => toggleNotif(n.key)} />
              </SettingRow>
            ))}
            <div className="py-2" />
          </SectionCard>

          {/* 개발 환경 */}
          <SectionCard icon={Monitor} iconColor="#10b981" iconBg="rgba(16,185,129,0.10)" title="Development Environment">
            {/* 읽기 전용 환경 정보 */}
            <div className="py-3 space-y-2" style={{ borderBottom: `1px solid ${BORDER_SUBTLE}` }}>
              {[
                { k: "OS",             v: "Windows 11 Pro"          },
                { k: "JDK",            v: "17.0.18+8 (LTS)"         },
                { k: "Gradle",         v: "8.7"                     },
                { k: "Active Profile", v: "$env:SPRING_PROFILES_ACTIVE = 'dev'" },
              ].map(r => (
                <div key={r.k} className="flex items-center justify-between">
                  <span className="text-[10px]" style={{ color: TEXT_LABEL }}>{r.k}</span>
                  <span className="text-[10px] font-mono" style={{ color: TEXT_PRIMARY }}>{r.v}</span>
                </div>
              ))}
            </div>
            {[
              { key: "autoReload" as const,  label: "Auto Reload on Save",  sub: "파일 저장 시 Spring Boot 자동 재시작" },
              { key: "debugMode" as const,   label: "Debug Mode",           sub: "DEBUG 레벨 로그 출력 활성화"         },
              { key: "verboseLogs" as const, label: "Verbose Agent Logs",   sub: "에이전트 간 모든 메시지 로그 출력"   },
            ].map(d => (
              <SettingRow key={d.key} label={d.label} sub={d.sub}>
                <Toggle checked={devSettings[d.key]} onChange={() => toggleDev(d.key)} />
              </SettingRow>
            ))}
            <div className="py-2" />
          </SectionCard>

          {/* 외관 설정 */}
          <SectionCard icon={Palette} iconColor="#8b5cf6" iconBg="rgba(139,92,246,0.10)" title="Appearance">
            <div className="py-4">
              <p className="text-[10px] font-semibold mb-3" style={{ color: TEXT_LABEL }}>Theme</p>
              <div className="flex items-center gap-2">
                {(["light", "dark", "system"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold capitalize transition-all"
                    style={{
                      background: theme === t
                        ? "linear-gradient(135deg, rgba(224,231,255,0.8), rgba(232,213,245,0.6))"
                        : "rgba(0,0,0,0.04)",
                      color: theme === t ? ACCENT : TEXT_SECONDARY,
                      border: theme === t ? "1px solid rgba(99,91,255,0.2)" : `1px solid ${BORDER}`,
                    }}
                  >
                    {t === "light" ? "☀️ Light" : t === "dark" ? "🌙 Dark" : "💻 System"}
                  </button>
                ))}
              </div>
            </div>
            <SettingRow label="Color Theme" sub="앱 강조 색상 (현재: Indigo-Lavender)">
              <div className="flex items-center gap-1.5">
                {["#635bff", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"].map(c => (
                  <div
                    key={c}
                    className="w-5 h-5 rounded-full cursor-pointer transition-all hover:scale-110"
                    style={{ background: c, outline: c === "#635bff" ? `2px solid ${c}` : "none", outlineOffset: 1 }}
                  />
                ))}
              </div>
            </SettingRow>
            <div className="py-2" />
          </SectionCard>

          {/* 보안 섹션 */}
          <SectionCard icon={Shield} iconColor="#ef4444" iconBg="rgba(239,68,68,0.10)" title="Security">
            {[
              { label: "Change Password",     sub: "마지막 변경: 30일 전"           },
              { label: "Two-Factor Auth",     sub: "현재 비활성화됨"               },
              { label: "Active Sessions",     sub: "1개의 활성 세션"               },
            ].map((item, i, arr) => (
              <div
                key={item.label}
                className="flex items-center justify-between py-3 cursor-pointer group"
                style={{ borderBottom: i < arr.length - 1 ? `1px solid ${BORDER_SUBTLE}` : "none" }}
              >
                <div>
                  <p className="text-xs font-medium" style={{ color: TEXT_PRIMARY }}>{item.label}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: TEXT_TERTIARY }}>{item.sub}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" style={{ color: TEXT_SECONDARY }} />
              </div>
            ))}
            <div className="py-2" />
          </SectionCard>

        </div>
      </div>
    </div>
  );
}