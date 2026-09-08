// Shared local-project stack detection, used by:
// - the Vite dev-server middleware (vite.config.ts) when running `npm run dev`
// - the Electron main process (electron/main.cjs) when running the installed desktop app
import fs from "node:fs/promises";
import path from "node:path";

const STACK_FILES = new Set([
  "package.json", "pom.xml", "build.gradle", "build.gradle.kts", "gradle-wrapper.properties",
  "requirements.txt", "pyproject.toml", "pipfile", "poetry.lock", "setup.py", "dockerfile",
  "compose.yml", "compose.yaml", "docker-compose.yml", "docker-compose.yaml", "tsconfig.json",
  "vite.config.js", "vite.config.ts", "vite.config.mjs", "tailwind.config.js", "tailwind.config.ts",
  "application.yml", "application.yaml", "application.properties", "go.mod", "cargo.toml",
]);
const SKIPPED_DIRECTORIES = new Set([
  ".git", ".gradle", ".idea", ".vscode", ".venv", "venv", "node_modules",
  "build", "dist", "out", "target", "coverage", ".next",
]);

function cleanVersion(value) {
  return value?.match(/\d+(?:\.\d+){0,3}/)?.[0];
}

function addStack(stacks, name, category, version) {
  const key = name.toLowerCase();
  const previous = stacks.get(key);
  const normalizedVersion = cleanVersion(version);
  if (!previous || (!previous.version && normalizedVersion)) {
    stacks.set(key, { name, version: normalizedVersion, category, isRequired: true });
  }
}

function inspectStackFile(fileName, content, stacks) {
  const lowerName = fileName.toLowerCase();
  const lower = content.toLowerCase();
  const includes = (...values) => values.some((value) => lower.includes(value));

  if (lowerName === "package.json") {
    try {
      const pkg = JSON.parse(content);
      const packages = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      addStack(stacks, "Node.js", "LANGUAGE", pkg.engines?.node);
      const mappings = [
        ["react", "React", "FRONTEND"], ["next", "Next.js", "FRONTEND"], ["vue", "Vue", "FRONTEND"],
        ["@angular/core", "Angular", "FRONTEND"], ["typescript", "TypeScript", "LANGUAGE"],
        ["vite", "Vite", "BUILD_TOOL"], ["tailwindcss", "Tailwind CSS", "FRONTEND"],
        ["express", "Express", "BACKEND"], ["@nestjs/core", "NestJS", "BACKEND"],
        ["prisma", "Prisma", "DATABASE"], ["mongoose", "MongoDB", "DATABASE"],
      ];
      for (const [packageName, displayName, category] of mappings) {
        if (packages[packageName]) addStack(stacks, displayName, category, packages[packageName]);
      }
    } catch {
      addStack(stacks, "Node.js", "LANGUAGE");
    }
  }

  if (lowerName === "build.gradle" || lowerName === "build.gradle.kts") {
    addStack(stacks, "Gradle", "BUILD_TOOL");
    if (includes("org.springframework.boot", "spring-boot")) addStack(stacks, "Spring Boot", "BACKEND");
    if (includes("java", "javalanguageversion")) {
      addStack(stacks, "Java", "LANGUAGE", content.match(/JavaLanguageVersion\.of\((\d+)\)/)?.[1]);
    }
    if (includes("langchain4j")) addStack(stacks, "LangChain4j", "AI");
  }
  if (lowerName === "gradle-wrapper.properties") addStack(stacks, "Gradle", "BUILD_TOOL", content.match(/gradle-(\d+(?:\.\d+)+)-/)?.[1]);
  if (lowerName === "pom.xml") {
    addStack(stacks, "Maven", "BUILD_TOOL");
    if (includes("spring-boot")) addStack(stacks, "Spring Boot", "BACKEND");
    addStack(stacks, "Java", "LANGUAGE", content.match(/<(?:java.version|maven.compiler.source)>([^<]+)/)?.[1]);
  }
  if (["requirements.txt", "pyproject.toml", "pipfile", "poetry.lock", "setup.py"].includes(lowerName)) {
    addStack(stacks, "Python", "LANGUAGE");
    addStack(stacks, lowerName === "pyproject.toml" && includes("[tool.poetry") ? "Poetry" : "pip", "BUILD_TOOL");
    if (includes("fastapi")) addStack(stacks, "FastAPI", "BACKEND");
    if (includes("django")) addStack(stacks, "Django", "BACKEND");
    if (includes("flask")) addStack(stacks, "Flask", "BACKEND");
  }
  if (lowerName === "tsconfig.json") addStack(stacks, "TypeScript", "LANGUAGE");
  if (lowerName.startsWith("vite.config")) addStack(stacks, "Vite", "BUILD_TOOL");
  if (lowerName.startsWith("tailwind.config")) addStack(stacks, "Tailwind CSS", "FRONTEND");
  if (lowerName === "go.mod") addStack(stacks, "Go", "LANGUAGE", content.match(/^go\s+(\S+)/m)?.[1]);
  if (lowerName === "cargo.toml") { addStack(stacks, "Rust", "LANGUAGE"); addStack(stacks, "Cargo", "BUILD_TOOL"); }
  if (["dockerfile", "compose.yml", "compose.yaml", "docker-compose.yml", "docker-compose.yaml"].includes(lowerName)) addStack(stacks, "Docker", "DEVOPS");
  if (includes("mysql")) addStack(stacks, "MySQL", "DATABASE");
  if (includes("postgresql", "postgres:")) addStack(stacks, "PostgreSQL", "DATABASE");
  if (includes("redis")) addStack(stacks, "Redis", "DATABASE");
  if (includes("mongodb", "mongo:")) addStack(stacks, "MongoDB", "DATABASE");
  if (includes("chromadb/chroma", "chroma:")) addStack(stacks, "ChromaDB", "DATABASE");
  if (includes("minio/minio")) addStack(stacks, "MinIO", "DEVOPS");
}

export async function detectLocalStack(rawPath) {
  const root = path.resolve(rawPath.trim());
  const stat = await fs.stat(root);
  if (!stat.isDirectory()) throw new Error(`localPath must be a directory: ${root}`);
  const stacks = new Map();
  const detectedFiles = [];

  async function walk(directory, depth) {
    if (depth > 4) return;
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && SKIPPED_DIRECTORIES.has(entry.name.toLowerCase())) continue;
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath, depth + 1);
      } else if (entry.isFile() && STACK_FILES.has(entry.name.toLowerCase())) {
        const fileStat = await fs.stat(fullPath);
        if (fileStat.size > 1024 * 1024) continue;
        const content = await fs.readFile(fullPath, "utf8");
        detectedFiles.push(path.relative(root, fullPath).replaceAll("\\", "/"));
        inspectStackFile(entry.name, content, stacks);
      }
    }
  }

  await walk(root, 0);
  detectedFiles.sort();
  const techStacks = [...stacks.values()];
  const summary = (categories) => techStacks.filter((item) => categories.includes(item.category)).map((item) => item.name).join(" / ") || "Not detected";
  return {
    localPath: root,
    stack: techStacks.map((item) => item.version ? `${item.name} ${item.version}` : item.name),
    framework: summary(["BACKEND", "FRONTEND"]),
    language: summary(["LANGUAGE"]),
    build: summary(["BUILD_TOOL"]),
    techStacks,
    detectedFiles,
  };
}
