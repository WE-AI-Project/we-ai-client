import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Folder,
  FolderOpen,
  FolderPlus,
  Hash,
  Loader2,
  LogOut,
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserCircle2,
  X,
  Trash2,
  AlertTriangle,
  FolderGit2
} from "lucide-react";

// 만들어둔 공통 알림창 컴포넌트 불러오기
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";

import {
  ACCENT,
  ACCENT_BG,
  ACCENT_BORDER,
  BORDER,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
} from "../colors";
import {
  CurrentUser,
  MyProject,
  ProjectCreatePayload,
  ProjectDepartment,
  ProjectLaunchTarget,
  ProjectStackDetection,
  ProjectTechStackInput,
  createProject,
  detectProjectStack,
  fetchMyProjects,
  formatApiError,
  joinProject,
} from "../lib/api";
import { ProjectPickerSkeleton } from "./SkeletonLoader";

const PATH_EXAMPLES = [
  "D:\\WE_AI\\enterprise",
  "C:\\Users\\병권\\projects\\weai",
  "/Users/byungkwon/projects/weai",
  "/home/dev/weai-enterprise",
];

const DEPARTMENTS: ProjectDepartment[] = [
  "BACKEND",
  "FRONTEND",
  "QA",
  "DEVOPS",
  "AI",
  "DATABASE",
  "DESIGN",
  "PM",
];

const DEPARTMENT_LABELS: Record<ProjectDepartment, string> = {
  BACKEND: "Backend",
  FRONTEND: "Frontend",
  QA: "QA",
  DEVOPS: "DevOps",
  AI: "AI",
  DATABASE: "Database",
  DESIGN: "Design",
  PM: "PM",
};

function useEscapeToClose(onClose: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onClose]);
}

type DetectedInfo = ProjectStackDetection;

function genCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function mapDetectedInfoToTechStacks(info: DetectedInfo | null): ProjectTechStackInput[] | undefined {
  return info?.techStacks.map((stack) => ({
    ...stack,
    version: stack.version || undefined,
  }));
}

/* 경고창 없이 폴더 선택 확인 버튼이 바로 활성화되는 공통 컴포넌트 */
function LocalPathInput({
  value,
  onChange,
  label = "프로젝트 저장 위치",
  required = true,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
}) {
  const [focused, setFocused] = useState(false);

  const handleOpenExplorer = async () => {
    alert("웹 브라우저는 보안 정책상 폴더의 절대경로를 전달하지 않습니다. 탐색기 주소창에서 경로를 복사한 뒤 이 입력란에 붙여 넣어 주세요. 개발 환경에서는 입력한 경로를 이 PC에서 직접 분석합니다.");
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-semibold" style={{ color: TEXT_SECONDARY }}>
        {label}
        {required && <span style={{ color: "#B85450" }}> *</span>}
      </label>
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2.5 transition-all hover:bg-black/[0.02]"
        style={{
          background: "rgba(65,67,27,0.04)",
          border: `1.5px solid ${focused ? "rgba(65,67,27,0.35)" : BORDER}`,
        }}
      >
        <Folder className="h-4 w-4 shrink-0" style={{ color: value ? ACCENT : TEXT_TERTIARY }} />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={PATH_EXAMPLES[0]}
          className="min-w-0 flex-1 bg-transparent font-mono text-sm outline-none"
          style={{ color: TEXT_PRIMARY }}
        />

        {value && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onChange("");
            }}
            className="shrink-0 rounded p-1 hover:bg-black/[0.05]"
          >
            <X className="h-3.5 w-3.5" style={{ color: TEXT_TERTIARY }} />
          </button>
        )}
        <button
          type="button"
          onClick={() => void handleOpenExplorer()}
          className="shrink-0 rounded p-1 hover:bg-black/[0.05]"
          title="절대경로 입력 안내"
        >
          <FolderOpen className="h-3.5 w-3.5" style={{ color: TEXT_TERTIARY }} />
        </button>
      </div>
    </div>
  );
}

