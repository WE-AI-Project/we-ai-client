import { useEffect, useState } from "react";
import { BookOpen, Search, FileText, Download, File, Code2, BookMarked, Layers, Plus, X, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  BORDER, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL, ACCENT,
  CONTENT_BG,
} from "../colors";
import {
  fetchLibraryResources,
  uploadLibraryResource,
  viewLibraryResource,
  deleteLibraryResource,
  buildApiUrl,
  loadSession,
  type LibraryResource,
  type LibraryResourceCategory,
} from "../lib/api";

// ── 🚨 [추가] 재사용 가능한 스켈레톤 뼈대 컴포넌트 ──
function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-black/10 ${className || ""}`}
      style={style}
    />
  );
}

const CATEGORIES: (LibraryResourceCategory | "All")[] = ["All", "DOCS", "GUIDE", "REFERENCE", "TEMPLATE"];
const CATEGORY_LABEL: Record<LibraryResourceCategory, string> = {
  DOCS: "Docs",
  GUIDE: "Guide",
  REFERENCE: "Reference",
  TEMPLATE: "Template",
};

const CAT_META: Record<LibraryResourceCategory, { color: string; bg: string }> = {
  DOCS:      { color: ACCENT,    bg: "rgba(88,101,242,0.10)" },
  GUIDE:     { color: "#10b981", bg: "rgba(16,185,129,0.08)" },
  REFERENCE: { color: "#8b5cf6", bg: "rgba(139,92,246,0.08)" },
  TEMPLATE:  { color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
};

function fileMeta(extension: string): { color: string; bg: string; label: string; icon: any } {
  const ext = extension.toLowerCase();
  if (ext === "pdf") return { color: "#dc2626", bg: "rgba(239,68,68,0.08)", label: "PDF", icon: FileText };
  if (["md", "txt"].includes(ext)) return { color: ACCENT, bg: "rgba(88,101,242,0.08)", label: ext.toUpperCase(), icon: FileText };
  if (["yml", "yaml"].includes(ext)) return { color: "#10b981", bg: "rgba(16,185,129,0.08)", label: "YML", icon: File };
  if (["java", "ts", "tsx", "js", "jsx"].includes(ext)) return { color: "#f59e0b", bg: "rgba(245,158,11,0.08)", label: ext.toUpperCase(), icon: Code2 };
  return { color: TEXT_TERTIARY, bg: "rgba(0,0,0,0.05)", label: ext ? ext.toUpperCase() : "FILE", icon: File };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "1d ago";
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

// ── 업로드 모달 ──
function UploadModal({ projectId, onClose, onUploaded }: { projectId: number; onClose: () => void; onUploaded: (r: LibraryResource) => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<LibraryResourceCategory>("DOCS");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error("제목을 입력해 주세요."); return; }
    if (!file) { toast.error("업로드할 파일을 선택해 주세요."); return; }
    setSubmitting(true);
    try {
      const uploaded = await uploadLibraryResource(projectId, file, title.trim(), category, description.trim() || undefined);
      toast.success("자료가 업로드되었습니다.");
      onUploaded(uploaded);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "업로드에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="w-full max-w-md rounded-2xl p-5 space-y-3" style={{ background: "#FAFAF7" }}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold" style={{ color: TEXT_PRIMARY }}>공유 자료 업로드</p>
          <button onClick={onClose}><X className="w-4 h-4" style={{ color: TEXT_TERTIARY }} /></button>
        </div>

        <label className="block space-y-1">
          <span className="text-[10px] font-semibold" style={{ color: TEXT_LABEL }}>제목</span>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-2.5 py-1.5 text-[12px] rounded-lg outline-none"
            style={{ background: "rgba(0,0,0,0.03)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[10px] font-semibold" style={{ color: TEXT_LABEL }}>카테고리</span>
          <select
            value={category}
            onChange={e => setCategory(e.target.value as LibraryResourceCategory)}
            className="w-full px-2.5 py-1.5 text-[12px] rounded-lg outline-none"
            style={{ background: "rgba(0,0,0,0.03)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
          >
            {(["DOCS", "GUIDE", "REFERENCE", "TEMPLATE"] as const).map(c => (
              <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-[10px] font-semibold" style={{ color: TEXT_LABEL }}>설명 (선택)</span>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className="w-full px-2.5 py-1.5 text-[12px] rounded-lg outline-none resize-none"
            style={{ background: "rgba(0,0,0,0.03)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[10px] font-semibold" style={{ color: TEXT_LABEL }}>파일</span>
          <input
            type="file"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-[11px]"
          />
        </label>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold"
          style={{ background: ACCENT, color: "white" }}
        >
          {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          업로드
        </button>
      </div>
    </div>
  );
}

export function SharedLibraryPage({ projectId }: { projectId: number }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [showUpload, setShowUpload] = useState(false);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<LibraryResourceCategory | "All">("All");

  const currentUsername = loadSession()?.username;

  const load = () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    fetchLibraryResources(projectId, { size: 100 })
      .then(res => setResources(res.resources))
      .catch((err: any) => setError(err?.message || "공유 자료를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, [projectId]);

  const handleDownload = async (resource: LibraryResource) => {
    try {
      const updated = await viewLibraryResource(projectId, resource.id);
      setResources(prev => prev.map(r => (r.id === resource.id ? updated : r)));
    } catch {
      // 조회수 반영에 실패해도 다운로드 자체는 계속 진행한다.
    }
    window.open(buildApiUrl(resource.fileUrl), "_blank", "noopener,noreferrer");
  };

  const handleDelete = async (resource: LibraryResource) => {
    try {
      await deleteLibraryResource(projectId, resource.id);
      setResources(prev => prev.filter(r => r.id !== resource.id));
      toast.success("삭제되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    }
  };

  const filtered = resources.filter(r => {
    const matchCat = activeCategory === "All" || r.category === activeCategory;
    const q = search.toLowerCase();
    const matchSearch = r.title.toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const catCounts: Record<string, number> = { All: resources.length };
  resources.forEach(r => { catCounts[r.category] = (catCounts[r.category] ?? 0) + 1; });

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative" style={{ background: CONTENT_BG }}>
      <div className="relative z-10 flex-1 overflow-y-auto p-5">
        <div className="w-full max-w-[1600px] mx-auto space-y-4">

          {/* ── 헤더 ── */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" style={{ color: "#8b5cf6" }} />
                <h1 className="text-base font-bold" style={{ color: TEXT_PRIMARY }}>Shared Library</h1>
              </div>
              {isLoading ? (
                <Skeleton className="h-3 w-48 mt-1.5" />
              ) : (
                <p className="text-[11px] mt-0.5" style={{ color: TEXT_TERTIARY }}>팀 문서 · 가이드 · 레퍼런스 · 템플릿</p>
              )}
            </div>
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold"
              style={{ background: ACCENT, color: "white" }}
            >
              <Plus className="w-3.5 h-3.5" /> Upload
            </button>
          </div>

          {error && (
            <div className="rounded-xl p-3 text-[11px]" style={{ background: "rgba(184,84,80,0.08)", color: "#B85450", border: `1px solid ${BORDER}` }}>
              {error}
            </div>
          )}

          {/* ── 통계 바 ── */}
          <div className="grid grid-cols-4 gap-2">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl p-3 flex items-center gap-2.5" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}` }}>
                  <Skeleton className="w-7 h-7 rounded-lg shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3.5 w-8" />
                    <Skeleton className="h-2 w-16" />
                  </div>
                </div>
              ))
            ) : (
              [
                { label: "Total Resources", value: resources.length, color: "#8b5cf6", bg: "rgba(139,92,246,0.07)", icon: Layers    },
                { label: "Docs",            value: catCounts.DOCS ?? 0,      color: ACCENT,    bg: "rgba(88,101,242,0.07)",  icon: FileText  },
                { label: "Guides",          value: catCounts.GUIDE ?? 0,     color: "#10b981", bg: "rgba(16,185,129,0.07)", icon: BookMarked},
                { label: "Templates",       value: catCounts.TEMPLATE ?? 0,  color: "#f59e0b", bg: "rgba(245,158,11,0.07)", icon: File      },
              ].map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="rounded-xl p-3 flex items-center gap-2.5" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}` }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: s.bg }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: s.color }}>{s.value}</p>
                      <p className="text-[9px]" style={{ color: TEXT_LABEL }}>{s.label}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ── 검색 + 카테고리 필터 ── */}
          <div className="rounded-2xl p-3.5 flex items-center gap-3 flex-wrap" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
            {isLoading ? (
              <div className="flex w-full items-center gap-3 flex-wrap">
                <Skeleton className="flex-1 min-w-48 h-8 rounded-lg" />
                <div className="flex gap-1.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="w-12 h-6 rounded-lg" />
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: TEXT_TERTIARY }} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search library..."
                    className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg outline-none"
                    style={{ background: "rgba(0,0,0,0.04)", border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
                  />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
                      style={{
                        background: activeCategory === cat ? "#1c1c1e" : "rgba(0,0,0,0.05)",
                        color: activeCategory === cat ? "rgba(255,255,255,0.9)" : TEXT_SECONDARY,
                      }}
                    >
                      {cat === "All" ? "All" : CATEGORY_LABEL[cat]}
                      <span className="text-[9px] opacity-60">{catCounts[cat] ?? 0}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ── 리소스 카드 그리드 ── */}
          <div className="grid grid-cols-2 gap-3">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl p-4 transition-all" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}` }}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-3 w-12 rounded" />
                      </div>
                    </div>
                    <Skeleton className="w-8 h-4 rounded shrink-0" />
                  </div>
                  <div className="space-y-1.5 mb-4">
                    <Skeleton className="h-2.5 w-full" />
                    <Skeleton className="h-2.5 w-4/5" />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <Skeleton className="h-2.5 w-24" />
                    <div className="flex gap-2 items-center">
                      <Skeleton className="h-2.5 w-12" />
                      <Skeleton className="w-5 h-5 rounded-md" />
                    </div>
                  </div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="col-span-2 py-12 text-center rounded-2xl" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}` }}>
                <BookOpen className="w-8 h-8 mx-auto mb-2" style={{ color: TEXT_TERTIARY }} />
                <p className="text-xs" style={{ color: TEXT_TERTIARY }}>
                  {resources.length === 0 ? "아직 업로드된 자료가 없습니다." : "No resources found"}
                </p>
              </div>
            ) : (
              filtered.map(r => {
                const fm = fileMeta(r.extension);
                const cm = CAT_META[r.category];
                const FIcon = fm.icon;
                const canDelete = currentUsername && currentUsername === r.uploaderName;
                return (
                  <div
                    key={r.id}
                    className="rounded-2xl p-4 transition-all hover:scale-[1.01]"
                    style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}
                  >
                    {/* 헤더 */}
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: fm.bg }}>
                          <FIcon className="w-4 h-4" style={{ color: fm.color }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold truncate" style={{ color: TEXT_PRIMARY }}>{r.title}</p>
                          <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded inline-block mt-0.5" style={{ background: cm.bg, color: cm.color }}>
                            {CATEGORY_LABEL[r.category]}
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0" style={{ background: fm.bg, color: fm.color }}>
                        .{r.extension || "file"}
                      </span>
                    </div>

                    {/* 설명 */}
                    {r.description && (
                      <p className="text-[10px] leading-relaxed line-clamp-2 mb-3" style={{ color: TEXT_SECONDARY }}>{r.description}</p>
                    )}

                    {/* 메타 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[9px]" style={{ color: TEXT_TERTIARY }}>
                        <span>by {r.uploaderName}</span>
                        <span>·</span>
                        <span>{formatRelativeTime(r.createdAt)}</span>
                        <span>·</span>
                        <span>{formatFileSize(r.fileSize)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px]" style={{ color: TEXT_TERTIARY }}>{r.viewCount} views</span>
                        <button
                          onClick={() => handleDownload(r)}
                          title="다운로드"
                          className="w-5 h-5 rounded-md flex items-center justify-center transition-all hover:scale-110"
                          style={{ background: "rgba(0,0,0,0.05)" }}
                        >
                          <Download className="w-2.5 h-2.5" style={{ color: TEXT_SECONDARY }} />
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(r)}
                            title="삭제"
                            className="w-5 h-5 rounded-md flex items-center justify-center transition-all hover:scale-110"
                            style={{ background: "rgba(184,84,80,0.10)" }}
                          >
                            <Trash2 className="w-2.5 h-2.5" style={{ color: "#B85450" }} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      </div>

      {showUpload && (
        <UploadModal
          projectId={projectId}
          onClose={() => setShowUpload(false)}
          onUploaded={(r) => setResources(prev => [r, ...prev])}
        />
      )}
    </div>
  );
}
