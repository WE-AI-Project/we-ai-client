import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Sparkles, AlertTriangle, XCircle, Circle, RefreshCw } from "lucide-react";
import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL,
  UI_RED, UI_RED_DARK, UI_RED_BG7, UI_AMBER, UI_AMBER_DARK, UI_AMBER_BG,
  UI_GREEN, UI_VIOLET, UI_VIOLET_BG7, UI_GRAY, UI_GRAY_BG,
  ACCENT,
  CONTENT_BG,
} from "../colors";
import {
  fetchQaReports,
  fetchQaReportDetail,
  type QaReportSummary,
  type QaIssueDetail,
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

// 실제 QA 리포트 이슈 하나 + 그 이슈가 속한 리포트(커밋) 정보
type IssueRow = { report: QaReportSummary; issue: QaIssueDetail };

const SEV_META: Record<QaIssueDetail["severity"], { color: string; bg: string; label: string; icon: any }> = {
  CRITICAL: { color: UI_RED_DARK,   bg: UI_RED_BG7,   label: "Critical", icon: XCircle      },
  MAJOR:    { color: UI_AMBER_DARK, bg: UI_AMBER_BG,  label: "Major",    icon: AlertTriangle },
  MINOR:    { color: UI_GRAY,       bg: UI_GRAY_BG,   label: "Minor",    icon: AlertTriangle },
};

const STATUS_META: Record<QaIssueDetail["status"], { color: string; label: string }> = {
  OPEN:     { color: UI_RED,   label: "Open"     },
  RESOLVED: { color: UI_GREEN, label: "Resolved" },
  IGNORED:  { color: UI_GRAY,  label: "Ignored"  },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 text-[11px]" style={{ background: "rgba(255,255,255,0.96)", border: `1px solid ${BORDER}`, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
      <p className="font-semibold mb-1" style={{ color: TEXT_PRIMARY }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.fill }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

export function QAReportsPage({ projectId }: { projectId: number }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<QaReportSummary[]>([]);
  const [issueRows, setIssueRows] = useState<IssueRow[]>([]);
  const [lastScanAt, setLastScanAt] = useState<Date | null>(null);

  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const load = () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    (async () => {
      const list = await fetchQaReports(projectId, { size: 20 });
      setReports(list.reports);
      // 최근 리포트 10건의 상세(이슈 목록)를 가져와 프로젝트 전체 이슈 뷰로 펼친다.
      const details = await Promise.all(
        list.reports.slice(0, 10).map((r) => fetchQaReportDetail(projectId, r.qaReportId).catch(() => null))
      );
      const rows: IssueRow[] = [];
      details.forEach((d, i) => {
        if (!d) return;
        d.issues.forEach((issue) => rows.push({ report: list.reports[i], issue }));
      });
      setIssueRows(rows);
      setLastScanAt(new Date());
    })()
      .catch((err: any) => setError(err?.message || "QA 리포트를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, [projectId]);

  const totalPassed  = reports.reduce((s, r) => s + r.testPassCount, 0);
  const totalFailed  = reports.reduce((s, r) => s + r.testFailCount, 0);
  const totalTests   = totalPassed + totalFailed;
  const coverage     = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
  const criticalCount = issueRows.filter(x => x.issue.severity === "CRITICAL").length;
  const openCount     = issueRows.filter(x => x.issue.status === "OPEN").length;
  const riskScore    = criticalCount > 0 ? "High" : openCount >= 3 ? "Medium" : "Low";
  const riskColor    = riskScore === "High" ? UI_RED : riskScore === "Medium" ? UI_AMBER : UI_GREEN;

  const filteredIssues = issueRows.filter(x => severityFilter === "all" || x.issue.severity === severityFilter);

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative" style={{ background: CONTENT_BG }}>
      <div className="relative z-10 flex-1 overflow-y-auto p-5">
        <div className="w-full max-w-[1600px] mx-auto space-y-4">

          {/* ── 헤더 ── */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: ACCENT }} />
                <h1 className="text-base font-bold" style={{ color: TEXT_PRIMARY }}>AI QA Reports</h1>
              </div>
              {isLoading ? (
                <Skeleton className="h-3 w-48 mt-1.5" />
              ) : (
                <p className="text-[11px] mt-0.5" style={{ color: TEXT_TERTIARY }}>
                  SynAIpse Backend Server{lastScanAt ? ` · Last loaded: ${lastScanAt.toLocaleTimeString("ko-KR")}` : ""}
                </p>
              )}
            </div>

            {isLoading ? (
              <Skeleton className="h-7 w-20 rounded-lg" />
            ) : (
              <button
                onClick={load}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold hover:bg-black/[0.05] transition-all"
                style={{ background: "rgba(255,255,255,0.8)", border: `1px solid ${BORDER}`, color: TEXT_SECONDARY }}
              >
                <RefreshCw className="w-3 h-3" /> Re-scan
              </button>
            )}
          </div>

          {error && (
            <div className="rounded-xl p-3 text-[11px]" style={{ background: UI_RED_BG7, color: UI_RED_DARK, border: `1px solid ${BORDER}` }}>
              {error}
            </div>
          )}

          {/* ── 요약 카드 ── */}
          <div className="grid grid-cols-4 gap-2.5">
            {isLoading ? (
              /* [스켈레톤] 상단 요약 통계 카드 4개 */
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl p-3.5" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}` }}>
                  <Skeleton className="h-6 w-12 mb-2" />
                  <Skeleton className="h-2.5 w-16" />
                </div>
              ))
            ) : (
              [
                { label: "Open Issues",   value: String(openCount),     color: UI_RED, bg: UI_RED_BG7   },
                { label: "Critical",      value: String(criticalCount), color: UI_RED_DARK, bg: UI_RED_BG7   },
                { label: "Test Coverage", value: `${coverage}%`,        color: UI_VIOLET, bg: UI_VIOLET_BG7 },
                { label: "Risk Score",    value: riskScore,             color: riskColor, bg: `${riskColor}12`         },
              ].map(c => (
                <div key={c.label} className="rounded-xl p-3.5" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}` }}>
                  <p className="text-lg font-bold" style={{ color: c.color }}>{c.value}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: TEXT_LABEL }}>{c.label}</p>
                </div>
              ))
            )}
          </div>

          {/* ── 테스트 결과 막대 차트 (커밋별 QA 리포트 기준) ── */}
          <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>Test Results by Commit</p>
              {!isLoading && (
                <div className="flex items-center gap-3 text-[10px]" style={{ color: TEXT_TERTIARY }}>
                  <span className="flex items-center gap-1"><Circle className="w-2 h-2 fill-current" style={{ color: "#10b981" }} /> Passed</span>
                  <span className="flex items-center gap-1"><Circle className="w-2 h-2 fill-current" style={{ color: "#ef4444" }} /> Failed</span>
                </div>
              )}
            </div>

            {isLoading ? (
              /* [스켈레톤] 막대 차트 영역 */
              <Skeleton className="w-full h-[160px] rounded-xl" />
            ) : reports.length === 0 ? (
              <p className="text-[11px] py-8 text-center" style={{ color: TEXT_TERTIARY }}>표시할 QA 리포트가 없습니다.</p>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart
                  id="qa-test-results"
                  data={reports.slice().reverse().map(r => ({ commit: r.commitId, passed: r.testPassCount, failed: r.testFailCount }))}
                  margin={{ top: 4, right: 8, left: -24, bottom: 0 }}
                  barSize={10}
                >
                  <CartesianGrid stroke="rgba(0,0,0,0.04)" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="commit" tick={{ fontSize: 8, fill: TEXT_TERTIARY }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 8, fill: TEXT_TERTIARY }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="passed"  name="Passed"  fill="#10b981" radius={[3,3,0,0]} />
                  <Bar dataKey="failed"  name="Failed"  fill="#ef4444" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── 이슈 목록 ── */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
            {/* 이슈 목록 헤더 + 필터 */}
            <div className="px-4 py-3 flex items-center justify-between shrink-0" style={{ borderBottom: `1px solid ${BORDER_SUBTLE}`, background: "rgba(247,247,245,0.8)" }}>
              {isLoading ? (
                <Skeleton className="h-4 w-20" />
              ) : (
                <p className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>Issues ({filteredIssues.length})</p>
              )}
              
              <div className="flex items-center gap-1">
                {isLoading ? (
                  /* [스켈레톤] 필터 버튼 */
                  Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-5 w-10 rounded" />
                  ))
                ) : (
                  ["all", "CRITICAL", "MAJOR", "MINOR"].map(f => (
                    <button
                      key={f}
                      onClick={() => setSeverityFilter(f)}
                      className="px-2 py-0.5 rounded text-[9px] font-semibold transition-all"
                      style={{
                        background: severityFilter === f ? "#1c1c1e" : "rgba(0,0,0,0.05)",
                        color: severityFilter === f ? "rgba(255,255,255,0.9)" : TEXT_SECONDARY,
                      }}
                    >
                      {f === "all" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
                    </button>
                  ))
                )}
              </div>
            </div>

            {isLoading ? (
              /* [스켈레톤] 이슈 목록 5개 */
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3" style={{ borderBottom: i < 4 ? `1px solid ${BORDER_SUBTLE}` : "none" }}>
                  <Skeleton className="w-7 h-7 rounded-lg mt-0.5 shrink-0" />
                  <div className="flex-1 space-y-2 pt-0.5">
                    <div className="flex gap-2">
                      <Skeleton className="h-3 w-12" />
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-14" />
                    </div>
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-2.5 w-1/2" />
                  </div>
                  <Skeleton className="h-3 w-12 mt-1 shrink-0" />
                </div>
              ))
            ) : filteredIssues.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-[11px]" style={{ color: TEXT_TERTIARY }}>해당하는 이슈가 없습니다.</p>
              </div>
            ) : (
              filteredIssues.map((row, i) => {
                const { issue, report } = row;
                const sev = SEV_META[issue.severity];
                const Icon = sev.icon;
                const sts = STATUS_META[issue.status];
                return (
                  <div
                    key={issue.issueId}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-black/[0.02]"
                    style={{ borderBottom: i < filteredIssues.length - 1 ? `1px solid ${BORDER_SUBTLE}` : "none" }}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: sev.bg }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: sev.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-[9px] font-mono" style={{ color: TEXT_TERTIARY }}>#{report.commitId}</span>
                        <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded" style={{ background: sev.bg, color: sev.color }}>{sev.label}</span>
                        {issue.filePath && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(0,0,0,0.05)", color: TEXT_SECONDARY }}>
                            {issue.filePath}{issue.lineNumber ? `:${issue.lineNumber}` : ""}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-medium" style={{ color: TEXT_PRIMARY }}>{issue.title}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: TEXT_TERTIARY }}>{issue.description}</p>
                    </div>
                    <span className="text-[10px] font-semibold shrink-0 mt-0.5" style={{ color: sts.color }}>{sts.label}</span>
                  </div>
                );
              })
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
