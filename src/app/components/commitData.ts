// ── 공유 Diff / Commit 데이터 ──

export type DiffLineType = "added" | "removed" | "context" | "hunk";
export type FileStatus   = "modified" | "added" | "deleted";

export type DiffLine = {
  type:    DiffLineType;
  oldNum?: number;
  newNum?: number;
  content: string;
};

export type CommitFile = {
  id:        string;
  name:      string;
  path:      string;
  ext:       string;
  status:    FileStatus;
  additions: number;
  deletions: number;
  diff:      DiffLine[];
};

export type Commit = {
  id:      string;
  hash:    string;
  message: string;
  author:  string;
  time:    string;
  repo:    "backend" | "frontend";
  files:   CommitFile[];
};

// ──────────────────────────────────────────────
// Diff 콘텐츠
// ──────────────────────────────────────────────

const BUILD_GRADLE_DIFF: DiffLine[] = [
  { type: "hunk",    content: "@@ -12,8 +12,12 @@ dependencies {" },
  { type: "context", oldNum: 12, newNum: 12, content: "    implementation 'org.springframework.boot:spring-boot-starter-web'" },
  { type: "context", oldNum: 13, newNum: 13, content: "    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'" },
  { type: "removed", oldNum: 14,             content: "    implementation 'org.springframework.boot:spring-boot-starter-test'" },
  { type: "added",              newNum: 14,  content: "    implementation 'org.springframework.boot:spring-boot-starter-actuator'" },
  { type: "added",              newNum: 15,  content: "    implementation 'com.fasterxml.jackson.core:jackson-databind:2.15.2'" },
  { type: "added",              newNum: 16,  content: "    implementation 'org.springframework.ai:spring-ai-core:0.8.1'" },
  { type: "context", oldNum: 15, newNum: 17, content: "    testImplementation 'org.junit.jupiter:junit-jupiter:5.10.0'" },
  { type: "removed", oldNum: 16,             content: "    testRuntimeOnly 'org.junit.platform:junit-platform-launcher'" },
  { type: "added",              newNum: 18,  content: "    testRuntimeOnly 'org.junit.platform:junit-platform-launcher:1.10.0'" },
  { type: "hunk",    content: "@@ -24,3 +26,6 @@ java {" },
  { type: "context", oldNum: 24, newNum: 26, content: "java {" },
  { type: "removed", oldNum: 25,             content: "    sourceCompatibility = '17'" },
  { type: "added",              newNum: 27,  content: "    toolchain {" },
  { type: "added",              newNum: 28,  content: "        languageVersion = JavaLanguageVersion.of(17)" },
  { type: "added",              newNum: 29,  content: "    }" },
];

const MULTI_AGENT_CONTROLLER_DIFF: DiffLine[] = [
  { type: "hunk",    content: "@@ -1,6 +1,9 @@ package com.weai.controller;" },
  { type: "context", oldNum: 1,  newNum: 1,  content: "package com.weai.controller;" },
  { type: "context", oldNum: 2,  newNum: 2,  content: "" },
  { type: "removed", oldNum: 3,              content: "import java.util.ArrayList;" },
  { type: "removed", oldNum: 4,              content: "import java.util.List;" },
  { type: "added",               newNum: 3,  content: "import java.util.List;" },
  { type: "added",               newNum: 4,  content: "import java.util.concurrent.ConcurrentHashMap;" },
  { type: "added",               newNum: 5,  content: "import java.util.Comparator;" },
  { type: "context", oldNum: 5,  newNum: 6,  content: "import org.springframework.web.bind.annotation.*;" },
  { type: "hunk",    content: "@@ -14,10 +17,18 @@ public class MultiAgentController {" },
  { type: "removed", oldNum: 14,             content: "    private final List<Agent> agents = new ArrayList<>();" },
  { type: "added",               newNum: 17, content: "    private final ConcurrentHashMap<String, Agent> agentRegistry;" },
  { type: "added",               newNum: 18, content: "    private final AgentScheduler scheduler;" },
  { type: "added",               newNum: 19, content: "" },
  { type: "added",               newNum: 20, content: "    @Autowired" },
  { type: "added",               newNum: 21, content: "    public MultiAgentController(AgentScheduler scheduler) {" },
  { type: "added",               newNum: 22, content: "        this.agentRegistry = new ConcurrentHashMap<>();" },
  { type: "added",               newNum: 23, content: "        this.scheduler = scheduler;" },
  { type: "added",               newNum: 24, content: "    }" },
  { type: "hunk",    content: "@@ -28,5 +39,9 @@ public class MultiAgentController {" },
  { type: "context", oldNum: 28, newNum: 39, content: "    @GetMapping(\"/status\")" },
  { type: "context", oldNum: 29, newNum: 40, content: "    public ResponseEntity<List<AgentStatus>> getStatus() {" },
  { type: "removed", oldNum: 30,             content: "        return ResponseEntity.ok(agents.stream().map(Agent::getStatus).toList());" },
  { type: "added",               newNum: 41, content: "        return ResponseEntity.ok(" },
  { type: "added",               newNum: 42, content: "            agentRegistry.values().stream()" },
  { type: "added",               newNum: 43, content: "                .map(Agent::getStatus)" },
  { type: "added",               newNum: 44, content: "                .sorted(Comparator.comparing(AgentStatus::getName))" },
  { type: "added",               newNum: 45, content: "                .collect(Collectors.toList())" },
  { type: "added",               newNum: 46, content: "        );" },
  { type: "context", oldNum: 31, newNum: 47, content: "    }" },
];

