import { useState } from "react";
import {
  Settings, Users, Layers, Plus, Trash2, Save,
  CheckCircle2, Edit2, X, Crown, User as UserIcon,
  Globe, Calendar, GitBranch, Hash,
} from "lucide-react";
import {
  loadSettings, saveSettings,
  ProjectSettings, TeamMember, TechItem,
  MemberRole, Department,
  DEPT_COLORS, ROLE_COLORS, TECH_CATEGORY_COLOR,
  genMemberId,
} from "../data/projectSettingsStore";

// ── 디자인 토큰 (colors.ts 팔레트 기준) ──
import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL,
  ACCENT, ACCENT_BG, ACCENT_BORDER, ACCENT_MID,
  BRIGHT_BEIGE, CREAM, PANEL_BG, CONTENT_BG,
  GRADIENT_PAGE, GRADIENT_BANNER, STATUS_ERROR,
} from "../colors";

const DEPARTMENTS: Department[] = ["Backend", "Frontend", "Agent", "DevOps", "Design", "QA"];
const ROLES: MemberRole[] = ["파트장", "파트원", "게스트"];
const TECH_CATEGORIES = ["Backend", "Frontend", "DevOps", "Agent"];

// ── 인풋 컴포넌트 ──
function Field({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_LABEL }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl text-xs outline-none transition-all"
        style={{
          background: "rgba(255,255,255,0.85)",
          border: `1px solid ${BORDER}`,
          color: TEXT_PRIMARY,
        }}
        onFocus={e => (e.currentTarget.style.borderColor = ACCENT + "50")}
        onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
      />
    </div>
  );
}

// ── 멤버 행 ──
function MemberRow({
  member, onEdit, onDelete, onClick,  //추가
}: {
  member: TeamMember;
  onEdit: (m: TeamMember) => void;
  onDelete: (id: string) => void;
  onClick: (m: TeamMember) => void;  //추가
}) {
  const dc = DEPT_COLORS[member.department];
  const rc = ROLE_COLORS[member.role];

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 transition-all"
      style={{ borderBottom: `1px solid ${BORDER_SUBTLE}`, cursor: "pointer" }}  //추가
      onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.015)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      onClick={() => onClick(member)}  // 추가 
    >
      {/* 아바타 */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{ background: "rgba(65,67,27,0.10)" }}
      >
        <span className="text-[11px] font-bold" style={{ color: ACCENT }}>{member.avatar}</span>
      </div>

      {/* 이름 + 이메일 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-semibold" style={{ color: TEXT_PRIMARY }}>{member.name}</p>
          {member.role === "파트장" && (
            <Crown className="w-3 h-3 shrink-0" style={{ color: "#f59e0b" }} />
          )}
          {/* 온라인 상태 */}
          <div
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: member.isOnline ? "#10b981" : "#d1d5db" }}
          />
        </div>
        <p className="text-[9px]" style={{ color: TEXT_TERTIARY }}>{member.email}</p>
      </div>

      {/* 부서 뱃지 */}
      <span
        className="text-[9px] font-semibold px-2 py-0.5 rounded-full shrink-0"
        style={{ background: dc.bg, color: dc.color }}
      >
        {member.department}
      </span>

      {/* 역할 뱃지 */}
      <span
        className="text-[9px] font-semibold px-2 py-0.5 rounded-full shrink-0"
        style={{ background: rc.bg, color: rc.color }}
      >
        {member.role}
      </span>

      {/* 액션 버튼 */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          className="p-1.5 rounded-lg transition-all hover:bg-black/[0.06]"
          title="편집"
          onClick={(e) => {
            e.stopPropagation(); //onClick 호출 방지
            onEdit(member);
          }}
        >
          <Edit2 className="w-3 h-3" style={{ color: TEXT_TERTIARY }} />
        </button>
        <button
          className="p-1.5 rounded-lg transition-all hover:bg-black/[0.06]"
          title="삭제"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation(); // 부모 div의 onClick 뜨는 것을 막음
            onDelete(member.id);
          }}
        >
          <Trash2 className="w-3 h-3" style={{ color: "#ef4444" }} />
        </button>
      </div>
    </div >
  );
}

