const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs-extra");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const { spawn } = require("child_process");
const { execFile } = require("child_process");
const AdmZip = require("adm-zip");

const isDev = !app.isPackaged;
const allowedExtensions = [".json", ".jsonc", ".json5"];

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    backgroundColor: "#0f172a",
    webPreferences: {
      preload: path.resolve(__dirname, "./preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

async function fetchItems() {
  const res = await fetch("https://api.tarkov.dev/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query: `
        {
          items {
            id
            name
            types
          }
        }
      `
    })
  });

  const json = await res.json();

  const cleaned = json.data.items.map(item => ({
    id: item.id,
    name: item.name,
    category: item.types?.[0] || "Other"
  }));

  fs.writeFileSync(
    "./src/data/items.json",
    JSON.stringify(cleaned, null, 2)
  );

  console.log("✅ items.json created");
}

ipcMain.handle("download-mod", async (event, { modId, apiKey, modsPath }) => {
  console.log("🚀 INSTALL STARTED");
  console.log("MOD ID:", modId);
  console.log("MODS PATH:", modsPath);
  try {
    // 1. GET MOD VERSIONS (to get download link)
    const res = await fetch(`https://forge.sp-tarkov.com/api/v0/mod/${modId}/versions?include=files`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    console.log("📦 Fetching versions...");
    const versions = await res.json();
    console.log("VERSIONS:", versions);

    if (!versions || !versions.length) {
      return { success: false, error: "No versions found" };
    }




    const downloadUrl = versions[0]?.files?.[0]?.download_url;

    if (!downloadUrl) {
      console.error("❌ NO DOWNLOAD URL FOUND", versions[0]);
      return { success: false, error: "No download URL" };
    }
    console.log("⬇ Download URL:", downloadUrl);

    console.log("⬇ Downloading zip...");

    // 2. DOWNLOAD ZIP
    const zipRes = await fetch(downloadUrl);
    const buffer = await zipRes.buffer();

    const tempZipPath = path.join(__dirname, "temp_mod.zip");
    fs.writeFileSync(tempZipPath, buffer);

    console.log("✅ Zip saved:", tempZipPath);

    console.log("📂 Extracting...");

    // 3. EXTRACT
    const zip = new AdmZip(tempZipPath);
    const extractPath = path.join(__dirname, "temp_extract");

    fs.removeSync(extractPath);
    zip.extractAllTo(extractPath, true);

    console.log("📂 Extracted to:", extractPath);

    // 4. DETECT STRUCTURE
    const sptRoot = path.dirname(path.dirname(modsPath)); // go up from /user/mods

    const bepinexDest = path.join(sptRoot, "BepInEx", "plugins");
    const modsDest = modsPath;

    // WALK FILES
    const walk = (dir) => {
      let results = [];
      const list = fs.readdirSync(dir);
      list.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
          results = results.concat(walk(filePath));
        } else {
          results.push(filePath);
        }
      });
      return results;
    };

    const files = walk(extractPath);

    for (const file of files) {
      const relative = file.toLowerCase();


      // 🧠 BEPINEX
      if (relative.includes("bepinex") && relative.endsWith(".dll")) {
        const dest = path.join(bepinexDest, path.basename(file));
        console.log("📦 Installing BepInEx plugin:", dest);

        fs.ensureDirSync(bepinexDest);
        fs.copyFileSync(file, dest);
      }

      // 🧠 MODS
      if (relative.includes("user") && relative.includes("mods")) {
        const parts = file.split(path.sep);
        const modIndex = parts.findIndex(p => p.toLowerCase() === "mods");

        if (modIndex !== -1 && parts[modIndex + 1]) {
          const modFolder = parts[modIndex + 1];
          const dest = path.join(modsDest, modFolder);

          console.log("📦 Installing mod folder:", dest);

          fs.ensureDirSync(dest);
          fs.copySync(
            path.join(...parts.slice(0, modIndex + 2)),
            dest,
            { overwrite: true }
          );
        }
      }
    }
    console.log("🧹 Cleaning up temp files");
    // 5. CLEANUP
    fs.removeSync(tempZipPath);
    fs.removeSync(extractPath);

    return { success: true };

  } catch (err) {
    console.error("INSTALL ERROR:", err);
    return { success: false, error: err.message };
  }
});

ipcMain.removeHandler("fetch-mods");

