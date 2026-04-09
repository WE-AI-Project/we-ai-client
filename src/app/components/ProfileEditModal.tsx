import { useState, useEffect, useRef } from "react";
import {
  X, User, Mail, MapPin, Code2, Briefcase, FileText,
  Save, Palette, Search, CheckCircle2, ChevronDown,
} from "lucide-react";
import {
  ProfileData,
  TechEntry,
  AVATAR_GRADIENTS,
  saveProfile,
} from "../data/profileStore";
import {
  DEVICONS, DEVICON_CATEGORIES, DevIcon, deviconUrl,
} from "../data/devicons";
import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL,
  ACCENT, ACCENT_BG, ACCENT_BORDER,
} from "../colors";

type Props = {
  profile:  ProfileData;
  onSave:   (p: ProfileData) => void;
  onClose:  () => void;
};

// ── 인풋 필드 ──
function Field({
  label, icon: Icon, value, onChange, placeholder, type = "text",
}: {
  label: string; icon: any; value: string;
  onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: TEXT_LABEL }}>
        <Icon className="w-3 h-3" />
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl text-xs outline-none transition-all"
        style={{
          background: "rgba(0,0,0,0.03)",
          border: `1px solid ${BORDER}`,
          color: TEXT_PRIMARY,
        }}
        onFocus={e => (e.currentTarget.style.borderColor = ACCENT + "60")}
        onBlur={e  => (e.currentTarget.style.borderColor = BORDER)}
      />
    </div>
  );
}

// ── 텍스트에리어 ──
function TextAreaField({
  label, icon: Icon, value, onChange, placeholder,
}: {
  label: string; icon: any; value: string;
  onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: TEXT_LABEL }}>
        <Icon className="w-3 h-3" />
        {label}
      </label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full px-3 py-2 rounded-xl text-xs outline-none transition-all resize-none"
        style={{
          background: "rgba(0,0,0,0.03)",
          border: `1px solid ${BORDER}`,
          color: TEXT_PRIMARY,
        }}
        onFocus={e => (e.currentTarget.style.borderColor = ACCENT + "60")}
        onBlur={e  => (e.currentTarget.style.borderColor = BORDER)}
      />
    </div>
  );
}

