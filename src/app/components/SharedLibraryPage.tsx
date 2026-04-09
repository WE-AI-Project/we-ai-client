import { useState } from "react";
import { BookOpen, Search, FileText, Link, Download, File, Code2, BookMarked, Layers } from "lucide-react";
import {
  BORDER, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL, ACCENT,
  UI_RED_DARK, UI_RED_BG8, UI_GREEN, UI_GREEN_BG8, UI_GREEN_BG7, UI_AMBER, UI_AMBER_BG8, UI_AMBER_BG7,
  UI_VIOLET, UI_VIOLET_BG8, UI_VIOLET_BG7, UI_INDIGO,
  GRADIENT_HEADER, BTN_DARK,
} from "../colors";

type Resource = {
  id: string;
  title: string;
  category: "Docs" | "Guide" | "Reference" | "Template";
  desc: string;
  author: string;
  updated: string;
  views: number;
  fileType: "pdf" | "md" | "yml" | "java" | "link";
};

const RESOURCES: Resource[] = [
  { id: "R-001", title: "WE&AI REST API Reference",           category: "Docs",      desc: "Spring Boot REST API 엔드포인트 전체 명세. Request/Response 스키마, 인증 방식 포함.",  author: "Admin",  updated: "Today",     views: 128, fileType: "md"   },
  { id: "R-002", title: "Local Development Setup Guide",      category: "Guide",     desc: "JDK 17 설치, Gradle 설정, application-dev.yml 환경변수 구성 단계별 가이드.",       author: "병권",  updated: "2d ago",    views: 95,  fileType: "md"   },
  { id: "R-003", title: "Multi-Agent System Architecture",    category: "Reference", desc: "에이전트 간 통신 프로토콜, 작업 할당 흐름, 오류 처리 아키텍처 다이어그램.",             author: "Admin",  updated: "1w ago",    views: 74,  fileType: "pdf"  },
  { id: "R-004", title: "application-dev.yml Template",       category: "Template",  desc: "Spring profile 'dev' 설정 템플릿. DB, 서버 포트, 에이전트 파라미터 포함.",          author: "병권",  updated: "3d ago",    views: 61,  fileType: "yml"  },
  { id: "R-005", title: "JDK 17 Migration Guide",             category: "Guide",     desc: "JDK 11→17 마이그레이션 체크리스트. toolchain 플러그인 설정 및 호환성 이슈 정리.",    author: "병권",  updated: "5d ago",    views: 52,  fileType: "md"   },
  { id: "R-006", title: "Agent Communication Protocol Spec",  category: "Reference", desc: "에이전트 간 메시지 포맷 명세. JSON 스키마, 헤더 필드, 에러 코드 테이블.",           author: "Admin",  updated: "1w ago",    views: 47,  fileType: "pdf"  },
  { id: "R-007", title: "MultiAgentController.java Sample",   category: "Template",  desc: "에이전트 컨트롤러 기본 구조 샘플 코드. Spring Component, 의존성 주입 패턴.",        author: "Admin",  updated: "4d ago",    views: 88,  fileType: "java" },
  { id: "R-008", title: "Gradle Build Scripts Cheatsheet",    category: "Reference", desc: "자주 쓰는 Gradle 태스크 모음: bootRun, build, test, clean, dependencies.",        author: "병권",  updated: "Today",     views: 34,  fileType: "md"   },
];

const CATEGORIES = ["All", "Docs", "Guide", "Reference", "Template"] as const;

const FILE_META: Record<Resource["fileType"], { color: string; bg: string; label: string; icon: any }> = {
  pdf:  { color: "#dc2626", bg: "rgba(239,68,68,0.08)",   label: "PDF",  icon: FileText  },
  md:   { color: ACCENT,   bg: "rgba(99,91,255,0.08)",   label: "MD",   icon: FileText  },
  yml:  { color: "#10b981", bg: "rgba(16,185,129,0.08)",  label: "YML",  icon: File      },
  java: { color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  label: "JAVA", icon: Code2     },
  link: { color: "#8b5cf6", bg: "rgba(139,92,246,0.08)",  label: "LINK", icon: Link      },
};

