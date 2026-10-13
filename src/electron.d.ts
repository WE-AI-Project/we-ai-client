export {};

declare global {
  type LocalGitResponse<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

  interface Window {
    electronAPI?: {
      isElectron: true;
      pickFolder: () => Promise<string | null>;
      pickFile: () => Promise<string | null>;
      detectStack: (localPath: string) => Promise<import("./app/lib/api").ProjectStackDetection>;
      env: {
        read: (localPath: string) => Promise<{ exists: boolean; usedExample: boolean; path: string; content: string }>;
        write: (localPath: string, content: string) => Promise<{ path: string }>;
      };
      git: {
        probe: (localPath: string) => Promise<LocalGitResponse<import("./app/lib/api").LocalGitProbe>>;
        init: (
          localPath: string,
          options?: { remoteUrl?: string; defaultBranch?: string }
        ) => Promise<LocalGitResponse<import("./app/lib/api").LocalGitInitResult>>;
        status: (
          projectId: number,
          localPath: string
        ) => Promise<LocalGitResponse<import("./app/lib/api").ProjectChangedFileList>>;
        diff: (
          projectId: number,
          localPath: string,
          filePath: string,
          staged: boolean
        ) => Promise<LocalGitResponse<import("./app/lib/api").ProjectGitFileDiff>>;
        stage: (
          projectId: number,
          localPath: string,
          filePaths: string[]
        ) => Promise<LocalGitResponse<import("./app/lib/api").ProjectGitChangeResult>>;
        unstage: (
          projectId: number,
          localPath: string,
          filePaths: string[]
        ) => Promise<LocalGitResponse<import("./app/lib/api").ProjectGitChangeResult>>;
        stageAll: (
          projectId: number,
          localPath: string
        ) => Promise<LocalGitResponse<import("./app/lib/api").ProjectGitChangeResult>>;
        unstageAll: (
          projectId: number,
          localPath: string
        ) => Promise<LocalGitResponse<import("./app/lib/api").ProjectGitChangeResult>>;
        commit: (
          projectId: number,
          localPath: string,
          message: string,
          options?: { description?: string; author?: { name?: string; email?: string } }
        ) => Promise<LocalGitResponse<import("./app/lib/api").ProjectGitCommitCreated>>;
        ensureRemote: (
          localPath: string,
          remoteUrl: string
        ) => Promise<LocalGitResponse<import("./app/lib/api").LocalGitRemoteResult>>;
        push: (
          localPath: string,
          options?: { accessToken?: string }
        ) => Promise<LocalGitResponse<import("./app/lib/api").LocalGitPushResult>>;
      };
      screenTest: {
        check: (
          url: string
        ) => Promise<import("./app/lib/screenTest").ScreenTestIpcResponse<import("./app/lib/screenTest").ScreenTestReachability>>;
        run: (
          options: import("./app/lib/screenTest").ScreenTestOptions
        ) => Promise<import("./app/lib/screenTest").ScreenTestIpcResponse<import("./app/lib/screenTest").ScreenTestResult>>;
        cancel: () => Promise<import("./app/lib/screenTest").ScreenTestIpcResponse<{ cancelled: boolean }>>;
        openFolder: (
          target?: string
        ) => Promise<import("./app/lib/screenTest").ScreenTestIpcResponse<{ path: string }>>;
        onProgress: (callback: (progress: import("./app/lib/screenTest").ScreenTestProgress) => void) => () => void;
      };
      runtimeInfo: () => Promise<{
        platform: string;
        arch: string;
        nodeVersion: string;
        electronVersion: string;
        chromeVersion: string;
      }>;
      connection: {
        load: (key: string) => Promise<import("./app/lib/serverConnection").ConnectionConfig>;
        save: (
          key: string,
          draft: import("./app/lib/serverConnection").ConnectionSaveDraft
        ) => Promise<import("./app/lib/serverConnection").ConnectionConfig>;
        test: (
          draft: import("./app/lib/serverConnection").ConnectionTestDraft
        ) => Promise<import("./app/lib/serverConnection").ConnectionTestResult>;
      };
      windowControls: {
        minimize: () => Promise<void>;
        toggleMaximize: () => Promise<boolean>;
        close: () => Promise<void>;
        isMaximized: () => Promise<boolean>;
        onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void;
      };
      ssh: {
        exec: (key: string, command: string) => Promise<import("./app/lib/serverConnection").SshExecResult>;
        startLogStream: (key: string) => Promise<{ ok: boolean; alreadyRunning?: boolean }>;
        stopLogStream: (key: string) => Promise<{ ok: boolean }>;
        onLogLine: (callback: (payload: { key: string; line: string }) => void) => () => void;
        onLogStatus: (
          callback: (payload: { key: string; status: "connected" | "closed" | "error"; message?: string }) => void
        ) => () => void;
      };
    };
  }
}
