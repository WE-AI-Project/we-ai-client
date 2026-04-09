import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { Sparkles, AlertTriangle, CheckCircle2, XCircle, Shield, Circle, RefreshCw } from "lucide-react";
import {
  BORDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_LABEL,
  UI_RED, UI_RED_DARK, UI_RED_BG, UI_RED_BG7, UI_AMBER, UI_AMBER_DARK, UI_AMBER_BG,
  UI_GREEN, UI_VIOLET, UI_VIOLET_BG7, UI_GRAY, UI_GRAY_BG, UI_GRAY_BORDER, UI_INDIGO,
  GRADIENT_HEADER, BTN_DARK, ACCENT,
} from "../colors";

// 모듈별 테스트 결과 더미 데이터
const TEST_RESULTS = [
  { module: "MultiAgentCtrl", passed: 18, failed: 2, skipped: 1 },
  { module: "DataSync",       passed: 24, failed: 0, skipped: 0 },
  { module: "Parser",         passed: 11, failed: 5, skipped: 2 },
  { module: "Scheduler",      passed: 16, failed: 1, skipped: 1 },
  { module: "Logger",         passed: 9,  failed: 0, skipped: 0 },
  { module: "ApiGateway",     passed: 14, failed: 2, skipped: 3 },
];

// QA 이슈 목록 더미 데이터
type Issue = {
  id: string;
  severity: "critical" | "major" | "minor" | "info";
  module: string;
  title: string;
  detail: string;
  status: "open" | "in-review" | "resolved";
};

const ISSUES: Issue[] = [
  { id: "QA-001", severity: "critical", module: "Parser",        title: "JSON Parse Exception — unhandled edge case",         detail: "Null pointer when input starts with '<'. No fallback.", status: "open"      },
  { id: "QA-002", severity: "major",    module: "MultiAgentCtrl",title: "Race condition in agent handshake protocol",          detail: "Two agents may write to shared state simultaneously.",  status: "in-review" },
  { id: "QA-003", severity: "major",    module: "ApiGateway",    title: "Timeout not configured for upstream API calls",       detail: "Requests may hang indefinitely. Add timeout policy.",   status: "open"      },
  { id: "QA-004", severity: "minor",    module: "Scheduler",     title: "Task retry delay uses hardcoded value",              detail: "Retry interval (5s) should be configurable via yml.",   status: "in-review" },
  { id: "QA-005", severity: "minor",    module: "DataSync",      title: "Logging level inconsistency",                        detail: "DEBUG logs appear in prod profile. Filter by profile.", status: "resolved"  },
  { id: "QA-006", severity: "info",     module: "Logger",        title: "Log rotation archive path is environment-specific",  detail: "Hardcoded Windows path 'logs/' may fail on Linux.",    status: "resolved"  },
  { id: "QA-007", severity: "critical", module: "MultiAgentCtrl",title: "Agent error escalation path not implemented",         detail: "Supervisor callback is a stub method. Needs impl.",     status: "open"      },
];

const SEV_META: Record<Issue["severity"], { color: string; bg: string; label: string; icon: any }> = {
  critical: { color: UI_RED_DARK, bg: UI_RED_BG7,   label: "Critical", icon: XCircle      },
  major:    { color: UI_AMBER_DARK, bg: UI_AMBER_BG,  label: "Major",    icon: AlertTriangle },
  minor:    { color: UI_GRAY, bg: UI_GRAY_BG, label: "Minor",    icon: AlertTriangle },
  info:     { color: ACCENT,   bg: "rgba(99,91,255,0.10)",   label: "Info",     icon: CheckCircle2 },
};