ipcMain.handle("fetch-mods", async (_, apiKey) => {
  try {
    const res = await fetch("https://forge.sp-tarkov.com/api/v0/mods?per_page=50", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    const json = await res.json();

    console.log("FORGE API RAW:", json);

    // API returns { data: [...] }
    const mods = (json.data || []).map((mod) => ({
      name: mod.name,
      author: mod.owner?.username || "Unknown",
      description: mod.teaser || "No description",
      downloads: mod.downloads || 0,
      link: mod.detail_url,
      id: mod.id,
    }));

    return mods;
  } catch (err) {
    console.error("API ERROR:", err);
    return [];
  }
});

ipcMain.handle("fetch-tarkov-items", async () => {
  const res = await fetch("https://api.tarkov.dev/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `
        {
          items(lang: en) {
            id
            name
            shortName
            types
            baseImageLink
          }
        }
      `,
    }),
  });

  return res.json();
});

ipcMain.handle("get-installed", async (_, rootPath) => {
  try {
    const modsPath = path.join(rootPath, "user", "mods");
    const pluginsPath = path.join(rootPath, "BepInEx", "plugins");

    // ✅ MODS (folders only)
    const mods = fs.existsSync(modsPath)
      ? fs.readdirSync(modsPath).filter(name =>
        fs.statSync(path.join(modsPath, name)).isDirectory()
      )
      : [];

    // ✅ PLUGINS (DLL ONLY — VERY IMPORTANT)
    const plugins = fs.existsSync(pluginsPath)
      ? fs.readdirSync(pluginsPath).filter(file => {
        const full = path.join(pluginsPath, file);
        return (
          fs.statSync(full).isFile() &&
          file.toLowerCase().endsWith(".dll")
        );
      })
      : [];

    return {
      mods,
      plugins,
    };
  } catch (err) {
    console.error("GET INSTALLED ERROR:", err);
    return { mods: [], plugins: [] };
  }
});

ipcMain.handle("select-folder", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });

  if (result.canceled) return null;

  return result.filePaths[0];
});

ipcMain.handle("validate-spt-folder", async (_, folderPath) => {
  try {
    console.log("SELECTED ROOT:", folderPath);

    // 👇 REAL ROOT IS INSIDE /SPT
    const realRoot = path.join(folderPath, "SPT");

    const modsPath = path.join(realRoot, "user", "mods");
    const serverPath = path.join(realRoot, "SPT.Server.exe");
    const launcherPath = path.join(realRoot, "SPT.Launcher.exe");

    console.log("MODS:", modsPath, fs.existsSync(modsPath));
    console.log("SERVER:", serverPath, fs.existsSync(serverPath));
    console.log("LAUNCHER:", launcherPath, fs.existsSync(launcherPath));

    if (!fs.existsSync(modsPath)) {
      return { valid: false, error: "Mods folder not found" };
    }

    return {
      valid: true,
      root: realRoot, // 👈 IMPORTANT CHANGE
      modsPath,
      serverPath: fs.existsSync(serverPath) ? serverPath : null,
      launcherPath: fs.existsSync(launcherPath) ? launcherPath : null,
    };
  } catch (err) {
    return { valid: false, error: err.message };
  }
});

const getAllFiles = (dir) => {
  let results = [];

  const list = fs.readdirSync(dir);

  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      const children = getAllFiles(filePath);

      // 🔥 hide empty folders
      if (children.length > 0) {
        results.push({
          name: file,
          path: filePath,
          type: "folder",
          children,
        });
      }
    } else {
      const ext = path.extname(file).toLowerCase();

      // 🔥 ONLY allow JSON types
      if (!allowedExtensions.includes(ext)) continue;

      results.push({
        name: file,
        path: filePath,
        type: "file",
      });
    }
  }

  return results;
};

ipcMain.handle("get-mods", async (_, modsPath) => {
  try {
    const mods = [];

    const modFolders = fs.readdirSync(modsPath);

    for (const modName of modFolders) {
      const modPath = path.join(modsPath, modName);

      if (!fs.statSync(modPath).isDirectory()) continue;

      mods.push({
        name: modName,
        path: modPath,
        tree: getAllFiles(modPath), // 🔥 FULL TREE
      });
    }

    return mods;
  } catch (err) {
    console.error(err);
    return [];
  }
});

ipcMain.handle("read-file", async (_, filePath) => {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return content;
  } catch (err) {
    console.error(err);
    return null;
  }
});

ipcMain.handle("write-file", async (_, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, "utf-8");
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
});

ipcMain.handle("start-server", async (_, serverPath) => {
  try {
    console.log("START SERVER:", serverPath);

    if (!fs.existsSync(serverPath)) {
      return { success: false, error: "Server exe not found" };
    }

    spawn("cmd.exe", [
      "/c",
      "start",
      "",
      serverPath
    ], {
      cwd: path.dirname(serverPath),
      detached: true,
    });

    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("launch-client", async (_, launcherPath) => {
  try {
    if (!fs.existsSync(launcherPath)) {
      return { success: false, error: "Launcher exe not found" };
    }

    spawn(launcherPath, [], {
      cwd: path.dirname(launcherPath),
      detached: true,
      stdio: "ignore",
    }).unref();

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

app.whenReady().then(createWindow);