const DATA_SYNC_AGENT_DIFF: DiffLine[] = [
  { type: "added", newNum: 1,  content: "package com.weai.agent;" },
  { type: "added", newNum: 2,  content: "" },
  { type: "added", newNum: 3,  content: "import lombok.extern.slf4j.Slf4j;" },
  { type: "added", newNum: 4,  content: "import org.springframework.stereotype.Component;" },
  { type: "added", newNum: 5,  content: "import org.springframework.web.client.RestTemplate;" },
  { type: "added", newNum: 6,  content: "" },
  { type: "added", newNum: 7,  content: "@Component" },
  { type: "added", newNum: 8,  content: "@Slf4j" },
  { type: "added", newNum: 9,  content: "public class DataSyncAgent implements Agent {" },
  { type: "added", newNum: 10, content: "" },
  { type: "added", newNum: 11, content: "    private static final String AGENT_ID = \"AGT-01\";" },
  { type: "added", newNum: 12, content: "    private final RestTemplate restTemplate;" },
  { type: "added", newNum: 13, content: "" },
  { type: "added", newNum: 14, content: "    public DataSyncAgent(RestTemplate restTemplate) {" },
  { type: "added", newNum: 15, content: "        this.restTemplate = restTemplate;" },
  { type: "added", newNum: 16, content: "    }" },
  { type: "added", newNum: 17, content: "" },
  { type: "added", newNum: 18, content: "    @Override" },
  { type: "added", newNum: 19, content: "    public AgentStatus getStatus() {" },
  { type: "added", newNum: 20, content: "        return AgentStatus.builder()" },
  { type: "added", newNum: 21, content: "            .id(AGENT_ID).name(\"DataSync Alpha\").status(\"running\").build();" },
  { type: "added", newNum: 22, content: "    }" },
  { type: "added", newNum: 23, content: "" },
  { type: "added", newNum: 24, content: "    public void syncData(String endpoint) {" },
  { type: "added", newNum: 25, content: "        log.info(\"DataSync: Fetching from {}\", endpoint);" },
  { type: "added", newNum: 26, content: "        var res = restTemplate.getForEntity(endpoint, DataResponse.class);" },
  { type: "added", newNum: 27, content: "        if (res.getStatusCode().is2xxSuccessful()) {" },
  { type: "added", newNum: 28, content: "            log.info(\"DataSync: {} records fetched\", res.getBody().getCount());" },
  { type: "added", newNum: 29, content: "        }" },
  { type: "added", newNum: 30, content: "    }" },
  { type: "added", newNum: 31, content: "}" },
];

