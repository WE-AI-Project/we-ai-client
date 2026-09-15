export {};

declare global {
  interface Window {
    electronAPI?: {
      isElectron: true;
      pickFolder: () => Promise<string | null>;
      pickFile: () => Promise<string | null>;
      detectStack: (localPath: string) => Promise<import("./app/lib/api").ProjectStackDetection>;
      loadCustomEndpoint: () => Promise<import("./app/lib/customEndpoint").CustomEndpointConfig>;
      saveCustomEndpoint: (
        draft: import("./app/lib/customEndpoint").CustomEndpointSaveDraft
      ) => Promise<import("./app/lib/customEndpoint").CustomEndpointConfig>;
      testCustomEndpoint: (
        draft: import("./app/lib/customEndpoint").CustomEndpointTestDraft
      ) => Promise<import("./app/lib/customEndpoint").CustomEndpointTestResult>;
      callCustomEndpoint: (prompt: string) => Promise<{ answer: string }>;
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