// ── 멤버 추가/편집 모달 ──
function MemberModal({
  member, onSave, onClose,
}: {
  member: Partial<TeamMember> | null;
  onSave: (m: TeamMember) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<TeamMember>>(
    member ?? { role: "파트원", department: "Backend", isOnline: true, joinedAt: new Date().toISOString().slice(0, 10) }
  );
  
  const isEdit = !!form.id;
  const set = (k: keyof TeamMember, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.name?.trim() || !form.email?.trim()) return;
    onSave({
      id: form.id ?? genMemberId(),
      name: form.name!.trim(),
      email: form.email!.trim(),
      avatar: form.name!.trim()[0],
      role: (form.role as MemberRole) ?? "파트원",
      department: (form.department as Department) ?? "Backend",
      joinedAt: form.joinedAt ?? new Date().toISOString().slice(0, 10),
      isOnline: form.isOnline ?? false,
    });
  };

  return (
    <div
      className="absolute inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 "
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        // 모달 틀 크기를 상세 모달과 동일하게 고정
        className="bg-white p-4 rounded-[20px] shadow-2xl max-w-[320px] w-full relative flex flex-col"
        style={{ maxHeight: "90%" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5 shrink-0">
          <h3 className="font-bold text-sm" style={{ color: TEXT_PRIMARY }}>
            {isEdit ? "멤버 편집" : "멤버 추가"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-black/5 rounded-full transition-colors"
          >
            <X className="w-4 h-4" style={{ color: TEXT_TERTIARY }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          <div className="space-y-4">
            {/* 이름 필드: 편집 시 테두리 제거 */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_LABEL }}>이름</label>
              {isEdit ? (
                <div className="px-1 py-1 text-sm font-medium" style={{ color: TEXT_PRIMARY }}>
                  {form.name}
                </div>
              ) : (
                <Field value={form.name ?? ""} onChange={v => set("name", v)} placeholder="홍길동" label="" />
              )}
            </div>

            {/* 이메일 필드: 편집 시 테두리 제거 */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_LABEL }}>이메일</label>
              {isEdit ? (
                <div className="px-1 py-1 text-sm font-medium" style={{ color: TEXT_SECONDARY }}>
                  {form.email}
                </div>
              ) : (
                <Field value={form.email ?? ""} onChange={v => set("email", v)} placeholder="user@weai.dev" label="" />
              )}
            </div>
          </div>

          {/* 부서 선택: 기존 그리드 디자인 유지 */}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_LABEL }}>부서</label>
            <div className="grid grid-cols-3 gap-1.5">
              {DEPARTMENTS.map(d => {
                const dc = DEPT_COLORS[d];
                const sel = form.department === d;
                return (
                  <button
                    key={d}
                    onClick={() => set("department", d)}
                    className="py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                    style={{
                      background: sel ? dc.bg : "rgba(0,0,0,0.04)",
                      color: sel ? dc.color : TEXT_TERTIARY,
                      border: `1px solid ${sel ? dc.color + "40" : "transparent"}`,
                    }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 역할 선택: 기존 가로 나열 디자인 유지 */}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_LABEL }}>역할</label>
            <div className="flex gap-1.5">
              {ROLES.map(r => {
                const rc = ROLE_COLORS[r];
                const sel = form.role === r;
                return (
                  <button
                    key={r}
                    onClick={() => set("role", r)}
                    className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all flex items-center justify-center gap-1"
                    style={{
                      background: sel ? rc.bg : "rgba(0,0,0,0.04)",
                      color: sel ? rc.color : TEXT_TERTIARY,
                      border: `1px solid ${sel ? rc.color + "40" : "transparent"}`,
                    }}
                  >
                    {r === "파트장" && <Crown className="w-2.5 h-2.5" />}
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-[10px] font-semibold" style={{ color: TEXT_LABEL }}>온라인 상태</span>
            <button
              onClick={() => set("isOnline", !form.isOnline)}
              className="w-8 h-4.5 rounded-full transition-all relative"
              style={{ background: form.isOnline ? "#10b981" : "rgba(0,0,0,0.15)" }}
            >
              <div
                className="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all"
                style={{ left: form.isOnline ? "calc(100% - 16px)" : "2px" }}
              />
            </button>
          </div>
        </div>

        <div className="flex gap-2 mt-6 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl text-[11px] font-bold"
            style={{ background: "rgba(0,0,0,0.06)", color: TEXT_SECONDARY }}
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!form.name?.trim() || !form.email?.trim()}
            className="flex-1 py-3 rounded-2xl text-[11px] font-bold transition-all active:scale-[0.98]"
            style={{
              background: form.name?.trim() ? ACCENT : "rgba(0,0,0,0.07)",
              color: form.name?.trim() ? "white" : TEXT_TERTIARY,
            }}
          >
            저장하기
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 기술 스택 행 ──
function TechRow({
  item, onVersionChange, onDelete,
}: {
  item: TechItem;
  onVersionChange: (id: string, v: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.version);
  const color = TECH_CATEGORY_COLOR[item.category] ?? ACCENT;

  const save = () => {
    onVersionChange(item.id, draft);
    setEditing(false);
  };

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 transition-all"
      style={{ borderBottom: `1px solid ${BORDER_SUBTLE}` }}
      onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.015)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
      <span className="text-lg shrink-0 w-6 text-center">{item.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold" style={{ color: TEXT_PRIMARY }}>{item.name}</p>
        <p className="text-[9px]" style={{ color: TEXT_TERTIARY }}>{item.category}</p>
      </div>

      {item.required && (
        <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: ACCENT_BG, color: ACCENT }}>
          필수
        </span>
      )}

      {/* 버전 편집 */}
      {editing ? (
        <div className="flex items-center gap-1 shrink-0">
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
            className="w-24 px-2 py-1 rounded-lg text-[10px] outline-none font-mono"
            style={{
              background: "rgba(255,255,255,0.90)",
              border: `1px solid ${ACCENT}50`,
              color: TEXT_PRIMARY,
            }}
          />
          <button onClick={save} className="p-1 rounded-lg hover:bg-green-50">
            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#10b981" }} />
          </button>
          <button onClick={() => setEditing(false)} className="p-1 rounded-lg hover:bg-black/[0.05]">
            <X className="w-3.5 h-3.5" style={{ color: TEXT_TERTIARY }} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => { setDraft(item.version); setEditing(true); }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all group hover:bg-black/[0.04] shrink-0"
        >
          <span className="text-[10px] font-mono" style={{ color }}>{item.version}</span>
          <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100" style={{ color: TEXT_TERTIARY }} />
        </button>
      )}

      <button
        onClick={() => onDelete(item.id)}
        className="p-1.5 rounded-lg transition-all hover:bg-red-50 shrink-0"
      >
        <Trash2 className="w-3 h-3" style={{ color: "#ef4444" }} />
      </button>
    </div>
  );
}

// ══════════════════════════════════════════
// 메인 ProjectSettingsPage
// ══════════════════════════════════════════
export function ProjectSettingsPage() {
  const [settings, setSettings] = useState<ProjectSettings>(() => loadSettings());
  const [activeTab, setActiveTab] = useState<"info" | "team" | "tech">("info");
  const [saved, setSaved] = useState(false);
  const [editMember, setEditMember] = useState<Partial<TeamMember> | null | "new">(null);
  const [deptFilter, setDeptFilter] = useState<Department | "all">("all");
  const [techCatFilter, setTechCatFilter] = useState<string>("all");

  //모달
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);


  // ── 저장 ──
  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const updateInfo = (key: keyof ProjectSettings, val: string) => {
    setSettings(s => ({ ...s, [key]: val }));
  };

  // ── 멤버 CRUD ──
  const handleSaveMember = (m: TeamMember) => {
    setSettings(s => ({
      ...s,
      members: s.members.some(x => x.id === m.id)
        ? s.members.map(x => x.id === m.id ? m : x)
        : [...s.members, m],
    }));
    setEditMember(null);
  };
  const handleDeleteMember = (id: string) => {
    setMemberToDelete(id);
  };

  //추가
  const confirmDelete = () => {
    if (memberToDelete) {
      setSettings(s => ({
        ...s,
        members: s.members.filter(m => m.id !== memberToDelete)
      }));
      setMemberToDelete(null);
    }
  };

  // ── 기술 스택 CRUD ──
  const handleVersionChange = (id: string, v: string) => {
    setSettings(s => ({ ...s, techStack: s.techStack.map(t => t.id === id ? { ...t, version: v } : t) }));
  };
  const handleDeleteTech = (id: string) => {
    setSettings(s => ({ ...s, techStack: s.techStack.filter(t => t.id !== id) }));
  };

  // ── 필터링 ──
  const filteredMembers = deptFilter === "all"
    ? settings.members
    : settings.members.filter(m => m.department === deptFilter);

  const filteredTech = techCatFilter === "all"
    ? settings.techStack
    : settings.techStack.filter(t => t.category === techCatFilter);

  // ── 부서별 통계 ──
  const deptStats = DEPARTMENTS.map(d => ({
    dept: d,
    count: settings.members.filter(m => m.department === d).length,
    leader: settings.members.find(m => m.department === d && m.role === "파트장"),
    color: DEPT_COLORS[d],
  }));

  const tabs = [
    { id: "info", icon: Settings, label: "프로젝트 정보" },
    { id: "team", icon: Users, label: "팀 구성" },
    { id: "tech", icon: Layers, label: "기술 스택" },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* 배경 */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: GRADIENT_PAGE }} />
      <div className="absolute inset-0 pointer-events-none">
        <div style={{ position: "absolute", top: "-10%", left: "-5%", width: "45%", height: "45%", borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)", filter: "blur(50px)" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-5%", width: "50%", height: "50%", borderRadius: "50%", background: "radial-gradient(circle, rgba(251,191,122,0.12) 0%, transparent 70%)", filter: "blur(50px)" }} />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto p-5">
        <div className="max-w-3xl mx-auto space-y-4">

          {/* ── 헤더 ── */}
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Settings className="w-4 h-4" style={{ color: ACCENT }} />
                <h1 className="text-base font-bold" style={{ color: TEXT_PRIMARY }}>Project Settings</h1>
              </div>
              <p className="text-[11px]" style={{ color: TEXT_TERTIARY }}>팀 구성, 기술 스택, 프로젝트 정보를 관리합니다</p>
            </div>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: saved
                  ? "rgba(16,185,129,0.10)"
                  : ACCENT,
                color: saved ? "#10b981" : "rgba(255,255,255,0.95)",
                boxShadow: saved ? "none" : "0 4px 14px rgba(65,67,27,0.28)",
              }}
            >
              {saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              {saved ? "저장됨!" : "저장"}
            </button>
          </div>

          {/* ── 탭 ── */}
          <div
            className="flex rounded-2xl overflow-hidden p-1 gap-1"
            style={{ background: "rgba(255,255,255,0.65)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}
          >
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: activeTab === tab.id
                    ? "rgba(65,67,27,0.08)"
                    : "transparent",
                  color: activeTab === tab.id ? ACCENT : TEXT_SECONDARY,
                  boxShadow: activeTab === tab.id ? "0 2px 8px rgba(65,67,27,0.12)" : "none",
                }}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* ════ 프로젝트 정보 탭 ════ */}
          {activeTab === "info" && (
            <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.85)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
              <div className="px-5 py-4" style={{ borderBottom: `1px solid ${BORDER_SUBTLE}`, background: "rgba(247,247,245,0.8)" }}>
                <p className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>프로젝트 기본 정보</p>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Field
                    label="프로젝트명"
                    value={settings.projectName}
                    onChange={v => updateInfo("projectName", v)}
                    placeholder="WE&AI Enterprise"
                  />
                </div>
                <div className="col-span-2">
                  <Field
                    label="설명"
                    value={settings.description}
                    onChange={v => updateInfo("description", v)}
                    placeholder="프로젝트 설명"
                  />
                </div>
                <Field
                  label="시작일"
                  value={settings.startDate}
                  onChange={v => updateInfo("startDate", v)}
                  type="date"
                />
                <Field
                  label="목표 완료일"
                  value={settings.targetDate}
                  onChange={v => updateInfo("targetDate", v)}
                  type="date"
                />
                <div className="col-span-2">
                  <Field
                    label="저장소 URL"
                    value={settings.repository}
                    onChange={v => updateInfo("repository", v)}
                    placeholder="https://github.com/org/repo"
                  />
                </div>

                {/* 요약 카드 */}
                <div className="col-span-2 grid grid-cols-3 gap-3 mt-2">
                  {[
                    { icon: Users, label: "팀원", value: `${settings.members.length}명` },
                    { icon: Layers, label: "기술 스택", value: `${settings.techStack.length}개` },
                    {
                      icon: Calendar, label: "남은 기간", value: (() => {
                        const diff = new Date(settings.targetDate).getTime() - Date.now();
                        const days = Math.max(0, Math.floor(diff / 86400000));
                        return `${days}일`;
                      })()
                    },
                  ].map(c => (
                    <div
                      key={c.label}
                      className="rounded-xl p-3.5 flex flex-col gap-1.5"
                      style={{ background: "rgba(99,91,255,0.05)", border: `1px solid rgba(99,91,255,0.10)` }}
                    >
                      <c.icon className="w-4 h-4" style={{ color: ACCENT }} />
                      <p className="text-lg font-bold" style={{ color: ACCENT }}>{c.value}</p>
                      <p className="text-[9px]" style={{ color: TEXT_LABEL }}>{c.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════ 팀 구성 탭 ════ */}
          {activeTab === "team" && (
            <div className="space-y-4">
              {/* 부서별 요약 카드 */}
              <div className="grid grid-cols-3 gap-2.5">
                {deptStats.filter(d => d.count > 0 || d.dept === "Backend" || d.dept === "Frontend").slice(0, 6).map(d => (
                  <button
                    key={d.dept}
                    onClick={() => setDeptFilter(prev => prev === d.dept ? "all" : d.dept)}
                    className="rounded-xl p-3 text-left transition-all"
                    style={{
                      background: deptFilter === d.dept ? d.color.bg : "rgba(255,255,255,0.80)",
                      border: `1px solid ${deptFilter === d.dept ? d.color.color + "40" : BORDER}`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: deptFilter === d.dept ? d.color.color : TEXT_LABEL }}>
                        {d.dept}
                      </span>
                      <span className="text-base font-bold" style={{ color: d.color.color }}>{d.count}</span>
                    </div>
                    {d.leader && (
                      <div className="flex items-center gap-1">
                        <Crown className="w-2.5 h-2.5" style={{ color: "#f59e0b" }} />
                        <span className="text-[9px]" style={{ color: TEXT_SECONDARY }}>{d.leader.name}</span>
                      </div>
                    )}
                    {!d.leader && d.count === 0 && (
                      <p className="text-[9px]" style={{ color: TEXT_TERTIARY }}>미배정</p>
                    )}
                  </button>
                ))}
              </div>

              {/* 멤버 목록 */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: "rgba(255,255,255,0.85)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)", minHeight: "441px" }}>
                <div
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: `1px solid ${BORDER_SUBTLE}`, background: "rgba(247,247,245,0.8)" }}
                >
                  <Users className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                  <p className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>
                    팀 멤버
                    {deptFilter !== "all" && (
                      <span className="ml-1.5 text-[10px]" style={{ color: DEPT_COLORS[deptFilter].color }}>
                        — {deptFilter}
                      </span>
                    )}
                  </p>
                  <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full" style={{ background: ACCENT_BG, color: ACCENT }}>
                    {filteredMembers.length}명
                  </span>
                  <button
                    onClick={() => setEditMember("new")}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                    style={{ background: ACCENT_BG, color: ACCENT, border: `1px solid ${ACCENT_BORDER}` }}
                  >
                    <Plus className="w-3 h-3" /> 멤버 추가
                  </button>
                </div>

                {/* 부서 필터 알약 */}
                <div
                  className="flex gap-1.5 px-4 py-2.5 overflow-x-auto"
                  style={{ borderBottom: `1px solid ${BORDER_SUBTLE}`, background: "rgba(250,250,250,0.6)" }}
                >
                  <button
                    onClick={() => setDeptFilter("all")}
                    className="text-[9px] font-semibold px-2.5 py-1 rounded-full transition-all shrink-0"
                    style={{
                      background: deptFilter === "all" ? ACCENT : "rgba(0,0,0,0.05)",
                      color: deptFilter === "all" ? "white" : TEXT_SECONDARY,
                    }}
                  >
                    전체
                  </button>
                  {DEPARTMENTS.map(d => {
                    const dc = DEPT_COLORS[d];
                    return (
                      <button
                        key={d}
                        onClick={() => setDeptFilter(d)}
                        className="text-[9px] font-semibold px-2.5 py-1 rounded-full transition-all shrink-0"
                        style={{
                          background: deptFilter === d ? dc.bg : "rgba(0,0,0,0.04)",
                          color: deptFilter === d ? dc.color : TEXT_TERTIARY,
                          border: deptFilter === d ? `1px solid ${dc.color}40` : "1px solid transparent",
                        }}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>

                <div>  {/* 모달 */}
                  {filteredMembers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10">
                      <p className="text-[11px]" style={{ color: TEXT_TERTIARY }}>이 부서에 멤버가 없습니다</p>
                    </div>
                  ) : (
                    filteredMembers.map(m => (
                      <MemberRow
                        key={m.id}
                        member={m}
                        onEdit={m => setEditMember(m)}
                        onDelete={handleDeleteMember}
                        onClick={(m) => setSelectedMember(m)}  //추가
                      />
                    ))
                  )}

                  {/* 멤버 모달 */}
                  {editMember !== null && (
                    <MemberModal
                      member={editMember === "new" ? null : editMember}
                      onSave={handleSaveMember}
                      onClose={() => setEditMember(null)}
                    />
                  )}

                  {/* ── 멤버 상세 정보 모달 ── */}
                  {selectedMember && (
                    <div
                      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 "
                      onClick={() => setSelectedMember(null)}
                    >
                      <div
                        className="bg-white p-4 rounded-[20px] shadow-2xl max-w-[320px] w-full relative"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="font-bold text-sm" style={{ color: TEXT_PRIMARY }}>
                            멤버 상세 정보 </h3>
                          <button
                            onClick={() => setSelectedMember(null)}
                            className="p-1 hover:bg-black/5 rounded-full transition-colors"
                          >
                            <X className="w-4 h-4" style={{ color: TEXT_TERTIARY }} />
                          </button>
                        </div>

                        {/* 프로필 섹션 */}
                        <div className="flex flex-col items-center mb-7">
                          <div
                            className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold mb-3 shadow-inner"
                            style={{
                              backgroundColor: 'rgba(65,67,27,0.08)',
                              color: ACCENT
                            }}
                          >
                            {selectedMember.avatar || selectedMember.name?.charAt(0)}
                          </div>
                          <h4 className="font-bold text-base" style={{ color: TEXT_PRIMARY }}>
                            {selectedMember.name}
                          </h4>
                          <p className="text-[11px] mt-0.5" style={{ color: TEXT_TERTIARY }}>
                            {selectedMember.email}
                          </p>
                        </div>

                        {/* 정보 리스트 */}
                        <div className="space-y-3 mb-8 px-1">
                          <div className="flex justify-between items-center pb-2.5" style={{ borderBottom: `1px solid ${BORDER_SUBTLE}` }}>
                            <span className="text-[10px] font-semibold" style={{ color: TEXT_LABEL }}>부서</span>
                            <span
                              className="px-2.5 py-0.5 rounded-full text-[9px] font-bold"
                              style={{
                                backgroundColor: DEPT_COLORS[selectedMember.department as Department].bg,
                                color: DEPT_COLORS[selectedMember.department as Department].color
                              }}
                            >
                              {selectedMember.department}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pb-2.5" style={{ borderBottom: `1px solid ${BORDER_SUBTLE}` }}>
                            <span className="text-[10px] font-semibold" style={{ color: TEXT_LABEL }}>역할</span>
                            <span
                              className="px-2.5 py-0.5 rounded-full text-[9px] font-bold"
                              style={{
                                backgroundColor: ROLE_COLORS[selectedMember.role as MemberRole].bg,
                                color: ROLE_COLORS[selectedMember.role as MemberRole].color
                              }}
                            >
                              {selectedMember.role}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-semibold" style={{ color: TEXT_LABEL }}>합류일</span>
                            <span className="text-[11px] font-medium" style={{ color: TEXT_SECONDARY }}>
                              {selectedMember.joinedAt}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedMember(null)}
                          className="w-full py-3.5 rounded-2xl text-[12px] font-bold transition-all active:scale-[0.98]"
                          style={{ background: "rgba(0,0,0,0.06)", color: TEXT_SECONDARY }}
                        >
                          닫기
                        </button>
                      </div>
                    </div>
                  )}

                  {memberToDelete && (
                    <div
                      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 "
                      onClick={() => setMemberToDelete(null)}
                    >
                      <div
                        className="bg-white p-8 rounded-[32px] shadow-2xl max-w-sm w-full relative text-center"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                          <Trash2 className="w-7 h-7 text-red-500" />
                        </div>
                        <h3 className="font-bold text-lg mb-2" style={{ color: TEXT_PRIMARY }}>정말 삭제할까요?</h3>
                        <p className="text-sm mb-8 leading-relaxed" style={{ color: TEXT_TERTIARY }}>
                          해당 멤버를 팀에서 삭제하며,<br />이 작업은 되돌릴 수 없습니다.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setMemberToDelete(null)}
                            className="flex-1 py-4 rounded-2xl text-[13px] font-bold"
                            style={{ background: "rgba(0,0,0,0.06)", color: TEXT_SECONDARY }}
                          >
                            취소
                          </button>
                          <button
                            onClick={confirmDelete}
                            className="flex-1 py-4 rounded-2xl text-[13px] font-bold text-white bg-red-500 transition-all active:scale-[0.98]"
                          >
                            삭제하기
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ════ 기술 스택 탭 ════ */}
          {activeTab === "tech" && (
            <div className="space-y-4">
              {/* 카테고리별 통계 */}
              <div className="grid grid-cols-4 gap-2.5">
                {TECH_CATEGORIES.map(cat => {
                  const count = settings.techStack.filter(t => t.category === cat).length;
                  const color = TECH_CATEGORY_COLOR[cat] ?? ACCENT;
                  return (
                    <button
                      key={cat}
                      onClick={() => setTechCatFilter(prev => prev === cat ? "all" : cat)}
                      className="rounded-xl p-3 text-left transition-all"
                      style={{
                        background: techCatFilter === cat ? `${color}12` : "rgba(255,255,255,0.80)",
                        border: `1px solid ${techCatFilter === cat ? color + "40" : BORDER}`,
                      }}
                    >
                      <p className="text-xl font-bold mb-0.5" style={{ color }}>{count}</p>
                      <p className="text-[9px] font-semibold" style={{ color: TEXT_LABEL }}>{cat}</p>
                    </button>
                  );
                })}
              </div>

              {/* 기술 스택 목록 */}
              <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.85)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
                <div
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: `1px solid ${BORDER_SUBTLE}`, background: "rgba(247,247,245,0.8)" }}
                >
                  <Layers className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                  <p className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>기술 스택 & 버전</p>
                  <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full" style={{ background: ACCENT_BG, color: ACCENT }}>
                    {filteredTech.length}개
                  </span>
                </div>

                {/* 카테고리 필터 */}
                <div
                  className="flex gap-1.5 px-4 py-2.5 overflow-x-auto"
                  style={{ borderBottom: `1px solid ${BORDER_SUBTLE}`, background: "rgba(250,250,250,0.6)" }}
                >
                  <button
                    onClick={() => setTechCatFilter("all")}
                    className="text-[9px] font-semibold px-2.5 py-1 rounded-full transition-all shrink-0"
                    style={{ background: techCatFilter === "all" ? ACCENT : "rgba(0,0,0,0.05)", color: techCatFilter === "all" ? "white" : TEXT_SECONDARY }}
                  >
                    전체
                  </button>
                  {TECH_CATEGORIES.map(cat => {
                    const color = TECH_CATEGORY_COLOR[cat] ?? ACCENT;
                    return (
                      <button
                        key={cat}
                        onClick={() => setTechCatFilter(cat)}
                        className="text-[9px] font-semibold px-2.5 py-1 rounded-full transition-all shrink-0"
                        style={{
                          background: techCatFilter === cat ? `${color}15` : "rgba(0,0,0,0.04)",
                          color: techCatFilter === cat ? color : TEXT_TERTIARY,
                          border: techCatFilter === cat ? `1px solid ${color}40` : "1px solid transparent",
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>

                {/* 기술 항목들 */}
                <div>
                  {filteredTech.length === 0 ? (
                    <div className="flex items-center justify-center py-10">
                      <p className="text-[11px]" style={{ color: TEXT_TERTIARY }}>항목 없음</p>
                    </div>
                  ) : (
                    filteredTech.map(item => (
                      <TechRow
                        key={item.id}
                        item={item}
                        onVersionChange={handleVersionChange}
                        onDelete={handleDeleteTech}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}