const APP_DEV_YML_DIFF: DiffLine[] = [
  { type: "hunk",    content: "@@ -1,12 +1,18 @@ spring:" },
  { type: "context", oldNum: 1,  newNum: 1,  content: "spring:" },
  { type: "context", oldNum: 2,  newNum: 2,  content: "  profiles:" },
  { type: "context", oldNum: 3,  newNum: 3,  content: "    active: dev" },
  { type: "hunk",    content: "@@ -8,6 +8,14 @@ spring.datasource:" },
  { type: "context", oldNum: 8,  newNum: 8,  content: "spring.datasource:" },
  { type: "removed", oldNum: 9,              content: "  url: jdbc:h2:mem:testdb" },
  { type: "added",               newNum: 9,  content: "  url: jdbc:h2:mem:weaidb;DB_CLOSE_DELAY=-1" },
  { type: "context", oldNum: 10, newNum: 10, content: "  username: sa" },
  { type: "context", oldNum: 11, newNum: 11, content: "  password:" },
  { type: "added",               newNum: 12, content: "" },
  { type: "added",               newNum: 13, content: "weai:" },
  { type: "added",               newNum: 14, content: "  agents:" },
  { type: "added",               newNum: 15, content: "    max-threads: 6" },
  { type: "added",               newNum: 16, content: "    retry-delay-ms: 5000" },
  { type: "added",               newNum: 17, content: "  logging:" },
  { type: "added",               newNum: 18, content: "    agent-events: true" },
];

const SETTINGS_GRADLE_DIFF: DiffLine[] = [
  { type: "hunk",    content: "@@ -1,8 +1,10 @@" },
  { type: "removed", oldNum: 1, content: "rootProject.name = 'weai'" },
  { type: "added",  newNum: 1,  content: "rootProject.name = 'weai-backend'" },
  { type: "context", oldNum: 2, newNum: 2, content: "" },
  { type: "context", oldNum: 3, newNum: 3, content: "pluginManagement {" },
  { type: "context", oldNum: 4, newNum: 4, content: "    repositories {" },
  { type: "added",  newNum: 5,  content: "        mavenLocal()" },
  { type: "context", oldNum: 5, newNum: 6, content: "        gradlePluginPortal()" },
  { type: "context", oldNum: 6, newNum: 7, content: "        mavenCentral()" },
  { type: "removed", oldNum: 7, content: "    // google() // not needed" },
  { type: "added",  newNum: 8,  content: "    }" },
  { type: "added",  newNum: 9,  content: "}" },
  { type: "hunk",    content: "@@ -12,3 +14,5 @@ dependencyResolutionManagement {" },
  { type: "added",  newNum: 14, content: "dependencyResolutionManagement {" },
  { type: "added",  newNum: 15, content: "    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)" },
  { type: "added",  newNum: 16, content: "}" },
];

// Frontend diffs
const AGENT_CARD_DIFF: DiffLine[] = [
  { type: "hunk",    content: "@@ -1,5 +1,7 @@ import React from 'react';" },
  { type: "removed", oldNum: 1,             content: "import React from 'react';" },
  { type: "added",               newNum: 1, content: "import { useState, useCallback } from 'react';" },
  { type: "added",               newNum: 2, content: "import { motion } from 'motion/react';" },
  { type: "context", oldNum: 2,  newNum: 3, content: "import { Bot, Cpu } from 'lucide-react';" },
  { type: "hunk",    content: "@@ -8,8 +10,16 @@ export function AgentCard({ agent, onToggle }) {" },
  { type: "context", oldNum: 8,  newNum: 10, content: "export function AgentCard({ agent, onToggle }) {" },
  { type: "removed", oldNum: 9,              content: "  return (" },
  { type: "added",               newNum: 11, content: "  const [expanded, setExpanded] = useState(false);" },
  { type: "added",               newNum: 12, content: "" },
  { type: "added",               newNum: 13, content: "  const handleToggle = useCallback(() => {" },
  { type: "added",               newNum: 14, content: "    onToggle(agent.id);" },
  { type: "added",               newNum: 15, content: "  }, [agent.id, onToggle]);" },
  { type: "added",               newNum: 16, content: "" },
  { type: "added",               newNum: 17, content: "  return (" },
  { type: "added",               newNum: 18, content: "    <motion.div" },
  { type: "added",               newNum: 19, content: "      layout" },
  { type: "added",               newNum: 20, content: "      onClick={() => setExpanded(e => !e)}" },
  { type: "added",               newNum: 21, content: "    >" },
  { type: "context", oldNum: 10, newNum: 22, content: "      <div className=\"agent-header\">" },
  { type: "context", oldNum: 11, newNum: 23, content: "        <Bot className=\"w-4 h-4\" />" },
  { type: "removed", oldNum: 12,             content: "        <span>{agent.name}</span>" },
  { type: "added",               newNum: 24, content: "        <span className=\"font-semibold\">{agent.name}</span>" },
];