// ── Devicon 아이콘 이미지 (실패 시 fallback) ──
function DeviconImg({ slug, variant, size = 20 }: { slug: string; variant: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (!slug || err) {
    return <Code2 style={{ width: size, height: size, color: ACCENT }} />;
  }
  return (
    <img
      src={deviconUrl(slug, variant)}
      alt={slug}
      width={size}
      height={size}
      onError={() => setErr(true)}
      style={{ objectFit: "contain" }}
    />
  );
}

// ── 메인 ProfileEditModal ──
export function ProfileEditModal({ profile, onSave, onClose }: Props) {
  const [form,      setForm]      = useState<ProfileData>({ ...profile });
  const [saving,    setSaving]    = useState(false);
  const [visible,   setVisible]   = useState(false);
  const [techTab,   setTechTab]   = useState<string>("All");
  const [search,    setSearch]    = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  // 마운트 시 진입 애니메이션
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // ESC 키 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const set = (field: keyof ProfileData) => (value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  // ── 기술 스택 토글 ──
  const isSelected = (icon: DevIcon) =>
    form.techStack.some(t => t.slug === icon.slug);

  const toggleTech = (icon: DevIcon) => {
    if (isSelected(icon)) {
      setForm(f => ({ ...f, techStack: f.techStack.filter(t => t.slug !== icon.slug) }));
    } else {
      const entry: TechEntry = { name: icon.name, slug: icon.slug, variant: icon.variant };
      setForm(f => ({ ...f, techStack: [...f.techStack, entry] }));
    }
  };

  const removeTech = (slug: string) =>
    setForm(f => ({ ...f, techStack: f.techStack.filter(t => t.slug !== slug) }));

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      saveProfile(form);
      onSave(form);
      setSaving(false);
      handleClose();
    }, 500);
  };

  // ── devicon 필터 ──
  const filteredIcons = DEVICONS.filter(d => {
    const inCat = techTab === "All" || d.category === techTab;
    const inSearch = search.trim() === "" || d.name.toLowerCase().includes(search.toLowerCase());
    return inCat && inSearch;
  });

  const grad = AVATAR_GRADIENTS[form.avatarColor] ?? AVATAR_GRADIENTS["olive"];
  const gradBg = `linear-gradient(135deg, ${grad.from}, ${grad.via}, ${grad.to})`;

  return (
    // ── 오버레이 ──
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 transition-all"
      style={{
        background: visible ? "rgba(0,0,0,0.30)" : "rgba(0,0,0,0)",
        backdropFilter: visible ? "blur(8px)" : "blur(0px)",
        transition: "all 0.2s ease",
      }}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      {/* ── 모달 카드 ── */}
      <div
        className="w-full max-w-xl flex flex-col overflow-hidden rounded-2xl"
        style={{
          background: "rgba(252,252,251,0.98)",
          border: `1px solid ${BORDER}`,
          boxShadow: "0 24px 64px rgba(0,0,0,0.16), 0 4px 16px rgba(0,0,0,0.06)",
          transform: visible ? "translateY(0) scale(1)" : "translateY(16px) scale(0.97)",
          opacity: visible ? 1 : 0,
          transition: "transform 0.22s cubic-bezier(0.34,1.56,0.64,1), opacity 0.18s ease",
          maxHeight: "88vh",
        }}
      >
        {/* ── 헤더 ── */}
        <div
          className="flex items-center gap-3 px-5 py-4 shrink-0"
          style={{
            background: ACCENT_BG,
            borderBottom: `1px solid ${BORDER_SUBTLE}`,
          }}
        >
          {/* 아바타 미리보기 */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: gradBg }}
          >
            <User className="w-5 h-5 text-white" style={{ opacity: 0.85 }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: TEXT_PRIMARY }}>
              {form.displayName || "프로필"}
            </p>
            <p className="text-[10px]" style={{ color: TEXT_TERTIARY }}>
              프로필 편집
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg transition-all hover:bg-black/[0.06]"
          >
            <X className="w-4 h-4" style={{ color: TEXT_SECONDARY }} />
          </button>
        </div>

        {/* ── 스크롤 영역 ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* 기본 정보 */}
          <section className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TEXT_LABEL }}>
              기본 정보
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="이름"        icon={User}      value={form.displayName} onChange={set("displayName")} placeholder="홍길동" />
              <Field label="역할 / 직책" icon={Briefcase} value={form.role}        onChange={set("role")}        placeholder="Student Developer" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="이메일"      icon={Mail}      value={form.email}       onChange={set("email")}       placeholder="user@example.com" type="email" />
              <Field label="위치"        icon={MapPin}    value={form.location}    onChange={set("location")}    placeholder="Seoul, Korea" />
            </div>
            <TextAreaField
              label="자기소개"
              icon={FileText}
              value={form.bio}
              onChange={set("bio")}
              placeholder="간단한 자기소개를 입력하세요…"
            />
          </section>

          <div style={{ height: 1, background: BORDER_SUBTLE }} />

          {/* 아바타 컬러 */}
          <section className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TEXT_LABEL }}>
              <Palette className="inline w-3 h-3 mr-1 mb-0.5" />
              아바타 컬러
            </p>
            <div className="flex items-center gap-2">
              {Object.entries(AVATAR_GRADIENTS).map(([key, g]) => {
                const bg = `linear-gradient(135deg, ${g.from}, ${g.via}, ${g.to})`;
                const active = form.avatarColor === key;
                return (
                  <button
                    key={key}
                    onClick={() => setForm(f => ({ ...f, avatarColor: key }))}
                    className="w-9 h-9 rounded-xl transition-all relative"
                    style={{
                      background: bg,
                      border: active ? `2px solid ${ACCENT}` : "2px solid transparent",
                      boxShadow: active ? `0 0 0 2px ${ACCENT_BORDER}` : "none",
                      transform: active ? "scale(1.12)" : "scale(1)",
                    }}
                    title={key}
                  >
                    {active && (
                      <CheckCircle2
                        className="absolute inset-0 m-auto w-4 h-4 text-white"
                        style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <div style={{ height: 1, background: BORDER_SUBTLE }} />

          {/* ── 기술 스택 ── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TEXT_LABEL }}>
                <Code2 className="inline w-3 h-3 mr-1 mb-0.5" />
                기술 스택
              </p>
              <button
                onClick={() => setPickerOpen(p => !p)}
                className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all"
                style={{ background: ACCENT_BG, color: ACCENT, border: `1px solid ${ACCENT_BORDER}` }}
              >
                <Search className="w-3 h-3" />
                {pickerOpen ? "닫기" : "기술 선택"}
                <ChevronDown
                  className="w-3 h-3 transition-transform"
                  style={{ transform: pickerOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                />
              </button>
            </div>

            {/* 선택된 기술 칩 */}
            {form.techStack.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {form.techStack.map(tech => (
                  <div
                    key={tech.slug || tech.name}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
                    style={{
                      background: ACCENT_BG,
                      border: `1px solid ${ACCENT_BORDER}`,
                    }}
                  >
                    {tech.slug ? (
                      <DeviconImg slug={tech.slug} variant={tech.variant} size={14} />
                    ) : (
                      <Code2 className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                    )}
                    <span className="text-[10px] font-medium" style={{ color: TEXT_PRIMARY }}>{tech.name}</span>
                    <button
                      onClick={() => removeTech(tech.slug || tech.name)}
                      className="ml-0.5 hover:opacity-60 transition-opacity"
                      style={{ color: TEXT_TERTIARY }}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px]" style={{ color: TEXT_TERTIARY }}>아래에서 기술을 선택하세요</p>
            )}

            {/* ── Devicon 피커 ── */}
            {pickerOpen && (
              <div
                className="rounded-2xl overflow-hidden"
                style={{ border: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.95)" }}
              >
                {/* 검색 */}
                <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: `1px solid ${BORDER_SUBTLE}` }}>
                  <Search className="w-3.5 h-3.5 shrink-0" style={{ color: TEXT_TERTIARY }} />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="기술 검색…"
                    className="flex-1 text-xs outline-none bg-transparent"
                    style={{ color: TEXT_PRIMARY }}
                    autoFocus
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="text-[9px]" style={{ color: TEXT_TERTIARY }}>
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* 카테고리 탭 */}
                <div
                  className="flex gap-1 px-3 py-2 overflow-x-auto"
                  style={{ borderBottom: `1px solid ${BORDER_SUBTLE}`, background: "rgba(0,0,0,0.015)" }}
                >
                  {DEVICON_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setTechTab(cat)}
                      className="text-[9px] font-semibold px-2.5 py-1 rounded-full shrink-0 transition-all"
                      style={{
                        background: techTab === cat ? ACCENT : "rgba(0,0,0,0.04)",
                        color:      techTab === cat ? "white" : TEXT_SECONDARY,
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* 아이콘 그리드 */}
                <div className="p-3 max-h-48 overflow-y-auto">
                  {filteredIcons.length === 0 ? (
                    <div className="flex items-center justify-center py-6">
                      <p className="text-[11px]" style={{ color: TEXT_TERTIARY }}>검색 결과 없음</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-6 gap-1.5">
                      {filteredIcons.map(icon => {
                        const sel = isSelected(icon);
                        return (
                          <button
                            key={icon.slug}
                            onClick={() => toggleTech(icon)}
                            className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all relative"
                            style={{
                              background: sel ? ACCENT_BG : "transparent",
                              border: `1px solid ${sel ? ACCENT_BORDER : "transparent"}`,
                            }}
                            title={icon.name}
                            onMouseEnter={e => {
                              if (!sel) e.currentTarget.style.background = "rgba(0,0,0,0.04)";
                            }}
                            onMouseLeave={e => {
                              if (!sel) e.currentTarget.style.background = "transparent";
                            }}
                          >
                            {sel && (
                              <div
                                className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full flex items-center justify-center"
                                style={{ background: ACCENT }}
                              >
                                <CheckCircle2 className="w-2 h-2 text-white" />
                              </div>
                            )}
                            <DeviconImg slug={icon.slug} variant={icon.variant} size={22} />
                            <span
                              className="text-[8px] text-center leading-tight font-medium w-full truncate"
                              style={{ color: sel ? ACCENT : TEXT_TERTIARY }}
                            >
                              {icon.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 선택 카운트 */}
                <div
                  className="flex items-center justify-between px-3 py-2"
                  style={{ borderTop: `1px solid ${BORDER_SUBTLE}`, background: "rgba(0,0,0,0.015)" }}
                >
                  <span className="text-[9px]" style={{ color: TEXT_TERTIARY }}>
                    {filteredIcons.length}개 표시 중
                  </span>
                  <span
                    className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: ACCENT_BG, color: ACCENT, border: `1px solid ${ACCENT_BORDER}` }}
                  >
                    {form.techStack.length}개 선택됨
                  </span>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ── 푸터 ── */}
        <div
          className="flex items-center justify-end gap-2 px-5 py-3.5 shrink-0"
          style={{ borderTop: `1px solid ${BORDER_SUBTLE}` }}
        >
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{ background: "rgba(0,0,0,0.05)", color: TEXT_SECONDARY }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.09)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(0,0,0,0.05)")}
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: saving ? "rgba(0,0,0,0.07)" : ACCENT,
              color: saving ? TEXT_TERTIARY : "rgba(255,255,255,0.95)",
              boxShadow: saving ? "none" : "0 4px 14px rgba(65,67,27,0.28)",
            }}
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "저장 중…" : "저장하기"}
          </button>
        </div>
      </div>
    </div>
  );
}