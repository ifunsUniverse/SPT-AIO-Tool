console.log("PRELOAD LOADED");
const { contextBridge, ipcRenderer, shell } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  fetchMods: (apiKey) => ipcRenderer.invoke("fetch-mods", apiKey),
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  getMods: (modsPath) => ipcRenderer.invoke("get-mods", modsPath),
  validateSPTFolder: (folderPath) =>
    ipcRenderer.invoke("validate-spt-folder", folderPath),
  readFile: (filePath) => ipcRenderer.invoke("read-file", filePath),
  writeFile: (filePath, content) =>
    ipcRenderer.invoke("write-file", filePath, content),
  startServer: (root) => ipcRenderer.invoke("start-server", root),
  launchClient: (root) => ipcRenderer.invoke("launch-client", root),
  openExternal: (url) => shell.openExternal(url),
  fetchTarkovItems: () => ipcRenderer.invoke("fetch-tarkov-items"),
  downloadMod: (data) => ipcRenderer.invoke("download-mod", data),
  getInstalled: (rootPath) => ipcRenderer.invoke("get-installed", rootPath),
});