const USE_AGENTS_DIFF: DiffLine[] = [
  { type: "added", newNum: 1,  content: "import { useState, useEffect, useRef } from 'react';" },
  { type: "added", newNum: 2,  content: "" },
  { type: "added", newNum: 3,  content: "type AgentStatus = 'running' | 'idle' | 'error' | 'stopped';" },
  { type: "added", newNum: 4,  content: "" },
  { type: "added", newNum: 5,  content: "export function useAgents(projectId: string) {" },
  { type: "added", newNum: 6,  content: "  const [agents, setAgents] = useState([]);" },
  { type: "added", newNum: 7,  content: "  const [loading, setLoading] = useState(true);" },
  { type: "added", newNum: 8,  content: "  const pollingRef = useRef<NodeJS.Timeout | null>(null);" },
  { type: "added", newNum: 9,  content: "" },
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
];

const API_CLIENT_DIFF: DiffLine[] = [
  { type: "hunk",    content: "@@ -3,7 +3,14 @@ const BASE_URL = '/api';" },
  { type: "context", oldNum: 3,  newNum: 3,  content: "const BASE_URL = '/api';" },
  { type: "removed", oldNum: 4,              content: "export async function fetchAgents() {" },
  { type: "removed", oldNum: 5,              content: "  return fetch(`${BASE_URL}/agents`).then(r => r.json());" },
  { type: "removed", oldNum: 6,              content: "}" },
  { type: "added",               newNum: 4,  content: "const DEFAULT_HEADERS = {" },
  { type: "added",               newNum: 5,  content: "  'Content-Type': 'application/json'," },
  { type: "added",               newNum: 6,  content: "  'X-Client': 'weai-dashboard/1.0'," },
  { type: "added",               newNum: 7,  content: "};" },
  { type: "added",               newNum: 8,  content: "" },
  { type: "added",               newNum: 9,  content: "export async function fetchAgents(projectId: string) {" },
  { type: "added",               newNum: 10, content: "  const res = await fetch(`${BASE_URL}/agents/status?project=${projectId}`, {" },
  { type: "added",               newNum: 11, content: "    headers: DEFAULT_HEADERS," },
  { type: "added",               newNum: 12, content: "  });" },
  { type: "added",               newNum: 13, content: "  if (!res.ok) throw new Error(`HTTP ${res.status}`);" },
  { type: "added",               newNum: 14, content: "  return res.json();" },
  { type: "added",               newNum: 15, content: "}" },
];

// ── CommitPanel 파일 더미 (Changes 패널) ──
export const CHANGE_FILES: CommitFile[] = [
  { id: "1", name: "build.gradle",             path: "D:\\WE_AI\\build.gradle",                                      ext: "gradle", status: "modified", additions: 5, deletions: 2, diff: BUILD_GRADLE_DIFF },
  { id: "2", name: "application-dev.yml",      path: "D:\\WE_AI\\src\\main\\resources\\application-dev.yml",        ext: "yml",    status: "modified", additions: 8, deletions: 1, diff: APP_DEV_YML_DIFF },
  { id: "3", name: "MultiAgentController.java",path: "D:\\WE_AI\\src\\main\\java\\...\\MultiAgentController.java",  ext: "java",   status: "modified", additions: 12, deletions: 3, diff: MULTI_AGENT_CONTROLLER_DIFF },
  { id: "4", name: "DataSyncAgent.java",       path: "D:\\WE_AI\\src\\main\\java\\...\\DataSyncAgent.java",         ext: "java",   status: "added",    additions: 31, deletions: 0, diff: DATA_SYNC_AGENT_DIFF },
  { id: "5", name: "settings.gradle",          path: "D:\\WE_AI\\settings.gradle",                                  ext: "gradle", status: "modified", additions: 4, deletions: 2, diff: SETTINGS_GRADLE_DIFF },
  { id: "6", name: "AgentScheduler.java",      path: "D:\\WE_AI\\src\\main\\java\\...\\AgentScheduler.java",        ext: "java",   status: "modified", additions: 2, deletions: 1, diff: BUILD_GRADLE_DIFF },
  { id: "7", name: ".env.dev",                 path: "D:\\WE_AI\\.env.dev",                                         ext: "env",    status: "deleted",  additions: 0, deletions: 6, diff: [] },
];

