import { useState, useEffect, useMemo } from "react";
import {
  GitCommit,
  GitBranch,
  Upload,
  CheckCircle2,
  X,
  ShieldCheck,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  FileCode2,
  GitMerge,
  Loader2,
  Server,
  Monitor,
  FolderCode,
} from "lucide-react";
import type { CommitFile, DiffLine } from "./commitData";
import { FileDiffViewer } from "./FileDiffViewer";
import { BranchVisualization } from "./BranchVisualization";
import { setPendingQA } from "../data/qaStore";
import { AICommitGenerator } from "./AICommitGenerator";
import { ConventionGuardModal } from "./ConventionGuardModal";

import {
  fetchProjectCommits,
  fetchProjectCommitFiles,
  fetchProjectCommitFileDiff,
  ProjectCommitSummary,
  ProjectCommitChangedFile,
  ProjectRepositoryType,
} from "../lib/api";

import {
  BORDER,
  BORDER_SUBTLE,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  TEXT_LABEL,
  ACCENT,
  ACCENT_BG,
  ACCENT_BORDER,
  GRADIENT_PAGE,
} from "../colors";

function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-black/10 ${className || ""}`}
      style={style}
    />
  );
}

const EXT_COLOR: Record<string, { bg: string; color: string }> = {
  java: { bg: "rgba(192,152,64,0.10)", color: "#C09840" },
  gradle: { bg: "rgba(65,67,27,0.08)", color: ACCENT },
  yml: { bg: "rgba(90,138,74,0.08)", color: "#5A8A4A" },
  yaml: { bg: "rgba(90,138,74,0.08)", color: "#5A8A4A" },
  ts: { bg: "rgba(107,122,80,0.10)", color: "#6B7A50" },
  tsx: { bg: "rgba(174,183,132,0.12)", color: "#7A8B5A" },
  css: { bg: "rgba(184,120,80,0.08)", color: "#B87850" },
  json: { bg: "rgba(59,130,246,0.08)", color: "#3B82F6" },
  env: { bg: "rgba(136,138,98,0.08)", color: "#888A62" },
};

const STATUS_META: Record<string, { color: string; label: string; bg: string }> = {
  modified: { color: "#C09840", label: "M", bg: "rgba(192,152,64,0.10)" },
  MODIFIED: { color: "#C09840", label: "M", bg: "rgba(192,152,64,0.10)" },
  added: { color: "#5A8A4A", label: "A", bg: "rgba(90,138,74,0.10)" },
  ADDED: { color: "#5A8A4A", label: "A", bg: "rgba(90,138,74,0.10)" },
  deleted: { color: "#B85450", label: "D", bg: "rgba(184,84,80,0.10)" },
  DELETED: { color: "#B85450", label: "D", bg: "rgba(184,84,80,0.10)" },
};

// ══════════════════════════════════════════════════════════
// WE-AI-Project 레포지토리 기본 변경 파일 및 Diff 데이터
// (https://github.com/WE-AI-Project/we-ai-server & we-ai-client)
// ══════════════════════════════════════════════════════════

const WEAI_BACKEND_FILES: CommitFile[] = [
  {
    id: "be-1",
    name: "MultiAgentController.java",
    path: "src/main/java/com/weai/controller/MultiAgentController.java",
    ext: "java",
    status: "modified",
    additions: 12,
    deletions: 3,
    diff: [
      { type: "hunk", content: "@@ -1,6 +1,9 @@ package com.weai.controller;" },
      { type: "context", oldNum: 1, newNum: 1, content: "package com.weai.controller;" },
      { type: "context", oldNum: 2, newNum: 2, content: "" },
      { type: "removed", oldNum: 3, content: "import java.util.ArrayList;" },
      { type: "removed", oldNum: 4, content: "import java.util.List;" },
      { type: "added", newNum: 3, content: "import java.util.List;" },
      { type: "added", newNum: 4, content: "import java.util.concurrent.ConcurrentHashMap;" },
      { type: "added", newNum: 5, content: "import java.util.Comparator;" },
      { type: "context", oldNum: 5, newNum: 6, content: "import org.springframework.web.bind.annotation.*;" },
      { type: "hunk", content: "@@ -14,10 +17,18 @@ public class MultiAgentController {" },
      { type: "removed", oldNum: 14, content: "    private final List<Agent> agents = new ArrayList<>();" },
      { type: "added", newNum: 17, content: "    private final ConcurrentHashMap<String, Agent> agentRegistry;" },
      { type: "added", newNum: 18, content: "    private final AgentScheduler scheduler;" },
      { type: "added", newNum: 19, content: "" },
      { type: "added", newNum: 20, content: "    @Autowired" },
      { type: "added", newNum: 21, content: "    public MultiAgentController(AgentScheduler scheduler) {" },
      { type: "added", newNum: 22, content: "        this.agentRegistry = new ConcurrentHashMap<>();" },
      { type: "added", newNum: 23, content: "        this.scheduler = scheduler;" },
      { type: "added", newNum: 24, content: "    }" },
      { type: "hunk", content: "@@ -28,5 +39,9 @@ public class MultiAgentController {" },
      { type: "context", oldNum: 28, newNum: 39, content: "    @GetMapping(\"/status\")" },
      { type: "context", oldNum: 29, newNum: 40, content: "    public ResponseEntity<List<AgentStatus>> getStatus() {" },
      { type: "removed", oldNum: 30, content: "        return ResponseEntity.ok(agents.stream().map(Agent::getStatus).toList());" },
      { type: "added", newNum: 41, content: "        return ResponseEntity.ok(" },
      { type: "added", newNum: 42, content: "            agentRegistry.values().stream()" },
      { type: "added", newNum: 43, content: "                .map(Agent::getStatus)" },
      { type: "added", newNum: 44, content: "                .sorted(Comparator.comparing(AgentStatus::getName))" },
      { type: "added", newNum: 45, content: "                .collect(Collectors.toList())" },
      { type: "added", newNum: 46, content: "        );" },
      { type: "context", oldNum: 31, newNum: 47, content: "    }" },
    ],
  },
  {
    id: "be-2",
    name: "DataSyncAgent.java",
    path: "src/main/java/com/weai/agent/DataSyncAgent.java",
    ext: "java",
    status: "added",
    additions: 31,
    deletions: 0,
    diff: [
      { type: "hunk", content: "@@ -0,0 +1,31 @@" },
      { type: "added", newNum: 1, content: "package com.weai.agent;" },
      { type: "added", newNum: 2, content: "" },
      { type: "added", newNum: 3, content: "import lombok.extern.slf4j.Slf4j;" },
      { type: "added", newNum: 4, content: "import org.springframework.stereotype.Component;" },
      { type: "added", newNum: 5, content: "import org.springframework.web.client.RestTemplate;" },
      { type: "added", newNum: 6, content: "" },
      { type: "added", newNum: 7, content: "@Component" },
      { type: "added", newNum: 8, content: "@Slf4j" },
      { type: "added", newNum: 9, content: "public class DataSyncAgent implements Agent {" },
      { type: "added", newNum: 10, content: "    private static final String AGENT_ID = \"AGT-01\";" },
      { type: "added", newNum: 11, content: "    private final RestTemplate restTemplate;" },
      { type: "added", newNum: 12, content: "" },
      { type: "added", newNum: 13, content: "    public DataSyncAgent(RestTemplate restTemplate) {" },
      { type: "added", newNum: 14, content: "        this.restTemplate = restTemplate;" },
      { type: "added", newNum: 15, content: "    }" },
      { type: "added", newNum: 16, content: "" },
      { type: "added", newNum: 17, content: "    @Override" },
      { type: "added", newNum: 18, content: "    public AgentStatus getStatus() {" },
      { type: "added", newNum: 19, content: "        return AgentStatus.builder()" },
      { type: "added", newNum: 20, content: "            .id(AGENT_ID).name(\"DataSync Alpha\").status(\"running\").build();" },
      { type: "added", newNum: 21, content: "    }" },
      { type: "added", newNum: 22, content: "" },
      { type: "added", newNum: 23, content: "    public void syncData(String endpoint) {" },
      { type: "added", newNum: 24, content: "        log.info(\"DataSync: Fetching from {}\", endpoint);" },
      { type: "added", newNum: 25, content: "        var res = restTemplate.getForEntity(endpoint, DataResponse.class);" },
      { type: "added", newNum: 26, content: "        if (res.getStatusCode().is2xxSuccessful()) {" },
      { type: "added", newNum: 27, content: "            log.info(\"DataSync: {} records synced\", res.getBody().getCount());" },
      { type: "added", newNum: 28, content: "        }" },
      { type: "added", newNum: 29, content: "    }" },
      { type: "added", newNum: 30, content: "}" },
    ],
  },
  {
    id: "be-3",
    name: "AgentScheduler.java",
    path: "src/main/java/com/weai/scheduler/AgentScheduler.java",
    ext: "java",
    status: "modified",
    additions: 18,
    deletions: 4,
    diff: [
      { type: "hunk", content: "@@ -12,8 +12,18 @@ public class AgentScheduler {" },
      { type: "context", oldNum: 12, newNum: 12, content: "    private final ScheduledExecutorService executor;" },
      { type: "context", oldNum: 13, newNum: 13, content: "    private final BlockingQueue<AgentTask> taskQueue;" },
      { type: "removed", oldNum: 14, content: "    public void dispatch(AgentTask task) {" },
      { type: "removed", oldNum: 15, content: "        taskQueue.offer(task);" },
      { type: "removed", oldNum: 16, content: "    }" },
      { type: "added", newNum: 14, content: "    public boolean dispatch(AgentTask task) {" },
      { type: "added", newNum: 15, content: "        if (task == null || task.isExpired()) return false;" },
      { type: "added", newNum: 16, content: "        boolean accepted = taskQueue.offer(task);" },
      { type: "added", newNum: 17, content: "        if (accepted) {" },
      { type: "added", newNum: 18, content: "            log.debug(\"Task [{}] queued. Queue size: {}\", task.getId(), taskQueue.size());" },
      { type: "added", newNum: 19, content: "            triggerWorker();" },
      { type: "added", newNum: 20, content: "        }" },
      { type: "added", newNum: 21, content: "        return accepted;" },
      { type: "added", newNum: 22, content: "    }" },
    ],
  },
  {
    id: "be-4",
    name: "application-dev.yml",
    path: "src/main/resources/application-dev.yml",
    ext: "yml",
    status: "modified",
    additions: 8,
    deletions: 1,
    diff: [
      { type: "hunk", content: "@@ -1,12 +1,18 @@ spring:" },
      { type: "context", oldNum: 1, newNum: 1, content: "spring:" },
      { type: "context", oldNum: 2, newNum: 2, content: "  profiles:" },
      { type: "context", oldNum: 3, newNum: 3, content: "    active: dev" },
      { type: "hunk", content: "@@ -8,6 +8,14 @@ spring.datasource:" },
      { type: "context", oldNum: 8, newNum: 8, content: "spring.datasource:" },
      { type: "removed", oldNum: 9, content: "  url: jdbc:h2:mem:testdb" },
      { type: "added", newNum: 9, content: "  url: jdbc:h2:mem:weaidb;DB_CLOSE_DELAY=-1" },
      { type: "context", oldNum: 10, newNum: 10, content: "  username: sa" },
      { type: "context", oldNum: 11, newNum: 11, content: "  password:" },
      { type: "added", newNum: 12, content: "" },
      { type: "added", newNum: 13, content: "weai:" },
      { type: "added", newNum: 14, content: "  agents:" },
      { type: "added", newNum: 15, content: "    max-threads: 6" },
      { type: "added", newNum: 16, content: "    retry-delay-ms: 5000" },
      { type: "added", newNum: 17, content: "  logging:" },
      { type: "added", newNum: 18, content: "    agent-events: true" },
    ],
  },
  {
    id: "be-5",
    name: "build.gradle",
    path: "build.gradle",
    ext: "gradle",
    status: "modified",
    additions: 5,
    deletions: 2,
    diff: [
      { type: "hunk", content: "@@ -12,8 +12,12 @@ dependencies {" },
      { type: "context", oldNum: 12, newNum: 12, content: "    implementation 'org.springframework.boot:spring-boot-starter-web'" },
      { type: "context", oldNum: 13, newNum: 13, content: "    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'" },
      { type: "removed", oldNum: 14, content: "    implementation 'org.springframework.boot:spring-boot-starter-test'" },
      { type: "added", newNum: 14, content: "    implementation 'org.springframework.boot:spring-boot-starter-actuator'" },
      { type: "added", newNum: 15, content: "    implementation 'com.fasterxml.jackson.core:jackson-databind:2.15.2'" },
      { type: "added", newNum: 16, content: "    implementation 'org.springframework.ai:spring-ai-core:0.8.1'" },
      { type: "context", oldNum: 15, newNum: 17, content: "    testImplementation 'org.junit.jupiter:junit-jupiter:5.10.0'" },
      { type: "removed", oldNum: 16, content: "    testRuntimeOnly 'org.junit.platform:junit-platform-launcher'" },
      { type: "added", newNum: 18, content: "    testRuntimeOnly 'org.junit.platform:junit-platform-launcher:1.10.0'" },
    ],
  },
  {
    id: "be-6",
    name: "settings.gradle",
    path: "settings.gradle",
    ext: "gradle",
    status: "modified",
    additions: 4,
    deletions: 2,
    diff: [
      { type: "hunk", content: "@@ -1,8 +1,10 @@" },
      { type: "removed", oldNum: 1, content: "rootProject.name = 'weai'" },
      { type: "added", newNum: 1, content: "rootProject.name = 'weai-backend'" },
      { type: "context", oldNum: 2, newNum: 2, content: "" },
      { type: "context", oldNum: 3, newNum: 3, content: "pluginManagement {" },
      { type: "context", oldNum: 4, newNum: 4, content: "    repositories {" },
      { type: "added", newNum: 5, content: "        mavenLocal()" },
      { type: "context", oldNum: 5, newNum: 6, content: "        gradlePluginPortal()" },
      { type: "context", oldNum: 6, newNum: 7, content: "        mavenCentral()" },
    ],
  },
  {
    id: "be-7",
    name: ".env.dev",
    path: ".env.dev",
    ext: "env",
    status: "deleted",
    additions: 0,
    deletions: 6,
    diff: [
      { type: "hunk", content: "@@ -1,6 +0,0 @@" },
      { type: "removed", oldNum: 1, content: "DB_USER=sa" },
      { type: "removed", oldNum: 2, content: "DB_PASS=secret" },
      { type: "removed", oldNum: 3, content: "JWT_SECRET=weai-dev-secret-key-12345" },
      { type: "removed", oldNum: 4, content: "AGENT_PORT=8081" },
      { type: "removed", oldNum: 5, content: "AI_MODEL=gpt-4o-mini" },
      { type: "removed", oldNum: 6, content: "SPRING_PROFILES_ACTIVE=dev" },
    ],
  },
];

const WEAI_FRONTEND_FILES: CommitFile[] = [
  {
    id: "fe-1",
    name: "App.tsx",
    path: "src/app/App.tsx",
    ext: "tsx",
    status: "modified",
    additions: 32,
    deletions: 8,
    diff: [
      { type: "hunk", content: "@@ -670,6 +670,12 @@ export default function App() {" },
      { type: "context", oldNum: 670, newNum: 670, content: "      case 'Changes': return <ChangesPage projectId={projectId} />;" },
      { type: "context", oldNum: 671, newNum: 671, content: "      case 'Commits': return <CommitDiffPage projectId={projectId} />;" },
      { type: "added", newNum: 672, content: "      case 'Calendar': return <CalendarPage />;" },
      { type: "added", newNum: 673, content: "      case 'Galaxy': return <SynAIpseGalaxyPage />;" },
      { type: "context", oldNum: 672, newNum: 674, content: "      case 'Chat': return <ChatPage projectId={projectId} />;" },
      { type: "hunk", content: "@@ -710,8 +716,16 @@ export default function App() {" },
      { type: "removed", oldNum: 710, content: "        <div className='sidebar-legacy'>" },
      { type: "added", newNum: 717, content: "        <div className='sidebar-split-container'>" },
      { type: "added", newNum: 718, content: "          <SplitTabsHeader activeTab={activeTab} onSelect={setActiveTab} />" },
    ],
  },
  {
    id: "fe-2",
    name: "CommitDiffPage.tsx",
    path: "src/app/components/CommitDiffPage.tsx",
    ext: "tsx",
    status: "modified",
    additions: 45,
    deletions: 12,
    diff: [
      { type: "hunk", content: "@@ -35,12 +35,28 @@ export function CommitDiffPage() {" },
      { type: "removed", oldNum: 35, content: "  const [mode, setMode] = useState<'backend'|'frontend'|'split'>('split');" },
      { type: "added", newNum: 35, content: "  const [isSplit, setIsSplit] = useState<boolean>(false);" },
      { type: "added", newNum: 36, content: "  const [activeParts, setActiveParts] = useState<string[]>(['BACKEND', 'FRONTEND']);" },
      { type: "added", newNum: 37, content: "  const [selectedPart, setSelectedPart] = useState<string>('BACKEND');" },
      { type: "hunk", content: "@@ -720,10 +736,22 @@ export function CommitDiffPage() {" },
      { type: "added", newNum: 736, content: "        {/* Split View Toggle Switch */}" },
      { type: "added", newNum: 737, content: "        <button onClick={() => setIsSplit(!isSplit)} className='split-toggle'>" },
      { type: "added", newNum: 738, content: "          <Columns2 className='w-3.5 h-3.5' />" },
      { type: "added", newNum: 739, content: "          <span>Split View</span>" },
      { type: "added", newNum: 740, content: "        </button>" },
    ],
  },
  {
    id: "fe-3",
    name: "AgentCard.tsx",
    path: "src/app/components/AgentCard.tsx",
    ext: "tsx",
    status: "modified",
    additions: 14,
    deletions: 3,
    diff: [
      { type: "hunk", content: "@@ -1,5 +1,7 @@ import React from 'react';" },
      { type: "removed", oldNum: 1, content: "import React from 'react';" },
      { type: "added", newNum: 1, content: "import { useState, useCallback } from 'react';" },
      { type: "added", newNum: 2, content: "import { motion } from 'motion/react';" },
      { type: "context", oldNum: 2, newNum: 3, content: "import { Bot, Cpu } from 'lucide-react';" },
      { type: "hunk", content: "@@ -8,8 +10,16 @@ export function AgentCard({ agent, onToggle }) {" },
      { type: "context", oldNum: 8, newNum: 10, content: "export function AgentCard({ agent, onToggle }) {" },
      { type: "removed", oldNum: 9, content: "  return (" },
      { type: "added", newNum: 11, content: "  const [expanded, setExpanded] = useState(false);" },
      { type: "added", newNum: 12, content: "" },
      { type: "added", newNum: 13, content: "  const handleToggle = useCallback(() => {" },
      { type: "added", newNum: 14, content: "    onToggle(agent.id);" },
      { type: "added", newNum: 15, content: "  }, [agent.id, onToggle]);" },
      { type: "added", newNum: 16, content: "" },
      { type: "added", newNum: 17, content: "  return (" },
      { type: "added", newNum: 18, content: "    <motion.div" },
      { type: "added", newNum: 19, content: "      layout" },
      { type: "added", newNum: 20, content: "      onClick={() => setExpanded(e => !e)}" },
      { type: "added", newNum: 21, content: "    >" },
      { type: "context", oldNum: 10, newNum: 22, content: "      <div className=\"agent-header\">" },
      { type: "context", oldNum: 11, newNum: 23, content: "        <Bot className=\"w-4 h-4\" />" },
      { type: "removed", oldNum: 12, content: "        <span>{agent.name}</span>" },
      { type: "added", newNum: 24, content: "        <span className=\"font-semibold\">{agent.name}</span>" },
    ],
  },
  {
    id: "fe-4",
    name: "useAgents.ts",
    path: "src/app/hooks/useAgents.ts",
    ext: "ts",
    status: "added",
    additions: 23,
    deletions: 0,
    diff: [
      { type: "hunk", content: "@@ -0,0 +1,23 @@" },
      { type: "added", newNum: 1, content: "import { useState, useEffect, useRef } from 'react';" },
      { type: "added", newNum: 2, content: "" },
      { type: "added", newNum: 3, content: "type AgentStatus = 'running' | 'idle' | 'error' | 'stopped';" },
      { type: "added", newNum: 4, content: "" },
      { type: "added", newNum: 5, content: "export function useAgents(projectId: string) {" },
      { type: "added", newNum: 6, content: "  const [agents, setAgents] = useState([]);" },
      { type: "added", newNum: 7, content: "  const [loading, setLoading] = useState(true);" },
      { type: "added", newNum: 8, content: "  const pollingRef = useRef<NodeJS.Timeout | null>(null);" },
      { type: "added", newNum: 9, content: "" },
      { type: "added", newNum: 10, content: "  useEffect(() => {" },
      { type: "added", newNum: 11, content: "    fetchAgents();" },
      { type: "added", newNum: 12, content: "    pollingRef.current = setInterval(fetchAgents, 3000);" },
      { type: "added", newNum: 13, content: "    return () => clearInterval(pollingRef.current!);" },
      { type: "added", newNum: 14, content: "  }, [projectId]);" },
      { type: "added", newNum: 15, content: "" },
      { type: "added", newNum: 16, content: "  async function fetchAgents() {" },
      { type: "added", newNum: 17, content: "    const res = await fetch(`/api/agents/status?project=${projectId}`);" },
      { type: "added", newNum: 18, content: "    setAgents(await res.json());" },
      { type: "added", newNum: 19, content: "    setLoading(false);" },
      { type: "added", newNum: 20, content: "  }" },
      { type: "added", newNum: 21, content: "" },
      { type: "added", newNum: 22, content: "  return { agents, loading };" },
      { type: "added", newNum: 23, content: "}" },
    ],
  },
  {
    id: "fe-5",
    name: "apiClient.ts",
    path: "src/app/api/apiClient.ts",
    ext: "ts",
    status: "modified",
    additions: 11,
    deletions: 3,
    diff: [
      { type: "hunk", content: "@@ -3,7 +3,14 @@ const BASE_URL = '/api';" },
      { type: "context", oldNum: 3, newNum: 3, content: "const BASE_URL = '/api';" },
      { type: "removed", oldNum: 4, content: "export async function fetchAgents() {" },
      { type: "removed", oldNum: 5, content: "  return fetch(`${BASE_URL}/agents`).then(r => r.json());" },
      { type: "removed", oldNum: 6, content: "}" },
      { type: "added", newNum: 4, content: "const DEFAULT_HEADERS = {" },
      { type: "added", newNum: 5, content: "  'Content-Type': 'application/json'," },
      { type: "added", newNum: 6, content: "  'X-Client': 'weai-dashboard/1.0'," },
      { type: "added", newNum: 7, content: "};" },
      { type: "added", newNum: 8, content: "" },
      { type: "added", newNum: 9, content: "export async function fetchAgents(projectId: string) {" },
      { type: "added", newNum: 10, content: "  const res = await fetch(`${BASE_URL}/agents/status?project=${projectId}`, {" },
      { type: "added", newNum: 11, content: "    headers: DEFAULT_HEADERS," },
      { type: "added", newNum: 12, content: "  });" },
      { type: "added", newNum: 13, content: "  if (!res.ok) throw new Error(`HTTP ${res.status}`);" },
      { type: "added", newNum: 14, content: "  return res.json();" },
      { type: "added", newNum: 15, content: "}" },
    ],
  },
  {
    id: "fe-6",
    name: "vite.config.ts",
    path: "vite.config.ts",
    ext: "ts",
    status: "modified",
    additions: 9,
    deletions: 2,
    diff: [
      { type: "hunk", content: "@@ -185,6 +185,13 @@ export default defineConfig(({ mode }) => {" },
      { type: "context", oldNum: 185, newNum: 185, content: "    server: {" },
      { type: "context", oldNum: 186, newNum: 186, content: "      proxy: {" },
      { type: "removed", oldNum: 187, content: "        '/api': 'http://localhost:8080'," },
      { type: "added", newNum: 187, content: "        '/api': {" },
      { type: "added", newNum: 188, content: "          target: proxyTarget," },
      { type: "added", newNum: 189, content: "          changeOrigin: true," },
      { type: "added", newNum: 190, content: "        }," },
      { type: "context", oldNum: 188, newNum: 191, content: "      }," },
      { type: "context", oldNum: 189, newNum: 192, content: "    }," },
    ],
  },
  {
    id: "fe-7",
    name: "package.json",
    path: "package.json",
    ext: "json",
    status: "modified",
    additions: 4,
    deletions: 1,
    diff: [
      { type: "hunk", content: "@@ -10,7 +10,10 @@" },
      { type: "context", oldNum: 10, newNum: 10, content: "    \"dev\": \"vite\"," },
      { type: "removed", oldNum: 11, content: "    \"dev:preview\": \"vite --mode preview\"" },
      { type: "added", newNum: 11, content: "    \"dev:preview\": \"vite --mode preview\"," },
      { type: "added", newNum: 12, content: "    \"start\": \"vite\"" },
      { type: "context", oldNum: 12, newNum: 13, content: "  }," },
    ],
  },
];

// ── QA 확인 모달 ──
function QAModal({
  show,
  commitMsg,
  onQAYes,
  onQANo,
  onClose,
}: {
  show: boolean;
  commitMsg: string;
  onQAYes: () => void;
  onQANo: () => void;
  onClose: () => void;
}) {
  if (!show) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.28)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          width: 360,
          background: "rgba(255,255,255,0.97)",
          border: `1px solid ${BORDER}`,
          boxShadow: "0 12px 48px rgba(0,0,0,0.16)",
        }}
      >
        <div className="p-7 text-center">
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, rgba(224,231,255,0.7), rgba(221,214,254,0.6))",
            }}
          >
            <ShieldCheck className="w-7 h-7" style={{ color: ACCENT }} />
          </div>
          <h3 className="text-sm font-bold mb-1" style={{ color: TEXT_PRIMARY }}>
            커밋 전 AI QA를 실행할까요?
          </h3>
          <p className="text-[11px] mb-3" style={{ color: TEXT_SECONDARY }}>
            코드 품질 및 잠재적 버그를 자동으로 검사합니다.
          </p>
          <div
            className="px-3 py-2 rounded-xl text-left font-mono text-[10px] mb-6"
            style={{ background: "rgba(0,0,0,0.04)", color: TEXT_SECONDARY }}
          >
            {commitMsg}
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={onQANo}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold"
              style={{ background: "rgba(0,0,0,0.06)", color: TEXT_SECONDARY }}
            >
              아니오, 바로 커밋
            </button>
            <button
              onClick={onQAYes}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold"
              style={{
                background: "linear-gradient(135deg, #41431B, #62683A)",
                color: "rgba(255,255,255,0.95)",
                boxShadow: "0 4px 14px rgba(65,67,27,0.24)",
              }}
            >
              예, AI QA 실행
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 커밋 완료 모달 ──
function CommittedModal({
  show,
  msg,
  onClose,
}: {
  show: boolean;
  msg: string;
  onClose: () => void;
}) {
  if (!show) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.24)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          width: 340,
          background: "rgba(255,255,255,0.97)",
          border: `1px solid ${BORDER}`,
          boxShadow: "0 12px 48px rgba(0,0,0,0.16)",
        }}
      >
        <div className="p-7 text-center">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 rounded-lg hover:bg-black/[0.06]"
          >
            <X className="w-3.5 h-3.5" style={{ color: TEXT_TERTIARY }} />
          </button>
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: "rgba(16,185,129,0.10)" }}
          >
            <CheckCircle2 className="w-7 h-7" style={{ color: "#10b981" }} />
          </div>
          <h3 className="text-sm font-bold mb-1" style={{ color: TEXT_PRIMARY }}>
            커밋 &amp; 푸시 완료!
          </h3>
          <p className="text-[11px] mb-4" style={{ color: TEXT_SECONDARY }}>
            변경사항이 원격 저장소에 반영되었습니다.
          </p>
          <div
            className="text-left px-3 py-2.5 rounded-xl font-mono text-[10px] mb-5"
            style={{ background: "#0d1117", color: "#7ee787" }}
          >
            [main a3f9d21] {msg}
            <br />
            <span style={{ color: "#8b949e" }}>→ remote: origin/main ✓</span>
          </div>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-xs font-semibold"
            style={{ background: "rgba(0,0,0,0.06)", color: TEXT_SECONDARY }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 파일 항목 ──
function FileRow({
  file,
  staged,
  selected,
  onToggle,
  onSelect,
}: {
  file: CommitFile;
  staged: boolean;
  selected: boolean;
  onToggle: (e: React.MouseEvent) => void;
  onSelect: () => void;
}) {
  const ec = EXT_COLOR[file.ext] ?? { bg: "rgba(0,0,0,0.05)", color: TEXT_SECONDARY };
  const sm = STATUS_META[file.status] ?? {
    color: "#C09840",
    label: "M",
    bg: "rgba(192,152,64,0.10)",
  };

  return (
    <div
      onClick={onSelect}
      className="flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-all"
      style={{
        borderBottom: `1px solid ${BORDER_SUBTLE}`,
        background: selected ? "rgba(65,67,27,0.08)" : "transparent",
        borderLeft: selected ? "2.5px solid" : "2.5px solid transparent",
        borderImage: selected ? "linear-gradient(180deg, #41431B, #AEB784) 1" : "none",
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.background = "rgba(0,0,0,0.025)";
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.background = "transparent";
      }}
    >
      {/* 체크박스 */}
      <div
        onClick={onToggle}
        className="w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 cursor-pointer transition-all"
        style={{
          background: staged ? ACCENT : "transparent",
          border: `1.5px solid ${staged ? ACCENT : "rgba(0,0,0,0.22)"}`,
        }}
      >
        {staged && (
          <div className="w-1.5 h-1 border-b-[1.5px] border-r-[1.5px] border-white rotate-45 translate-y-[-1px]" />
        )}
      </div>

      {/* 확장자 뱃지 */}
      <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded shrink-0" style={ec}>
        .{file.ext}
      </span>

      {/* 파일명 */}
      <span
        className="flex-1 text-[11px] truncate"
        style={{ color: staged ? TEXT_PRIMARY : TEXT_TERTIARY }}
        title={file.path}
      >
        {file.name}
      </span>

      {/* +/- */}
      <div className="flex items-center gap-1 shrink-0 text-[9px]">
        {file.additions > 0 && <span style={{ color: "#10b981" }}>+{file.additions}</span>}
        {file.deletions > 0 && <span style={{ color: "#ef4444" }}>−{file.deletions}</span>}
      </div>

      {/* 상태 */}
      <span
        className="text-[8px] font-bold px-1.5 py-0.5 rounded shrink-0"
        style={{ background: sm.bg, color: sm.color, opacity: staged ? 1 : 0.45 }}
      >
        {sm.label}
      </span>
    </div>
  );
}

export function ChangesPage({
  projectId = 0,
  onNavigateQA,
}: {
  projectId?: number | null;
  onNavigateQA?: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [repoType, setRepoType] = useState<ProjectRepositoryType>("BACKEND");

  // 변경된 파일 목록 & 캐시
  const [changedFiles, setChangedFiles] = useState<CommitFile[]>(WEAI_BACKEND_FILES);
  const [staged, setStaged] = useState<Set<string>>(() => new Set(WEAI_BACKEND_FILES.map((f) => f.id)));
  const [selectedFile, setSelectedFile] = useState<CommitFile | null>(() => WEAI_BACKEND_FILES[0] ?? null);

  const [message, setMessage] = useState("");
  const [showQA, setShowQA] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [doneMsg, setDoneMsg] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [stagedOpen, setStagedOpen] = useState(true);
  const [unstagedOpen, setUnstagedOpen] = useState(true);

  // 브랜치 시각화 모드
  const [showBranch, setShowBranch] = useState(false);
  // 컨벤션 가드
  const [showConvention, setShowConvention] = useState(false);

  // 🌟 API 호출 및 WE-AI-Project 기본 데이터 동기화
  useEffect(() => {
    async function loadCommitData() {
      setIsLoading(true);
      const defaultCatalog = repoType === "BACKEND" ? WEAI_BACKEND_FILES : WEAI_FRONTEND_FILES;

      if (!projectId) {
        setChangedFiles(defaultCatalog);
        setStaged(new Set(defaultCatalog.map((f) => f.id)));
        setSelectedFile(defaultCatalog[0] ?? null);
        setIsLoading(false);
        return;
      }

      try {
        const commitData = await fetchProjectCommits(projectId, repoType, 1).catch(() => null);

        if (commitData && commitData.commits && commitData.commits.length > 0) {
          const hash = commitData.commits[0].commitHash;
          const filesData = await fetchProjectCommitFiles(projectId, repoType, hash).catch(() => null);

          if (filesData && filesData.files && filesData.files.length > 0) {
            const mappedFiles: CommitFile[] = filesData.files.map((f) => ({
              id: f.path,
              name: f.fileName,
              path: f.path,
              ext: f.extension || (f.fileName.includes(".") ? f.fileName.split(".").pop() ?? "" : ""),
              status: f.status.toLowerCase() as any,
              additions: f.additions,
              deletions: f.deletions,
              diff: [],
            }));

            // 첫 번째 파일의 diff 미리 로드
            if (mappedFiles.length > 0) {
              const diffRes = await fetchProjectCommitFileDiff(projectId, repoType, hash, mappedFiles[0].path).catch(() => null);
              if (diffRes && diffRes.diff) {
                // diff 파싱
                const lines = diffRes.diff.split("\n").map((content) => {
                  if (content.startsWith("@@")) return { type: "hunk" as const, content };
                  if (content.startsWith("+")) return { type: "added" as const, content: content.slice(1) };
                  if (content.startsWith("-")) return { type: "removed" as const, content: content.slice(1) };
                  return { type: "context" as const, content: content.slice(1) };
                });
                mappedFiles[0].diff = lines;
              }
            }

            setChangedFiles(mappedFiles);
            setStaged(new Set(mappedFiles.map((f) => f.id)));
            setSelectedFile(mappedFiles[0] ?? null);
            setIsLoading(false);
            return;
          }
        }
      } catch (e) {
        console.warn("API 파일 조회 실패 - WE-AI 기본 카탈로그 사용", e);
      }

      // API에 커밋이 없거나 조회 실패 시 WE-AI 프로젝트 카탈로그 자동 사용
      setChangedFiles(defaultCatalog);
      setStaged(new Set(defaultCatalog.map((f) => f.id)));
      setSelectedFile(defaultCatalog[0] ?? null);
      setIsLoading(false);
    }

    void loadCommitData();
  }, [projectId, repoType]);

  const stagedFiles = changedFiles.filter((f) => staged.has(f.id));
  const unstagedFiles = changedFiles.filter((f) => !staged.has(f.id));
  const stagedCount = staged.size;

  const toggleStage = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setStaged((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const stageAll = () => setStaged(new Set(changedFiles.map((f) => f.id)));
  const unstageAll = () => setStaged(new Set());

  const handleCommitClick = () => {
    if (!stagedCount || !message.trim()) return;
    setShowConvention(true);
  };

  const handleConventionIgnore = () => {
    setShowConvention(false);
    setShowQA(true);
  };

  const handleConventionFix = () => {
    setShowConvention(false);
  };

  const handleQAYes = () => {
    setShowQA(false);
    setPendingQA({
      message: message.trim(),
      author: "시연용 마스터",
      branch: "main",
      files: stagedFiles.map((f) => f.name),
      hash: Math.random().toString(36).slice(2, 9).toUpperCase(),
      time: new Date().toISOString(),
    });
    onNavigateQA?.();
  };

  const doCommit = () => {
    const msg = message.trim();
    setHistory((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 4)]);
    setDoneMsg(msg);
    setMessage("");
    setStaged(new Set());
    setSelectedFile(null);
    setShowQA(false);
    setShowDone(true);
  };

  const totalAdd = changedFiles.reduce((s, f) => s + f.additions, 0);
  const totalDel = changedFiles.reduce((s, f) => s + f.deletions, 0);

  return (
    <>
      <QAModal
        show={showQA}
        commitMsg={message.trim()}
        onQAYes={handleQAYes}
        onQANo={doCommit}
        onClose={() => setShowQA(false)}
      />
      <CommittedModal show={showDone} msg={doneMsg} onClose={() => setShowDone(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ── 타이틀바 ── */}
        <div
          className="flex items-center gap-3 px-5 h-11 shrink-0"
          style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(251,252,250,0.98)" }}
        >
          <GitCommit className="w-4 h-4 shrink-0" style={{ color: ACCENT }} />
          <p className="text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>
            Changes
          </p>

          {/* 레포지토리 선택 (WE-AI-Project Server / Client) */}
          <div className="ml-2 flex items-center bg-black/5 rounded-lg p-0.5 border border-black/5">
            <button
              onClick={() => setRepoType("BACKEND")}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold rounded-md transition-all"
              style={{
                background: repoType === "BACKEND" ? "#ffffff" : "transparent",
                color: repoType === "BACKEND" ? TEXT_PRIMARY : TEXT_TERTIARY,
                boxShadow: repoType === "BACKEND" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              <Server className="w-3 h-3" style={{ color: "#62683A" }} />
              Backend (we-ai-server)
            </button>
            <button
              onClick={() => setRepoType("FRONTEND")}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold rounded-md transition-all"
              style={{
                background: repoType === "FRONTEND" ? "#ffffff" : "transparent",
                color: repoType === "FRONTEND" ? TEXT_PRIMARY : TEXT_TERTIARY,
                boxShadow: repoType === "FRONTEND" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              <Monitor className="w-3 h-3" style={{ color: "#0284c7" }} />
              Frontend (we-ai-client)
            </button>
          </div>

          <span className="text-[10px] ml-1" style={{ color: TEXT_TERTIARY }}>
            {changedFiles.length} files changed
          </span>
          <span className="text-[10px]" style={{ color: "#10b981" }}>
            +{totalAdd}
          </span>
          <span className="text-[10px]" style={{ color: "#ef4444" }}>
            −{totalDel}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowBranch((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: showBranch ? "rgba(65,67,27,0.12)" : "rgba(0,0,0,0.05)",
                color: showBranch ? ACCENT : TEXT_SECONDARY,
                border: `1px solid ${showBranch ? ACCENT : BORDER}`,
              }}
            >
              <GitBranch className="w-3.5 h-3.5" />
              {showBranch ? "변경 파일 목록" : "브랜치 시각화"}
            </button>
          </div>
        </div>

        {/* ── 본문 영역 ── */}
        {showBranch ? (
          <div className="flex-1 flex overflow-hidden">
            <BranchVisualization />
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* ── 왼쪽: 파일 트리 + 커밋 패널 ── */}
            <div
              className="w-72 shrink-0 flex flex-col overflow-hidden"
              style={{ borderRight: `1px solid ${BORDER}`, background: "rgba(250,250,248,0.95)" }}
            >
              <div className="flex-1 overflow-y-auto">
                {/* Staged 섹션 */}
                <div className="pt-2">
                  <button
                    onClick={() => setStagedOpen((o) => !o)}
                    className="w-full flex items-center gap-1.5 px-3 py-1.5 text-left hover:bg-black/[0.03]"
                  >
                    {stagedOpen ? (
                      <ChevronDown className="w-3 h-3" style={{ color: TEXT_TERTIARY }} />
                    ) : (
                      <ChevronRight className="w-3 h-3" style={{ color: TEXT_TERTIARY }} />
                    )}
                    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: ACCENT }}>
                      Staged Changes
                    </span>
                    <span
                      className="ml-auto text-[9px] font-bold px-1.5 py-0.2 rounded-full"
                      style={{ background: "rgba(65,67,27,0.12)", color: ACCENT }}
                    >
                      {stagedFiles.length}
                    </span>
                    {stagedFiles.length > 0 && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          unstageAll();
                        }}
                        className="text-[9px] hover:underline cursor-pointer ml-1"
                        style={{ color: TEXT_TERTIARY }}
                      >
                        Unstage All
                      </span>
                    )}
                  </button>

                  {stagedOpen && isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 border-b border-black/5">
                        <Skeleton className="w-3.5 h-3.5 rounded" />
                        <Skeleton className="w-6 h-3 rounded" />
                        <Skeleton className="flex-1 h-3" />
                      </div>
                    ))
                  ) : stagedOpen && stagedFiles.length > 0 ? (
                    stagedFiles.map((file) => (
                      <FileRow
                        key={file.id}
                        file={file}
                        staged={true}
                        selected={selectedFile?.id === file.id}
                        onToggle={(e) => toggleStage(e, file.id)}
                        onSelect={() => setSelectedFile(file)}
                      />
                    ))
                  ) : stagedOpen && stagedFiles.length === 0 ? (
                    <div className="px-4 py-3 text-center">
                      <p className="text-[10px]" style={{ color: TEXT_TERTIARY }}>
                        스테이징된 파일 없음
                      </p>
                    </div>
                  ) : null}
                </div>

                {/* Changes (Unstaged) 섹션 */}
                <div className="pt-2">
                  <button
                    onClick={() => setUnstagedOpen((o) => !o)}
                    className="w-full flex items-center gap-1.5 px-3 py-1.5 text-left hover:bg-black/[0.03]"
                  >
                    {unstagedOpen ? (
                      <ChevronDown className="w-3 h-3" style={{ color: TEXT_TERTIARY }} />
                    ) : (
                      <ChevronRight className="w-3 h-3" style={{ color: TEXT_TERTIARY }} />
                    )}
                    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: TEXT_LABEL }}>
                      Changes (Unstaged)
                    </span>
                    <span
                      className="ml-auto text-[9px] font-bold px-1.5 py-0.2 rounded-full"
                      style={{ background: "rgba(0,0,0,0.06)", color: TEXT_SECONDARY }}
                    >
                      {unstagedFiles.length}
                    </span>
                    {unstagedFiles.length > 0 && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          stageAll();
                        }}
                        className="text-[9px] hover:underline cursor-pointer ml-1"
                        style={{ color: TEXT_TERTIARY }}
                      >
                        Stage All
                      </span>
                    )}
                  </button>

                  {unstagedOpen && isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 border-b border-black/5">
                        <Skeleton className="w-3.5 h-3.5 rounded" />
                        <Skeleton className="w-6 h-3 rounded" />
                        <Skeleton className="flex-1 h-3" />
                      </div>
                    ))
                  ) : unstagedOpen && unstagedFiles.length > 0 ? (
                    unstagedFiles.map((file) => (
                      <FileRow
                        key={file.id}
                        file={file}
                        staged={false}
                        selected={selectedFile?.id === file.id}
                        onToggle={(e) => toggleStage(e, file.id)}
                        onSelect={() => setSelectedFile(file)}
                      />
                    ))
                  ) : unstagedOpen && unstagedFiles.length === 0 ? (
                    <div className="px-4 py-3 text-center">
                      <p className="text-[10px]" style={{ color: TEXT_TERTIARY }}>
                        모든 파일이 스테이징됨
                      </p>
                    </div>
                  ) : null}
                </div>

                {/* 최근 커밋 히스토리 */}
                {!isLoading && history.length > 0 && (
                  <div className="px-3 pt-3 pb-2" style={{ borderTop: `1px solid ${BORDER_SUBTLE}` }}>
                    <p className="text-[9px] font-semibold uppercase tracking-wider mb-2" style={{ color: TEXT_LABEL }}>
                      Recent Commits
                    </p>
                    <div className="space-y-1.5">
                      {history.map((h, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5" style={{ color: "#10b981" }} />
                          <p className="text-[9px] leading-relaxed" style={{ color: TEXT_SECONDARY }}>
                            {h}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── 커밋 작성 & 푸시 패널 ── */}
              <div className="shrink-0 p-3 space-y-2.5" style={{ borderTop: `1px solid ${BORDER}` }}>
                {isLoading ? (
                  <div className="space-y-2.5">
                    <Skeleton className="h-6 w-1/2 rounded-full" />
                    <Skeleton className="h-16 w-full rounded-xl" />
                    <Skeleton className="h-8 w-full rounded-xl" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: "linear-gradient(135deg, #DDE2D3, #F0F1EE)" }}
                      >
                        <span className="text-[8px] font-bold" style={{ color: ACCENT }}>
                          시
                        </span>
                      </div>
                      <span className="text-[10px]" style={{ color: TEXT_SECONDARY }}>
                        시연용 마스터
                      </span>
                      <div className="flex items-center gap-1 ml-auto">
                        <GitBranch className="w-3 h-3" style={{ color: TEXT_TERTIARY }} />
                        <span className="text-[9px] font-mono" style={{ color: TEXT_TERTIARY }}>
                          main
                        </span>
                      </div>
                    </div>

                    {/* ── AI 커밋 메시지 자동 생성기 ── */}
                    <AICommitGenerator
                      projectId={projectId ?? 0}
                      stagedFiles={stagedFiles}
                      onApply={(msg) => setMessage(msg)}
                    />

                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="커밋 메시지를 입력하세요 (필수)"
                      rows={3}
                      className="w-full px-3 py-2 text-[11px] rounded-xl outline-none resize-none transition-all"
                      style={{
                        background: "#FFFFFF",
                        border: `1px solid ${message.trim() ? ACCENT_BORDER : BORDER}`,
                        color: TEXT_PRIMARY,
                        lineHeight: "1.5",
                      }}
                    />

                    <div className="flex items-center gap-1 text-[9px]" style={{ color: TEXT_TERTIARY }}>
                      <FileCode2 className="w-3 h-3 shrink-0" />
                      <span>
                        {stagedCount} file{stagedCount !== 1 ? "s" : ""} staged
                      </span>
                      <span className="ml-auto" style={{ color: "#10b981" }}>
                        +{stagedFiles.reduce((s, f) => s + f.additions, 0)}
                      </span>
                      <span style={{ color: "#ef4444" }}>
                        −{stagedFiles.reduce((s, f) => s + f.deletions, 0)}
                      </span>
                    </div>

                    <button
                      onClick={handleCommitClick}
                      disabled={!stagedCount || !message.trim()}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-semibold transition-all"
                      style={{
                        background:
                          stagedCount > 0 && message.trim()
                            ? "linear-gradient(135deg, #41431B 0%, #62683A 100%)"
                            : "rgba(0,0,0,0.07)",
                        color: stagedCount > 0 && message.trim() ? "rgba(255,255,255,0.95)" : TEXT_TERTIARY,
                        boxShadow:
                          stagedCount > 0 && message.trim() ? "0 4px 16px rgba(65,67,27,0.24)" : "none",
                        cursor: stagedCount > 0 && message.trim() ? "pointer" : "not-allowed",
                      }}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Commit &amp; Push to main
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* ── 오른쪽: Diff Viewer ── */}
            <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#0d1117" }}>
              {isLoading ? (
                <div className="flex-1 p-6 space-y-4">
                  <Skeleton className="h-6 w-1/3 bg-white/10" />
                  <Skeleton className="h-4 w-1/4 bg-white/5" />
                  <div className="mt-8 space-y-2">
                    <Skeleton className="h-4 w-3/4 bg-white/5" />
                    <Skeleton className="h-4 w-1/2 bg-white/5" />
                    <Skeleton className="h-4 w-5/6 bg-white/5" />
                  </div>
                </div>
              ) : selectedFile ? (
                <FileDiffViewer file={selectedFile} />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  >
                    <GitCommit className="w-8 h-8" style={{ color: "#30363d" }} />
                  </div>
                  <div className="text-center">
                    <p className="text-[13px] font-semibold mb-1" style={{ color: "#6e7681" }}>
                      파일을 선택하세요
                    </p>
                    <p className="text-[11px]" style={{ color: "#484f58" }}>
                      왼쪽 목록에서 파일을 클릭하면 변경 내용이 표시됩니다
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── 컨벤션 가드 모달 ── */}
      {showConvention && (
        <ConventionGuardModal
          stagedFiles={stagedFiles.map((f) => f.name)}
          userName="시연용 마스터"
          onIgnore={handleConventionIgnore}
          onFix={handleConventionFix}
          onClose={() => setShowConvention(false)}
        />
      )}
    </>
  );
}