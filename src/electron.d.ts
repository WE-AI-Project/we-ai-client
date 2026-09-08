export {};

declare global {
  interface Window {
    electronAPI?: {
      isElectron: true;
      pickFolder: () => Promise<string | null>;
      detectStack: (localPath: string) => Promise<import("./app/lib/api").ProjectStackDetection>;
    };
  }
}