// ── CommitDiffPage 커밋 목록 ──
export const BACKEND_COMMITS: Commit[] = [
  {
    id: "c1", hash: "7f2b1a3", author: "병권", time: "5m ago",
    message: "Fixed JDK 17 toolchain issue in settings.gradle",
    repo: "backend",
    files: [
      { id: "f1", name: "settings.gradle",          path: "settings.gradle",                           ext: "gradle", status: "modified", additions: 4, deletions: 2, diff: SETTINGS_GRADLE_DIFF },
      { id: "f2", name: "build.gradle",              path: "build.gradle",                              ext: "gradle", status: "modified", additions: 5, deletions: 2, diff: BUILD_GRADLE_DIFF },
    ],
  },
  {
    id: "c2", hash: "a9c4d02", author: "병권", time: "1h ago",
    message: "Refactored MultiAgentController dispatch logic",
    repo: "backend",
    files: [
      { id: "f3", name: "MultiAgentController.java", path: "src/main/java/.../MultiAgentController.java", ext: "java", status: "modified", additions: 12, deletions: 3, diff: MULTI_AGENT_CONTROLLER_DIFF },
    ],
  },
  {
    id: "c3", hash: "3e8f51b", author: "Admin", time: "3h ago",
    message: "Added DataSyncAgent and application-dev.yml configs",
    repo: "backend",
    files: [
      { id: "f4", name: "DataSyncAgent.java",        path: "src/main/java/.../DataSyncAgent.java",      ext: "java",   status: "added",    additions: 31, deletions: 0, diff: DATA_SYNC_AGENT_DIFF },
      { id: "f5", name: "application-dev.yml",       path: "src/main/resources/application-dev.yml",   ext: "yml",    status: "modified", additions: 8,  deletions: 1, diff: APP_DEV_YML_DIFF },
    ],
  },
  {
    id: "c4", hash: "b2d7890", author: "병권", time: "5h ago",
    message: "Resolved DataSync Alpha null pointer exception",
    repo: "backend",
    files: [
      { id: "f6", name: "DataSyncAgent.java",        path: "src/main/java/.../DataSyncAgent.java",      ext: "java",   status: "modified", additions: 4, deletions: 1, diff: DATA_SYNC_AGENT_DIFF },
    ],
  },
  {
    id: "c5", hash: "f1a6c34", author: "Admin", time: "1d ago",
    message: "Updated Gradle wrapper to 8.7",
    repo: "backend",
    files: [
      { id: "f7", name: "build.gradle",              path: "build.gradle",                              ext: "gradle", status: "modified", additions: 2, deletions: 2, diff: BUILD_GRADLE_DIFF },
    ],
  },
];

export const FRONTEND_COMMITS: Commit[] = [
  {
    id: "cf1", hash: "e3d12ab", author: "병권", time: "20m ago",
    message: "Added motion animation to AgentCard component",
    repo: "frontend",
    files: [
      { id: "ff1", name: "AgentCard.tsx",   path: "src/components/AgentCard.tsx",  ext: "tsx", status: "modified", additions: 14, deletions: 3, diff: AGENT_CARD_DIFF },
    ],
  },
  {
    id: "cf2", hash: "9b4e7f1", author: "병권", time: "2h ago",
    message: "Added useAgents polling hook for real-time updates",
    repo: "frontend",
    files: [
      { id: "ff2", name: "useAgents.ts",    path: "src/hooks/useAgents.ts",        ext: "ts",  status: "added",    additions: 23, deletions: 0, diff: USE_AGENTS_DIFF },
    ],
  },
  {
    id: "cf3", hash: "c7a3d89", author: "Admin", time: "4h ago",
    message: "Refactored API client with typed response handling",
    repo: "frontend",
    files: [
      { id: "ff3", name: "apiClient.ts",    path: "src/api/apiClient.ts",          ext: "ts",  status: "modified", additions: 11, deletions: 3, diff: API_CLIENT_DIFF },
    ],
  },
  {
    id: "cf4", hash: "d2f89cc", author: "병권", time: "6h ago",
    message: "Fixed dark mode flicker on initial load",
    repo: "frontend",
    files: [
      { id: "ff4", name: "theme.css",       path: "src/styles/theme.css",          ext: "css", status: "modified", additions: 3,  deletions: 1, diff: BUILD_GRADLE_DIFF },
    ],
  },
  {
    id: "cf5", hash: "a1b2c3d", author: "Admin", time: "2d ago",
    message: "Initial frontend scaffold — React + TypeScript + Tailwind",
    repo: "frontend",
    files: [
      { id: "ff5", name: "App.tsx",         path: "src/App.tsx",                   ext: "tsx", status: "added",    additions: 45, deletions: 0, diff: AGENT_CARD_DIFF },
    ],
  },
];