const STATUS_META: Record<Issue["status"], { color: string; label: string }> = {
  "open":      { color: UI_RED, label: "Open"      },
  "in-review": { color: UI_AMBER, label: "In Review" },
  "resolved":  { color: UI_GREEN, label: "Resolved"  },
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

export function QAReportsPage() {
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const totalPassed  = TEST_RESULTS.reduce((s, t) => s + t.passed,  0);
  const totalFailed  = TEST_RESULTS.reduce((s, t) => s + t.failed,  0);
  const totalTests   = totalPassed + totalFailed + TEST_RESULTS.reduce((s, t) => s + t.skipped, 0);
  const coverage     = Math.round((totalPassed / totalTests) * 100);
  const riskScore    = totalFailed >= 5 ? "High" : totalFailed >= 2 ? "Medium" : "Low";
  const riskColor    = riskScore === "High" ? UI_RED : riskScore === "Medium" ? UI_AMBER : UI_GREEN;

  const openCount     = ISSUES.filter(i => i.status === "open").length;
  const criticalCount = ISSUES.filter(i => i.severity === "critical").length;

  const filteredIssues = ISSUES.filter(i => severityFilter === "all" || i.severity === severityFilter);

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
                <Sparkles className="w-4 h-4" style={{ color: ACCENT }} />
                <h1 className="text-base font-bold" style={{ color: TEXT_PRIMARY }}>AI QA Reports</h1>
              </div>
              <p className="text-[11px] mt-0.5" style={{ color: TEXT_TERTIARY }}>WE&amp;AI Backend Server · Last scan: Today 09:41</p>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold" style={{ background: "rgba(255,255,255,0.8)", border: `1px solid ${BORDER}`, color: TEXT_SECONDARY }}>
              <RefreshCw className="w-3 h-3" /> Re-scan
            </button>
          </div>

          {/* 요약 카드 */}
          <div className="grid grid-cols-4 gap-2.5">
            {[
              { label: "Open Issues",    value: String(openCount),    color: UI_RED, bg: UI_RED_BG7   },
              { label: "Critical",       value: String(criticalCount),color: UI_RED_DARK, bg: UI_RED_BG7   },
              { label: "Test Coverage",  value: `${coverage}%`,        color: UI_VIOLET, bg: UI_VIOLET_BG7 },
              { label: "Risk Score",     value: riskScore,             color: riskColor, bg: `${riskColor}12`         },
            ].map(c => (
              <div key={c.label} className="rounded-xl p-3.5" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}` }}>
                <p className="text-lg font-bold" style={{ color: c.color }}>{c.value}</p>
                <p className="text-[10px] mt-0.5" style={{ color: TEXT_LABEL }}>{c.label}</p>
              </div>
            ))}
          </div>

          {/* 테스트 결과 막대 차트 */}
          <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>Test Results by Module</p>
              <div className="flex items-center gap-3 text-[10px]" style={{ color: TEXT_TERTIARY }}>
                <span className="flex items-center gap-1"><Circle className="w-2 h-2 fill-current" style={{ color: "#10b981" }} /> Passed</span>
                <span className="flex items-center gap-1"><Circle className="w-2 h-2 fill-current" style={{ color: "#ef4444" }} /> Failed</span>
                <span className="flex items-center gap-1"><Circle className="w-2 h-2 fill-current" style={{ color: "#d1d5db" }} /> Skipped</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart id="qa-test-results" data={TEST_RESULTS} margin={{ top: 4, right: 8, left: -24, bottom: 0 }} barSize={10}>
                <CartesianGrid stroke="rgba(0,0,0,0.04)" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="module" tick={{ fontSize: 8, fill: TEXT_TERTIARY }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 8, fill: TEXT_TERTIARY }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="passed"  name="Passed"  fill="#10b981" radius={[3,3,0,0]} />
                <Bar dataKey="failed"  name="Failed"  fill="#ef4444" radius={[3,3,0,0]} />
                <Bar dataKey="skipped" name="Skipped" fill="#d1d5db" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 이슈 목록 */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.78)", border: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
            {/* 이슈 목록 헤더 + 필터 */}
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${BORDER_SUBTLE}`, background: "rgba(247,247,245,0.8)" }}>
              <p className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>Issues ({filteredIssues.length})</p>
              <div className="flex items-center gap-1">
                {["all", "critical", "major", "minor", "info"].map(f => (
                  <button
                    key={f}
                    onClick={() => setSeverityFilter(f)}
                    className="px-2 py-0.5 rounded text-[9px] font-semibold capitalize transition-all"
                    style={{
                      background: severityFilter === f ? "#1c1c1e" : "rgba(0,0,0,0.05)",
                      color: severityFilter === f ? "rgba(255,255,255,0.9)" : TEXT_SECONDARY,
                    }}
                  >
                    {f === "all" ? "All" : f}
                  </button>
                ))}
              </div>
            </div>

            {filteredIssues.map((issue, i) => {
              const sev = SEV_META[issue.severity];
              const Icon = sev.icon;
              const sts = STATUS_META[issue.status];
              return (
                <div
                  key={issue.id}
                  className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-black/[0.02]"
                  style={{ borderBottom: i < filteredIssues.length - 1 ? `1px solid ${BORDER_SUBTLE}` : "none" }}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: sev.bg }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: sev.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-[9px] font-mono" style={{ color: TEXT_TERTIARY }}>{issue.id}</span>
                      <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded" style={{ background: sev.bg, color: sev.color }}>{sev.label}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.05)", color: TEXT_SECONDARY }}>{issue.module}</span>
                    </div>
                    <p className="text-[11px] font-medium" style={{ color: TEXT_PRIMARY }}>{issue.title}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: TEXT_TERTIARY }}>{issue.detail}</p>
                  </div>
                  <span className="text-[10px] font-semibold shrink-0 mt-0.5" style={{ color: sts.color }}>{sts.label}</span>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}