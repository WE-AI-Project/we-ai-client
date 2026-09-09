export {};

declare global {
  interface Window {
    electronAPI?: {
      isElectron: true;
      pickFolder: () => Promise<string | null>;
      detectStack: (localPath: string) => Promise<import("./app/lib/api").ProjectStackDetection>;
      loadCustomEndpoint: () => Promise<import("./app/lib/customEndpoint").CustomEndpointConfig>;
      saveCustomEndpoint: (
        draft: import("./app/lib/customEndpoint").CustomEndpointSaveDraft
      ) => Promise<import("./app/lib/customEndpoint").CustomEndpointConfig>;
      testCustomEndpoint: (
        draft: import("./app/lib/customEndpoint").CustomEndpointTestDraft
      ) => Promise<import("./app/lib/customEndpoint").CustomEndpointTestResult>;
      callCustomEndpoint: (prompt: string) => Promise<{ answer: string }>;
    };
  }
}