function DetectResult({ info, path }: { info: DetectedInfo; path: string }) {
  return (
    <div className="space-y-2.5 rounded-xl p-3.5" style={{ background: ACCENT_BG, border: `1px solid ${ACCENT_BORDER}` }}>
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "#5A8A4A" }} />
        <p className="text-[10px] font-semibold" style={{ color: TEXT_PRIMARY }}>
          프로젝트 감지 완료
        </p>
        <span className="ml-auto max-w-[200px] truncate font-mono text-[8px]" style={{ color: TEXT_TERTIARY }}>
          {path}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[9px]">
        {[
          { label: "프레임워크", value: info.framework },
          { label: "언어", value: info.language },
          { label: "빌드 툴", value: info.build },
          { label: "감지 스택", value: `${info.stack.length}개` },
        ].map((row) => (
          <div key={row.label}>
            <span style={{ color: TEXT_TERTIARY }}>{row.label}: </span>
            <span className="font-semibold" style={{ color: ACCENT }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {info.stack.map((stack) => (
          <span key={stack} className="rounded px-1.5 py-0.5 text-[8px]" style={{ background: ACCENT_BG, color: ACCENT }}>
            {stack}
          </span>
        ))}
      </div>
      <p className="text-[9px]" style={{ color: TEXT_SECONDARY }}>
        팀 구성 및 기술 스택은 <strong>Project Settings</strong>에서 세부 설정 가능합니다.
      </p>
    </div>
  );
}

function DepartmentPicker({
  value,
  onChange,
  compact = false,
}: {
  value: ProjectDepartment;
  onChange: (value: ProjectDepartment) => void;
  compact?: boolean;
}) {
  return (
    <div className={`grid gap-1.5 ${compact ? "grid-cols-4" : "grid-cols-2"}`}>
      {DEPARTMENTS.map((department) => {
        const selected = department === value;
        return (
          <button
            key={department}
            type="button"
            onClick={() => onChange(department)}
            className={`rounded-lg font-semibold transition-all ${compact ? "px-2 py-1.5 text-[9px]" : "px-3 py-2 text-[10px]"}`}
            style={{
              background: selected ? "rgba(65,67,27,0.10)" : "rgba(0,0,0,0.04)",
              color: selected ? ACCENT : TEXT_TERTIARY,
              border: `1px solid ${selected ? "rgba(65,67,27,0.18)" : "transparent"}`,
            }}
          >
            {DEPARTMENT_LABELS[department]}
          </button>
        );
      })}
    </div>
  );
}

/* 복수 선택이 가능한 파트 선택 컴포넌트 */
function MultiDepartmentPicker({
  value,
  onChange,
  compact = false,
}: {
  value: ProjectDepartment[];
  onChange: (value: ProjectDepartment[]) => void;
  compact?: boolean;
}) {
  return (
    <div className={`grid gap-1.5 ${compact ? "grid-cols-4" : "grid-cols-2"}`}>
      {DEPARTMENTS.map((department) => {
        const selected = value.includes(department);
        return (
          <button
            key={department}
            type="button"
            onClick={() => {
              if (selected) {
                onChange(value.filter((d) => d !== department));
              } else {
                onChange([...value, department]);
              }
            }}
            className={`rounded-lg font-semibold transition-all ${compact ? "px-2 py-1.5 text-[9px]" : "px-3 py-2 text-[10px]"}`}
            style={{
              background: selected ? "rgba(65,67,27,0.10)" : "rgba(0,0,0,0.04)",
              color: selected ? ACCENT : TEXT_TERTIARY,
              border: `1px solid ${selected ? "rgba(65,67,27,0.18)" : "transparent"}`,
            }}
          >
            {DEPARTMENT_LABELS[department]}
          </button>
        );
      })}
    </div>
  );
}

function CreateProjectModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (project: ProjectLaunchTarget) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [localPath, setLocalPath] = useState("");

  const [departments, setDepartments] = useState<ProjectDepartment[]>(["BACKEND"]);

  const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState<DetectedInfo | null>(null);
  const [previewCode] = useState(genCode());
  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  useEscapeToClose(onClose, !isAlertOpen);

  const totalSteps = 3;
  const canNextStepOne = name.trim().length >= 2;
  const canNextStepTwo = localPath.trim().length > 0;
  const deadlineDays = deadline ? Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000) : null;

  const handleDetect = async () => {
    if (!localPath.trim()) {
      return;
    }

    setDetecting(true);
    setErrorMessage("");
    try {
      setDetected(await detectProjectStack(localPath.trim()));
    } catch (error) {
      setDetected(null);
      setErrorMessage(formatApiError(error));
    } finally {
      setDetecting(false);
    }
  };

  const handleNextClick = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      setIsAlertOpen(true);
    }
  };

  const handleConfirmPath = () => {
    setIsAlertOpen(false);
    setStep(3);
  };

  const handleCreate = async () => {
    if (!name.trim() || !localPath.trim()) {
      setErrorMessage("프로젝트 이름과 저장 경로를 입력해주세요.");
      return;
    }
    if (name.trim().length < 2) {
      setErrorMessage("프로젝트 이름은 2글자 이상이어야 합니다.");
      return;
    }

    setCreating(true);
    setErrorMessage("");

    const payload: ProjectCreatePayload = {
      projectName: name.trim(),
      description: description.trim() || undefined,
      localPath: localPath.trim(),
      department: (departments[0] || "BACKEND") as any,
      deadlineDate: deadline || undefined,
      techStacks: mapDetectedInfoToTechStacks(detected),
    };

    try {
      const created = await createProject(payload);
      onCreate({
        projectId: created.projectId,
        projectName: created.projectName,
        projectCode: created.projectCode,
        localPath: created.localPath ?? localPath.trim(),
      });
    } catch (createError) {
      setErrorMessage(formatApiError(createError));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.28)", backdropFilter: "blur(6px)" }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="relative flex w-full flex-col overflow-hidden rounded-2xl"
        style={{
          maxWidth: 480,
          maxHeight: "92vh",
          background: "rgba(255,255,255,0.97)",
          border: `1px solid ${BORDER}`,
          boxShadow: "0 12px 48px rgba(0,0,0,0.16)",
        }}
      >
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg, #e0e7ff, #e8d5f5)" }}>
            <FolderPlus className="h-4 w-4" style={{ color: ACCENT }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: TEXT_PRIMARY }}>
              새 프로젝트 만들기
            </p>
            <p className="text-[10px]" style={{ color: TEXT_TERTIARY }}>
              WE&AI Project Office
            </p>
          </div>
          <div className="mr-2 flex items-center gap-1.5">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <div
                key={index}
                className="rounded-full transition-all"
                style={{
                  width: step === index + 1 ? 18 : 6,
                  height: 6,
                  background: index + 1 <= step ? ACCENT : "rgba(0,0,0,0.12)",
                }}
              />
            ))}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-black/[0.06]">
            <X className="h-3.5 w-3.5" style={{ color: TEXT_TERTIARY }} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {step === 1 && (
            <>
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold" style={{ color: TEXT_SECONDARY }}>
                  프로젝트 이름 <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  autoFocus
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setErrorMessage("");
                  }}
                  placeholder="예: WE&AI Backend Server"
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{
                    background: "rgba(0,0,0,0.03)",
                    border: `1.5px solid ${name ? "rgba(65,67,27,0.30)" : BORDER}`,
                    color: TEXT_PRIMARY,
                  }}
                />
                {name.trim().length > 0 && name.trim().length < 2 && (
                  <p className="mt-1.5 pl-1 text-[10px]" style={{ color: "#B85450" }}>
                    프로젝트 이름은 2글자 이상 입력해주세요.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-semibold" style={{ color: TEXT_SECONDARY }}>
                  프로젝트 설명
                </label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="프로젝트 목적 및 개요를 입력하세요"
                  rows={3}
                  className="w-full resize-none rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ background: "rgba(0,0,0,0.03)", border: `1.5px solid ${BORDER}`, color: TEXT_PRIMARY }}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-semibold" style={{ color: TEXT_SECONDARY }}>
                  생성자 기본 파트 (복수 선택 가능)
                </label>
                <MultiDepartmentPicker value={departments} onChange={setDepartments} />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-semibold" style={{ color: TEXT_SECONDARY }}>
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-3 w-3" style={{ color: TEXT_TERTIARY }} />
                    프로젝트 마감일
                    <span className="text-[9px] font-normal" style={{ color: TEXT_TERTIARY }}>
                      (선택)
                    </span>
                  </span>
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(event) => setDeadline(event.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{
                    background: deadline ? "rgba(65,67,27,0.04)" : "rgba(0,0,0,0.03)",
                    border: `1.5px solid ${deadline ? "rgba(65,67,27,0.28)" : BORDER}`,
                    color: deadline ? TEXT_PRIMARY : TEXT_TERTIARY,
                  }}
                />
                {deadline && deadlineDays !== null && (
                  <p
                    className="mt-1.5 flex items-center gap-1 text-[9px]"
                    style={{ color: deadlineDays < 7 ? "#B85450" : deadlineDays < 30 ? "#C09840" : "#5A8A4A" }}
                  >
                    <CalendarDays className="h-2.5 w-2.5" />
                    {deadlineDays > 0
                      ? `마감까지 ${deadlineDays}일 남음`
                      : deadlineDays === 0
                        ? "오늘이 마감일입니다"
                        : "마감일이 지났습니다"}
                  </p>
                )}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="rounded-xl px-4 py-3" style={{ background: ACCENT_BG, border: `1px solid ${ACCENT_BORDER}` }}>
                <p className="mb-0.5 text-[10px] font-semibold" style={{ color: ACCENT }}>
                  프로젝트 저장 위치 설정
                </p>
                <p className="text-[9px]" style={{ color: TEXT_SECONDARY }}>
                  박스를 클릭해 원하는 프로젝트 폴더를 지정해 주세요. 폴더를 한 번만 눌러도 하단 확인 버튼이 활성화됩니다.
                </p>
              </div>

              <LocalPathInput
                value={localPath}
                onChange={(value) => {
                  setLocalPath(value);
                  setDetected(null);
                  setErrorMessage("");
                }}
              />

              <button
                type="button"
                onClick={handleDetect}
                disabled={!localPath.trim() || detecting}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all"
                style={{
                  background: localPath.trim() && !detecting ? "rgba(65,67,27,0.08)" : "rgba(0,0,0,0.06)",
                  color: localPath.trim() && !detecting ? ACCENT : TEXT_TERTIARY,
                  border: `1px solid ${localPath.trim() && !detecting ? ACCENT_BORDER : "transparent"}`,
                }}
              >
                {detecting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    프로젝트 분석 중...
                  </>
                ) : (
                  <>
                    <FolderOpen className="h-3.5 w-3.5" />
                    경로 분석 및 기술 스택 감지
                  </>
                )}
              </button>

              {errorMessage && (
                <div
                  className="flex items-start gap-2 rounded-xl px-3 py-2.5"
                  style={{ background: "rgba(184,84,80,0.06)", border: "1px solid rgba(184,84,80,0.18)" }}
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "#B85450" }} />
                  <p className="text-[10px]" style={{ color: "#B85450" }}>
                    {errorMessage}
                  </p>
                </div>
              )}

              {detected && <DetectResult info={detected} path={localPath} />}

              {!detected && !detecting && localPath && (
                <div className="flex items-start gap-2 px-1">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: TEXT_TERTIARY }} />
                  <p className="text-[9px]" style={{ color: TEXT_TERTIARY }}>
                    배포 환경에서는 서버가 접근할 수 있는 경로만 분석할 수 있습니다. 내 PC의 경로는 서버에서 직접 읽을 수 없습니다.
                  </p>
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold" style={{ color: TEXT_SECONDARY }}>
                  참여 코드 (생성 후 서버 발급)
                </label>
                <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "rgba(0,0,0,0.04)", border: `1px solid ${BORDER}` }}>
                  <Hash className="h-4 w-4 shrink-0" style={{ color: TEXT_TERTIARY }} />
                  <span className="flex-1 font-mono text-2xl font-bold tracking-[0.4em]" style={{ color: ACCENT }}>
                    {previewCode}
                  </span>
                  <span className="rounded px-2 py-0.5 text-[9px]" style={{ background: ACCENT_BG, color: ACCENT }}>
                    8자리
                  </span>
                </div>
                <p className="mt-1.5 text-[9px]" style={{ color: TEXT_TERTIARY }}>
                  실제 참여 코드는 생성 시 서버가 발급한 값으로 자동 대체됩니다.
                </p>
              </div>

              <div className="space-y-2 rounded-xl p-3.5" style={{ background: ACCENT_BG, border: `1px solid ${ACCENT_BORDER}` }}>
                <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: ACCENT }}>
                  생성 요약
                </p>
                {[
                  { label: "프로젝트명", value: name },
                  { label: "저장 위치", value: localPath || "-" },
                  {
                    label: "담당 파트",
                    value: departments.length > 0
                      ? departments.map((d) => DEPARTMENT_LABELS[d]).join(", ")
                      : "선택 안 함",
                  },
                  {
                    label: "마감일",
                    value: deadline
                      ? `${deadline}${deadlineDays !== null ? ` (${deadlineDays > 0 ? `${deadlineDays}일 후` : deadlineDays === 0 ? "오늘" : "기간 초과"})` : ""}`
                      : "미설정",
                  },
                  {
                    label: "감지된 스택",
                    value: detected ? `${detected.stack.length}개 자동 감지됨` : "수동 설정 가능",
                  },
                ].map((row) => (
                  <div key={row.label} className="flex items-start justify-between gap-3 text-[10px]">
                    <span style={{ color: TEXT_TERTIARY, flexShrink: 0 }}>{row.label}</span>
                    <span className="max-w-[260px] truncate text-right font-mono font-semibold" style={{ color: TEXT_PRIMARY }}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              {errorMessage && (
                <p className="text-center text-[10px]" style={{ color: "#B85450" }}>
                  {errorMessage}
                </p>
              )}

              <div
                className="flex items-start gap-2 rounded-xl p-3"
                style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.18)" }}
              >
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "#10b981" }} />
                <p className="text-[9px]" style={{ color: TEXT_SECONDARY }}>
                  프로젝트 생성 후 <strong>Project Settings</strong>에서 팀 구성, 기술 스택 버전, 일정을 추가로 설정할 수 있습니다.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2.5 px-5 py-4" style={{ borderTop: `1px solid ${BORDER}` }}>
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((current) => (current - 1) as 1 | 2 | 3)}
              className="flex-1 rounded-xl py-2.5 text-xs font-semibold"
              style={{ background: "rgba(0,0,0,0.06)", color: TEXT_SECONDARY }}
            >
              이전
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl py-2.5 text-xs font-semibold"
              style={{ background: "rgba(0,0,0,0.06)", color: TEXT_SECONDARY }}
            >
              취소
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNextClick}
              disabled={step === 1 ? !canNextStepOne : !canNextStepTwo}
              className="flex-1 rounded-xl py-2.5 text-xs font-semibold transition-all"
              style={{
                background: (step === 1 ? canNextStepOne : canNextStepTwo) ? ACCENT : "rgba(0,0,0,0.07)",
                color: (step === 1 ? canNextStepOne : canNextStepTwo) ? "rgba(255,255,255,0.95)" : TEXT_TERTIARY,
                boxShadow: (step === 1 ? canNextStepOne : canNextStepTwo) ? "0 4px 16px rgba(65,67,27,0.28)" : "none",
              }}
            >
              다음 <ChevronRight className="ml-1 inline h-3 w-3" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={creating}
              className="flex-1 rounded-xl py-2.5 text-xs font-semibold"
              style={{ background: ACCENT, color: "rgba(255,255,255,0.95)", boxShadow: "0 4px 16px rgba(65,67,27,0.30)" }}
            >
              {creating ? (
                <>
                  <span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  생성 중...
                </>
              ) : (
                <>
                  <FolderPlus className="mr-1 inline h-3 w-3" />
                  프로젝트 생성
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>이 경로로 하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription className="font-mono text-sm mt-2 text-foreground break-all">
              {localPath}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>아니오</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPath} style={{ background: ACCENT, color: "white" }}>
              예
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StartModal({
  currentUser,
  projects,
  loading,
  errorMessage,
  onRefresh,
  onClose,
  onSelect,
  onCreate,
}: {
  currentUser: CurrentUser | null;
  projects: MyProject[];
  loading: boolean;
  errorMessage: string;
  onRefresh: () => void;
  onClose: () => void;
  onSelect: (project: ProjectLaunchTarget) => void;
  onCreate: () => void;
}) {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [localPath, setLocalPath] = useState("");
  const [joining, setJoining] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState<DetectedInfo | null>(null);
  useEscapeToClose(onClose);

  const selectedProject = projects.find((project) => project.projectId === selectedProjectId) ?? null;

  const handleSelect = (project: MyProject) => {
    setSelectedProjectId(project.projectId);
    setDetected(null);
    setLocalPath("");
  };

  const handleEnter = () => {
    if (!selectedProject) {
      return;
    }

    setJoining(true);
    window.setTimeout(() => {
      onSelect({
        projectId: selectedProject.projectId,
        projectName: selectedProject.projectName,
        projectCode: selectedProject.projectCode,
        localPath: localPath.trim() || undefined,
      });
      setJoining(false);
    }, 300);
  };

  const handlePathDetect = async () => {
    if (!localPath.trim()) {
      return;
    }

    setDetecting(true);
    try {
      setDetected(await detectProjectStack(localPath.trim()));
    } catch (error) {
      setDetected(null);
      alert(formatApiError(error));
    } finally {
      setDetecting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.28)", backdropFilter: "blur(6px)" }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="relative flex w-full flex-col overflow-hidden rounded-2xl"
        style={{
          maxWidth: 440,
          maxHeight: "88vh",
          background: "rgba(255,255,255,0.97)",
          border: `1px solid ${BORDER}`,
          boxShadow: "0 12px 48px rgba(0,0,0,0.16)",
        }}
      >
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(65,67,27,0.10)" }}>
            <Play className="h-4 w-4" style={{ color: ACCENT }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: TEXT_PRIMARY }}>
              프로젝트 시작하기
            </p>
            <p className="text-[10px]" style={{ color: TEXT_TERTIARY }}>
              {currentUser?.name ? `${currentUser.name}님이 참여 중인 프로젝트` : "참여 중인 프로젝트를 선택하세요"}
            </p>
          </div>
          <button type="button" onClick={onRefresh} className="rounded-lg p-1 hover:bg-black/[0.06]" title="새로고침">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} style={{ color: TEXT_TERTIARY }} />
          </button>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-black/[0.06]">
            <X className="h-3.5 w-3.5" style={{ color: TEXT_TERTIARY }} />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {errorMessage && (
            <div className="rounded-xl px-3 py-2.5 text-[10px]" style={{ background: "rgba(184,84,80,0.06)", border: "1px solid rgba(184,84,80,0.14)", color: "#B85450" }}>
              {errorMessage}
            </div>
          )}

          {loading ? (
            <ProjectPickerSkeleton />
          ) : (
            <div className="space-y-2">
              {projects.map((project) => {
                const selected = selectedProjectId === project.projectId;
                return (
                  <button
                    key={project.projectId}
                    type="button"
                    onClick={() => handleSelect(project)}
                    className="w-full rounded-xl px-4 py-3 text-left transition-all"
                    style={{
                      background: selected ? "rgba(65,67,27,0.07)" : "rgba(0,0,0,0.03)",
                      border: `1.5px solid ${selected ? ACCENT_BORDER : BORDER}`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: selected ? "rgba(65,67,27,0.12)" : "rgba(0,0,0,0.06)" }}>
                        <Bot className="h-4 w-4" style={{ color: selected ? ACCENT : TEXT_SECONDARY }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold" style={{ color: selected ? ACCENT : TEXT_PRIMARY }}>
                          {project.projectName}
                        </p>
                        <p className="mt-0.5 truncate text-[9px]" style={{ color: TEXT_TERTIARY }}>
                          #{project.projectCode} · {project.role} / {project.department}
                        </p>
                        <p className="mt-1 truncate text-[9px]" style={{ color: TEXT_TERTIARY }}>
                          {project.description || "설명이 아직 등록되지 않았습니다."}
                        </p>
                      </div>
                      {selected && (
                        <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full" style={{ background: ACCENT }}>
                          <div className="h-1.5 w-1.5 rounded-full bg-white" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={onCreate}
                className="w-full rounded-xl px-4 py-3 text-left transition-all"
                style={{
                  background: "rgba(0,0,0,0.02)",
                  border: `1.5px dashed ${ACCENT_BORDER}`,
                  minHeight: 84,
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(65,67,27,0.08)" }}>
                    <Plus className="h-4 w-4" style={{ color: ACCENT }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold" style={{ color: ACCENT }}>
                      새 프로젝트 추가
                    </p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {selectedProject && (
            <>
              <LocalPathInput
                value={localPath}
                onChange={(value) => {
                  setLocalPath(value);
                  setDetected(null);
                }}
                label="저장 경로 확인/수정"
                required={false}
              />
              <button
                type="button"
                onClick={handlePathDetect}
                disabled={!localPath.trim() || detecting}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all"
                style={{
                  background: localPath.trim() && !detecting ? "rgba(65,67,27,0.08)" : "rgba(0,0,0,0.06)",
                  color: localPath.trim() && !detecting ? ACCENT : TEXT_TERTIARY,
                  border: `1px solid ${localPath.trim() && !detecting ? ACCENT_BORDER : "transparent"}`,
                }}
              >
                {detecting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    프로젝트 분석 중...
                  </>
                ) : (
                  <>
                    <FolderOpen className="h-3.5 w-3.5" />
                    경로 분석 및 기술 스택 감지
                  </>
                )}
              </button>
              {detected && !detecting && <DetectResult info={detected} path={localPath} />}
            </>
          )}
        </div>

        <div className="flex gap-2.5 border-t px-4 pb-4 pt-2" style={{ borderColor: BORDER }}>
          <button type="button" onClick={onClose} className="flex-1 rounded-xl py-2.5 text-xs font-semibold" style={{ background: "rgba(0,0,0,0.06)", color: TEXT_SECONDARY }}>
            취소
          </button>
          <button
            type="button"
            onClick={handleEnter}
            disabled={!selectedProject || joining}
            className="flex-1 rounded-xl py-2.5 text-xs font-semibold transition-all"
            style={{
              background: selectedProject ? ACCENT : "rgba(0,0,0,0.07)",
              color: selectedProject ? "rgba(255,255,255,0.95)" : TEXT_TERTIARY,
              boxShadow: selectedProject ? "0 4px 16px rgba(65,67,27,0.28)" : "none",
            }}
          >
            {joining ? (
              <>
                <span className="mr-1 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                로딩 중...
              </>
            ) : (
              <>
                시작하기 <ArrowRight className="ml-1 inline h-3 w-3" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

type Props = {
  currentUser: CurrentUser | null;
  onOpenProject: (project: ProjectLaunchTarget) => void;
  onLogout: () => void;
};

export function JoinProjectScreen({
  currentUser,
  onOpenProject,
  onLogout,
}: Props) {
  const [modal, setModal] = useState<"none" | "start" | "create">("none");
  const [projects, setProjects] = useState<MyProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectError, setProjectError] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [codeStep, setCodeStep] = useState<"input" | "path">("input");
  const [codePath, setCodePath] = useState("");
  const [codeDetect, setCodeDetect] = useState<DetectedInfo | null>(null);
  const [codeDetecting, setCodeDetecting] = useState(false);

  const [joinDepartments, setJoinDepartments] = useState<ProjectDepartment[]>(["BACKEND"]);

  const [codeJoining, setCodeJoining] = useState(false);
  const [codeError, setCodeError] = useState("");

  const sortedProjects = useMemo(
    () =>
      [...projects].sort((left, right) => {
        const leftDate = new Date(left.createdAt).getTime();
        const rightDate = new Date(right.createdAt).getTime();
        return rightDate - leftDate;
      }),
    [projects]
  );

  const refreshProjects = async (): Promise<MyProject[] | null> => {
    setLoadingProjects(true);
    try {
      const nextProjects = await fetchMyProjects();
      setProjects(nextProjects);
      setProjectError("");
      return nextProjects;
    } catch (error) {
      setProjectError(formatApiError(error));
      return null;
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    void refreshProjects();
  }, []);

  const handleCreate = (project: ProjectLaunchTarget) => {
    setModal("none");
    void refreshProjects();
    onOpenProject(project);
  };

  const handleSelectProject = (project: ProjectLaunchTarget) => {
    setModal("none");
    onOpenProject(project);
  };

  const handleStart = async () => {
    await refreshProjects();
    setModal("start");
  };

  const handleCodeJoin = async () => {
    const normalizedCode = codeInput.trim().toUpperCase();

    if (normalizedCode.length !== 8) {
      setCodeError("참여 코드는 8글자여야 합니다.");
      return;
    }

    if (codeStep === "input") {
      setCodeError("");
      setCodeStep("path");
      return;
    }

    setCodeJoining(true);
    setCodeError("");

    try {
      const joined = await joinProject({
        projectCode: normalizedCode,
        department: (joinDepartments[0] || "BACKEND") as any,
      });

      await refreshProjects();
      onOpenProject({
        projectId: joined.projectId,
        projectName: joined.projectName,
        projectCode: joined.projectCode,
        localPath: codePath.trim() || undefined,
      });
    } catch (error) {
      setCodeError(formatApiError(error));
    } finally {
      setCodeJoining(false);
    }
  };

  return (
    <>
      {modal === "start" && (
        <StartModal
          currentUser={currentUser}
          projects={sortedProjects}
          loading={loadingProjects}
          errorMessage={projectError}
          onRefresh={() => void refreshProjects()}
          onClose={() => setModal("none")}
          onSelect={handleSelectProject}
          onCreate={() => setModal("create")}
        />
      )}

      {modal === "create" && <CreateProjectModal onClose={() => setModal("none")} onCreate={handleCreate} />}

      <div className="relative flex size-full items-center justify-center overflow-hidden" style={{ background: "#F5F4F1" }}>
        <div className="absolute right-6 top-6 z-20 flex items-center gap-2">
          {currentUser && (
            <div
              className="hidden items-center gap-2 rounded-full px-3 py-2 text-[11px] sm:flex"
              style={{ background: "#FFFFFF", border: `1px solid rgba(0,0,0,0.06)`, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
            >
              <UserCircle2 className="h-4 w-4" style={{ color: ACCENT }} />
              <span style={{ color: TEXT_SECONDARY }}>{currentUser.name}</span>
            </div>
          )}
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-semibold"
            style={{ background: "#FFFFFF", color: TEXT_SECONDARY, border: `1px solid rgba(0,0,0,0.06)`, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
          >
            <LogOut className="h-3.5 w-3.5" />
            로그아웃
          </button>
        </div>

        <div className="relative z-10 flex w-full max-w-[400px] flex-col items-center gap-7 px-6">
          <div className="text-center">
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: "#41431B", boxShadow: "0 8px 24px rgba(65,67,27,0.25)" }}
            >
              <Bot className="h-7 w-7" style={{ color: "white" }} />
            </div>
            <h1 className="mb-1.5 text-xl font-bold" style={{ color: TEXT_PRIMARY }}>
              Welcome to SynAIpse Office
            </h1>
            <p className="text-xs" style={{ color: TEXT_SECONDARY }}>
              Intelligent Multi-Agent Project Office
            </p>
            {currentUser && (
              <p className="mt-2 text-[11px]" style={{ color: TEXT_TERTIARY }}>
                {currentUser.name}님, 프로젝트를 선택하거나 새로 만들어보세요.
              </p>
            )}
          </div>

          <div className="w-full space-y-3">
            <button
              type="button"
              onClick={() => void handleStart()}
              className="group flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-left"
              style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", transition: "all 0.15s ease" }}
              onMouseEnter={(event) => {
                event.currentTarget.style.boxShadow = "0 6px 20px rgba(65,67,27,0.14)";
                event.currentTarget.style.border = "1px solid rgba(65,67,27,0.18)";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)";
                event.currentTarget.style.border = "1px solid rgba(0,0,0,0.07)";
              }}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(65,67,27,0.08)" }}>
                <Play className="h-5 w-5" style={{ color: ACCENT }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
                  시작하기
                </p>
                <p className="mt-0.5 text-[11px]" style={{ color: TEXT_SECONDARY }}>
                  참여 중인 프로젝트 목록에서 선택
                </p>
              </div>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" style={{ color: TEXT_TERTIARY }} />
            </button>

            <button
              type="button"
              onClick={() => setModal("create")}
              className="group flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-left"
              style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", transition: "all 0.15s ease" }}
              onMouseEnter={(event) => {
                event.currentTarget.style.boxShadow = "0 6px 20px rgba(65,67,27,0.14)";
                event.currentTarget.style.border = "1px solid rgba(65,67,27,0.18)";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)";
                event.currentTarget.style.border = "1px solid rgba(0,0,0,0.07)";
              }}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(174,183,132,0.15)" }}>
                <Plus className="h-5 w-5" style={{ color: ACCENT }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
                  새 프로젝트
                </p>
                <p className="mt-0.5 text-[11px]" style={{ color: TEXT_SECONDARY }}>
                  저장 경로 지정 후 자동으로 세팅
                </p>
              </div>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" style={{ color: TEXT_TERTIARY }} />
            </button>

            <div
              className="w-full rounded-2xl px-5 py-4"
              style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(65,67,27,0.06)" }}>
                  <Hash className="h-5 w-5" style={{ color: ACCENT }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
                    코드로 참여
                  </p>
                  <p className="mt-0.5 text-[11px]" style={{ color: TEXT_SECONDARY }}>
                    8자리 초대 코드로 바로 참여
                  </p>
                </div>
              </div>

              {codeStep === "input" ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Hash className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2" style={{ color: TEXT_TERTIARY }} />
                      <input
                        value={codeInput}
                        onChange={(event) => {
                          setCodeError("");
                          const processedValue = event.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
                          setCodeInput(processedValue.slice(0, 8));
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && codeInput.length === 8) {
                            void handleCodeJoin();
                          }
                        }}
                        placeholder="A1B2C3D4"
                        maxLength={8}
                        className="w-full rounded-xl py-2.5 pl-8 pr-3 font-mono text-sm uppercase tracking-widest outline-none"
                        style={{
                          background: codeError ? "rgba(184,84,80,0.05)" : "#F4F3F0",
                          border: `1.5px solid ${codeError ? "rgba(184,84,80,0.35)" : "transparent"}`,
                          color: TEXT_PRIMARY,
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleCodeJoin()}
                      disabled={codeInput.length !== 8}
                      className="shrink-0 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all"
                      style={{
                        background: codeInput.length === 8 ? "#41431B" : "rgba(0,0,0,0.07)",
                        color: codeInput.length === 8 ? "white" : TEXT_TERTIARY,
                      }}
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold" style={{ color: TEXT_SECONDARY }}>
                      참여 파트 선택
                    </p>
                    <MultiDepartmentPicker value={joinDepartments} onChange={setJoinDepartments} compact />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <LocalPathInput
                    value={codePath}
                    onChange={(value) => {
                      setCodePath(value);
                      setCodeDetect(null);
                    }}
                    label="저장 경로 확인"
                    required={false}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!codePath.trim()) {
                        return;
                      }
                      setCodeDetecting(true);
                      setCodeError("");
                      try {
                        setCodeDetect(await detectProjectStack(codePath.trim()));
                      } catch (error) {
                        setCodeDetect(null);
                        setCodeError(formatApiError(error));
                      } finally {
                        setCodeDetecting(false);
                      }
                    }}
                    disabled={!codePath.trim() || codeDetecting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all"
                    style={{
                      background: codePath.trim() ? "rgba(65,67,27,0.08)" : "rgba(0,0,0,0.06)",
                      color: codePath.trim() ? ACCENT : TEXT_TERTIARY,
                      border: `1px solid ${codePath.trim() ? ACCENT_BORDER : "transparent"}`,
                    }}
                  >
                    {codeDetecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderOpen className="h-3.5 w-3.5" />}
                    경로 분석
                  </button>
                  {codeDetect && <DetectResult info={codeDetect} path={codePath} />}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCodeStep("input");
                        setCodeError("");
                      }}
                      className="flex-1 rounded-xl py-2 text-xs font-semibold"
                      style={{ background: "rgba(0,0,0,0.06)", color: TEXT_SECONDARY }}
                    >
                      이전
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleCodeJoin()}
                      disabled={codeJoining}
                      className="flex-1 rounded-xl py-2 text-xs font-semibold"
                      style={{ background: "#41431B", color: "white" }}
                    >
                      {codeJoining ? "참여 중..." : "참여하기"}
                    </button>
                  </div>
                </div>
              )}

              {codeError && (
                <p className="mt-2 text-[10px]" style={{ color: "#ef4444" }}>
                  {codeError}
                </p>
              )}
            </div>

            {projectError && !modal && (
              <div className="rounded-xl px-4 py-3 text-[10px]" style={{ background: "rgba(184,84,80,0.06)", border: "1px solid rgba(184,84,80,0.14)", color: "#B85450" }}>
                {projectError}
              </div>
            )}

            <div className="rounded-xl px-4 py-3 text-[10px]" style={{ background: "rgba(65,67,27,0.04)", border: "1px solid rgba(65,67,27,0.08)" }}>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" style={{ color: ACCENT }} />
                <span style={{ color: TEXT_SECONDARY }}>
                  내 프로젝트 {sortedProjects.length}개가 실제 서버 데이터로 연결되어 있습니다.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
