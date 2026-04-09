export { };

type FileNode = {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: FileNode[];
};

declare global {
  interface Window {
    electronAPI: {
      selectFolder: () => Promise<string | null>;
      readFile: (path: string) => Promise<string | null>;
      writeFile: (path: string, content: string) => Promise<boolean>;
      fetchMods: (apiKey: string) => Promise<any>;

      downloadMod: (data: {
        modId: number;
        apiKey: string;
        modsPath: string;
      }) => Promise<{ success: boolean; error?: string }>;

      validateSPTFolder: (folder: string) => Promise<{
        valid: boolean;
        modsPath?: string;
        error?: string;
        root?: string;
        serverPath?: string | null;
        launcherPath?: string | null;
      }>;

      getInstalled: (root: string) => Promise<{
        mods: string[];
        plugins: string[];
      }>;

      startServer: (serverPath: string) => Promise<{
        success: boolean;
        error?: string;
      }>;

      launchClient: (launcherPath: string) => Promise<{
        success: boolean;
        error?: string;
      }>;

      openExternal: (url: string) => void;
      fetchTarkovItems: () => Promise<any>;

      getMods: (modsPath: string) => Promise<
        {
          name: string;
          path: string;
          tree: FileNode[];
        }[]
      >;
    };
  }
}