const CAT_META: Record<Resource["category"], { color: string; bg: string }> = {
  Docs:      { color: ACCENT,    bg: "rgba(99,91,255,0.08)"   },
  Guide:     { color: "#10b981", bg: "rgba(16,185,129,0.08)"  },
  Reference: { color: "#8b5cf6", bg: "rgba(139,92,246,0.08)"  },
  Template:  { color: "#f59e0b", bg: "rgba(245,158,11,0.08)"  },
};

export function SharedLibraryPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const filtered = RESOURCES.filter(r => {
    const matchCat = activeCategory === "All" || r.category === activeCategory;
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase()) ||
                        r.desc.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const catCounts: Record<string, number> = { All: RESOURCES.length };
  RESOURCES.forEach(r => { catCounts[r.category] = (catCounts[r.category] ?? 0) + 1; });

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* 배경 */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 20%, #e8d5f5 40%, #fce7f3 60%, #fde6d5 80%, #fef3c7 100%)" }} />
      <div className="absolute inset-0 pointer-events-none">
        <div style={{ position: "absolute", top: "-10%", left: "-5%", width: "45%", height: "45%", borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)", filter: "blur(50px)" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-5%", width: "50%", height: "50%", borderRadius: "50%", background: "radial-gradient(circle, rgba(251,191,122,0.12) 0%, transparent 70%)", filter: "blur(50px)" }} />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto p-5">
        <div className="max-w-3xl mx-auto space-y-4">

          {/* 헤더 */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" style={{ color: "#8b5cf6" }} />
                <h1 className="text-base font-bold" style={{ color: TEXT_PRIMARY }}>Shared Library</h1>
              </div>
              <p className="text-[11px] mt-0.5" style={{ color: TEXT_TERTIARY }}>팀 문서 · 가이드 · 레퍼런스 · 템플릿</p>
            </div>
          </div>

          {/* 통계 바 */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Total Resources", value: RESOURCES.length, color: "#8b5cf6", bg: "rgba(139,92,246,0.07)", icon: Layers    },
              { label: "Docs",            value: catCounts.Docs ?? 0,      color: ACCENT,    bg: "rgba(99,91,255,0.07)",  icon: FileText  },
              { label: "Guides",          value: catCounts.Guide ?? 0,     color: "#10b981", bg: "rgba(16,185,129,0.07)", icon: BookMarked},
              { label: "Templates",       value: catCounts.Template ?? 0,  color: "#f59e0b", bg: "rgba(245,158,11,0.07)", icon: File      },
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
            })}
          </div>

          {/* 검색 + 카테고리 필터 */}
          <div className="rounded-2xl p-3.5 flex items-center gap-3 flex-wrap" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
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
                  {cat}
                  <span className="text-[9px] opacity-60">{catCounts[cat] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 리소스 카드 그리드 */}
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(r => {
              const fm = FILE_META[r.fileType];
              const cm = CAT_META[r.category];
              const FIcon = fm.icon;
              return (
                <div
                  key={r.id}
                  className="rounded-2xl p-4 cursor-pointer transition-all hover:scale-[1.01]"
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
                        <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: cm.bg, color: cm.color }}>
                          {r.category}
                        </span>
                      </div>
                    </div>
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0" style={{ background: fm.bg, color: fm.color }}>
                      .{r.fileType}
                    </span>
                  </div>

                  {/* 설명 */}
                  <p className="text-[10px] leading-relaxed line-clamp-2 mb-3" style={{ color: TEXT_SECONDARY }}>{r.desc}</p>

                  {/* 메타 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[9px]" style={{ color: TEXT_TERTIARY }}>
                      <span>by {r.author}</span>
                      <span>·</span>
                      <span>{r.updated}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px]" style={{ color: TEXT_TERTIARY }}>{r.views} views</span>
                      <button className="w-5 h-5 rounded-md flex items-center justify-center transition-all hover:scale-110" style={{ background: "rgba(0,0,0,0.05)" }}>
                        <Download className="w-2.5 h-2.5" style={{ color: TEXT_SECONDARY }} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="py-12 text-center rounded-2xl" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}` }}>
              <BookOpen className="w-8 h-8 mx-auto mb-2" style={{ color: TEXT_TERTIARY }} />
              <p className="text-xs" style={{ color: TEXT_TERTIARY }}>No resources found</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}