import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import JSON5 from "json5";
import { FaArrowCircleDown, FaArrowAltCircleRight } from "react-icons/fa";
import { FaClock } from "react-icons/fa";
import { AiFillCaretRight, AiFillCaretDown, AiOutlineDropbox, AiFillSave } from "react-icons/ai";
import { useTutorial } from "../tutorial/TutorialProvider";

type FileNode = {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: FileNode[];
};

type Mod = {
  name: string;
  path: string;
  tree: FileNode[];
};

export default function EditorPage({
  setNotif,
  goToHome,
}: {
  setNotif: any;
  goToHome: () => void;
}) {
  const { nextStep, step, enabled } = useTutorial();
  const [mods, setMods] = useState<Mod[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [language, setLanguage] = useState("json");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"mods" | "favs" | "recent">("mods");
  const [search, setSearch] = useState("");
  const [activeMod, setActiveMod] = useState<string | null>(null);
  const [expandedMods, setExpandedMods] = useState<Record<string, boolean>>({});
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [serverRunning, setServerRunning] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showItemDB, setShowItemDB] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [copyMode, setCopyMode] = useState<"simple" | "tpl">("simple");
  const editorRef = useRef<any>(null);
  const [history, setHistory] = useState<Record<string, string[]>>({});
  const [fileErrors, setFileErrors] = useState<Record<string, string | null>>({});
  const [confirmExit, setConfirmExit] = useState(false);
  const [recent, setRecent] = useState<
    {
      mod: string;
      file: string;
      action: "opened" | "saved";
      time: number;
    }[]
  >([]);
  const [installedMods, setInstalledMods] = useState<string[]>([]);
  const [installedPlugins, setInstalledPlugins] = useState<string[]>([]);
  const [installedTab, setInstalledTab] = useState<"mods" | "plugins">("mods");
  const [showInstalled, setShowInstalled] = useState(false);

  const CATEGORY_MAP: Record<string, string[]> = {
    Weapons: ["assault rifle", "smg", "shotgun", "sniper rifle", "pistol", "revolver", "machine gun"],
    Ammo: ["ammo", "cartridge"],
    Explosives: ["grenade"],
    Gear: ["armor", "helmet", "rig", "backpack", "headset"],
    Medical: ["med", "bandage", "stim"],
    Food: ["drink", "food"],
    Keys: ["key", "keycard"],
    Mods: ["barrel", "grip", "magazine", "scope", "mount"],
    Electronics: ["gpu", "cpu", "circuit"],
    Valuables: ["gold", "bitcoin", "chain"],
    Containers: ["case", "container"],
  };

  // 1. FILTER FIRST
  const filteredItems = items.filter(item => {
    const name = item.name.toLowerCase();

    const matchesSearch = name.includes(itemSearch.toLowerCase());

    if (selectedCategory === "All") return matchesSearch;

    const categoryKeywords = CATEGORY_MAP[selectedCategory] || [];

    const matchesCategory = categoryKeywords.some(keyword =>
      name.includes(keyword)
    );

    return matchesSearch && matchesCategory;
  });

  // 2. TOTAL PAGES (based on filtered results)
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  // 3. PAGINATE AFTER FILTERING
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    if (!showItemDB) return;

    const loadItems = async () => {
      setLoadingItems(true);

      try {
        const result = await window.electronAPI.fetchTarkovItems();

        const cleaned = result.data.items.map((item: any) => ({
          id: item.id,
          name: item.name,
          category: item.types?.[0] || "Other",
          image: item.baseImageLink,
        }));

        setItems(cleaned);
      } catch (err) {
        console.error(err);
      }

      setLoadingItems(false);
    };

    loadItems();
  }, [showItemDB]);

  useEffect(() => {
    const loadMods = async () => {
      const root = localStorage.getItem("spt-folder");
      if (!root) return;

      const modsPath = localStorage.getItem("spt-mods");
      if (!modsPath) return; // 👈 ADD THIS LINE

      const result = await window.electronAPI.getMods(modsPath);
      setMods(result);
    };

    loadMods();
  }, []);

  useEffect(() => {
    const loadInstalled = async () => {
      const root = localStorage.getItem("spt-folder");
      if (!root) return;

      const result = await window.electronAPI.getInstalled(root);

      setInstalledMods(result.mods);
      setInstalledPlugins(result.plugins);
    };

    loadInstalled();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [itemSearch]);

  useEffect(() => {
    const el = document.querySelector("#item-db-list");
    if (el) el.scrollTop = 0;
  }, [currentPage]);

  useEffect(() => {
    const saved = localStorage.getItem("spt-favs");
    if (saved) {
      setFavorites(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages]);

  useEffect(() => {
    localStorage.setItem("spt-favs", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    const saved = localStorage.getItem("spt-recent-v2");
    if (saved) setRecent(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("spt-recent-v2", JSON.stringify(recent));
  }, [recent]);

  useEffect(() => {
    if (!editorRef.current || !selectedFile) return;

    const monaco = (window as any).monacoRef;
    if (!monaco) return;

    const model = editorRef.current.getModel();
    if (!model) return;

    // clear old markers
    monaco.editor.setModelMarkers(model, "owner", []);

    const error = fileErrors[selectedFile];
    if (!error) return;

    const match = error.match(/position (\d+)/);

    if (match) {
      const pos = Number(match[1]);
      const line = model.getPositionAt(pos).lineNumber;

      monaco.editor.setModelMarkers(model, "owner", [
        {
          startLineNumber: line,
          endLineNumber: line,
          startColumn: 1,
          endColumn: 1,
          message: error,
          severity: monaco.MarkerSeverity.Error,
        },
      ]);
    }
  }, [content, selectedFile, fileErrors]);

  const addRecent = (
    mod: string,
    file: string,
    action: "opened" | "saved"
  ) => {
    setRecent((prev) => {
      const entry = {
        mod,
        file,
        action,
        time: Date.now(),
      };

      return [entry, ...prev].slice(0, 50); // keep last 50
    });
  };

  const toggleFavorite = (modName: string) => {
    setFavorites((prev) =>
      prev.includes(modName)
        ? prev.filter((m) => m !== modName)
        : [...prev, modName]
    );
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const [editorSettings, setEditorSettings] = useState<{
    fontSize: number;
    fontFamily: string;
    wordWrap: "on" | "off" | "wordWrapColumn" | "bounded";
    minimap: boolean;
  }>({
    fontSize: 14,
    fontFamily: "Consolas",
    wordWrap: "on",
    minimap: false,
  });

  const toggleMod = (modName: string) => {
    setExpandedMods((prev) => ({
      ...prev,
      [modName]: !prev[modName],
    }));
  };

  const filteredMods = mods
    .filter((mod) =>
      mod.name.toLowerCase().includes(search.toLowerCase())
    )
    .filter((mod) => {
      if (activeTab === "mods") return !favorites.includes(mod.name);
      if (activeTab === "favs") return favorites.includes(mod.name);
      return true;
    });

  const handleEditorMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    (window as any).monacoRef = monaco;


    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: true,
      trailingCommas: "ignore",
      enableSchemaRequest: true,
      schemaValidation: "error",
      schemas: [],
    });
  };

  const formatTimeAgo = (time: number) => {
    const diff = Date.now() - time;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;

    return new Date(time).toLocaleDateString();
  };

  const renderTree = (nodes: FileNode[], level = 0) => {
    return nodes.map((node) => {
      if (node.type === "folder") {
        const isOpen = expandedFolders[node.path];

        return (
          <div key={node.path} title={fileErrors[node.path] || ""}>
            {/* FOLDER ROW */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(node.path);
              }}
              className={`flex items-center gap-2 text-xs cursor-pointer px-2 py-1
              ${fileErrors[node.path] ? "text-red-400" : "hover:text-primary"}
            `}
              style={{ marginLeft: level * 12 }}
            >
              <span>{isOpen ? <AiFillCaretDown /> : <AiFillCaretRight />}</span>
              📁 {node.name}
            </div>

            {/* CHILDREN */}
            {isOpen && node.children && (
              <div>
                {renderTree(node.children, level + 1)}
              </div>
            )}
          </div>
        );
      }

      return (
        <div
          key={node.path}
          onClick={async (e) => {
            e.stopPropagation();

            if (
              !node.name.endsWith(".json") &&
              !node.name.endsWith(".jsonc") &&
              !node.name.endsWith(".json5")
            ) return;


            setSelectedFile(node.path);
            addRecent(
              activeMod || "Unknown",
              node.name,
              "opened"
            );

            setLoading(true);

            const fileContent = await window.electronAPI.readFile(node.path);

            if (fileContent !== null) {
              setContent(fileContent);
            } else {
              setContent("// Failed to load file");
            }

            setLoading(false);
          }}
          className={`flex items-center gap-2 text-xs cursor-pointer px-2 py-1
          ${fileErrors[node.path] ? "text-red-400" : "hover:text-primary"}
        `}
          style={{ marginLeft: level * 12 }}
        >
          📄 {node.name}

        </div>
      );
    });
  };
  return (
    <div className="flex h-screen bg-background text-foreground">



      {/* LEFT PANEL */}
      <div className="w-72 border-r border-border p-3 flex flex-col">

        <div className="mb-4 p-3 rounded-xl border border-border bg-secondary/40">

          {/* HEADER */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold tracking-wide text-muted-foreground">
              SPT CONTROL PANEL
            </h2>

            <span className={`w-2 h-2 rounded-full ${serverRunning ? "bg-green-500" : "bg-red-500"}`} />
          </div>

          {/* BUTTONS */}
          <div className="grid grid-cols-2 gap-2">

            {/* SERVER */}
            <button onClick={async () => {
              const serverPath = localStorage.getItem("spt-server");
              if (!serverPath) return setNotif({ type: "error", message: "Server not detected" });

              const result = await window.electronAPI.startServer(serverPath);

              if (result.success) {
                setServerRunning(true);
              } else {
                alert(result.error);
              }
            }}
              className="
        flex flex-col items-center justify-center
        py-2 rounded-lg border border-border
        hover:bg-primary/10 transition
      "
            >
              <span className="text-xs font-medium">SERVER</span>
              <span className="text-[10px] text-muted-foreground">START</span>
            </button>

            {/* CLIENT */}
            <button onClick={async () => {
              const launcherPath = localStorage.getItem("spt-launcher");
              if (!launcherPath) return alert("Launcher not detected");

              const result = await window.electronAPI.launchClient(launcherPath);

              if (!result.success) {
                alert(result.error);
              }
            }}
              className="
        flex flex-col items-center justify-center
        py-2 rounded-lg border border-border
        hover:bg-primary/10 transition
      "
            >
              <span className="text-xs font-medium">CLIENT</span>
              <span className="text-[10px] text-muted-foreground">LAUNCH</span>
            </button>

          </div>

          {/* FOOTER */}
          <p className="mt-2 text-[10px] text-muted-foreground">
            Paths auto-configured from selected SPT folder
          </p>

        </div>

        {/* TABS */}
        <div className="flex gap-2 mb-3">
          {["mods", "favs", "recent"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`
          px-3 py-1 rounded-lg text-sm
          ${activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"}
        `}
            >
              {tab === "mods" && `MODS (${mods.length - favorites.length})`}
              {tab === "favs" && `FAVS (${favorites.length})`}
              {tab === "recent" && "RECENT"}
            </button>
          ))}
        </div>

        {/* SEARCH */}
        <input
          placeholder="Search mods..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="
          mb-3
          px-3 py-2
          rounded-lg
          bg-input
          border border-border
          text-sm
          focus:outline-none
          focus:ring-2
          focus:ring-primary
        "
        />

        {/* MOD LIST */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {activeTab === "recent" ? (

            <div className="space-y-2">
              {recent.map((item, index) => (
                <div
                  key={index}
                  className="border border-border rounded-lg p-3 bg-secondary/40 hover:bg-secondary/60 transition"
                >
                  <div className="flex items-center justify-between">

                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{item.mod}</span>
                      <span className="text-xs text-muted-foreground">{item.file}</span>
                    </div>

                    <div className="text-right text-xs text-muted-foreground">
                      <div className="flex items-center gap-1 justify-end">
                        <FaClock className="text-xs" />
                        {formatTimeAgo(item.time)}
                      </div>

                      <div className={`text-[10px] ${item.action === "saved"
                        ? "text-green-400"
                        : "text-blue-400"
                        }`}>
                        {item.action}
                      </div>
                    </div>

                  </div>
                </div>
              ))}
            </div>

          ) : (
            <>
              {filteredMods.map((mod) => {
                const hasError = Object.keys(fileErrors).some(path =>
                  path.startsWith(mod.path) && fileErrors[path]
                );

                return (
                  <div
                    key={mod.name}
                    onClick={() => {
                      setActiveMod(mod.name);
                      toggleMod(mod.name);

                      if (enabled && step === 2) nextStep();
                    }}
                    id="mod-list"
                    className={`
                        border rounded-xl p-4 cursor-pointer transition-all
                        ${hasError
                        ? "border-red-500 bg-red-500/10"
                        : activeMod === mod.name
                          ? "bg-primary/20 border-primary shadow-md"
                          : "border-border hover:bg-secondary/60"}
                        `}
                  >


                    <div className="flex items-start justify-between gap-2">

                      <div className="flex flex-col">
                        <span className="text-sm font-semibold break-words">
                          {mod.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(mod.name);
                          }}
                          className="text-xs"
                        >
                          {favorites.includes(mod.name) ? "⭐" : "☆"}
                        </button>

                        <span className="text-xs opacity-70 mt-0.5">
                          {expandedMods[mod.name]
                            ? <FaArrowCircleDown />
                            : <FaArrowAltCircleRight />}
                        </span>
                      </div>

                    </div>

                    {expandedMods[mod.name] && (
                      <div className="mt-3 space-y-1">
                        {renderTree(mod.tree || [])}
                      </div>
                    )}

                  </div>
                );
              })}
            </>

          )}
        </div>
      </div>
      {/* RIGHT PANEL */}
      <div className="flex-1 flex flex-col">

        {/* HEADER */}
        <div className="px-6 py-4 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between">

          <div>
            <h1 className="text-lg font-semibold">
              {activeMod || "Select a mod"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {selectedFile || "No file selected"}
            </p>
          </div>

          <div className="flex gap-2">

            <button
              onClick={() => setShowInstalled(true)}
              className="px-3 py-1 rounded-md bg-secondary text-sm"
            >
              📦 Installed Mods
            </button>

            <button
              onClick={() => {
                if (content && selectedFile) {
                  setConfirmExit(true);
                  return;
                }

                goToHome();
              }}
              className="px-3 py-1 rounded-md bg-secondary text-sm"
            >
              🏠 Home
            </button>

            <button className="px-3 py-1 rounded-md bg-secondary text-sm">
              Reset
            </button>

            <button
              onClick={() => {
                if (!selectedFile) return;

                const fileHistory = history[selectedFile];
                if (!fileHistory || fileHistory.length < 2) {
                  alert("No history available");
                  return;
                }

                const previous = fileHistory[1]; // previous version

                setContent(previous);

                if (editorRef.current) {
                  editorRef.current.setValue(previous);
                }

                setNotif({
                  type: "success",
                  message: "Reverted to previous version",
                });
              }}
              className="px-3 py-1 rounded-md bg-secondary text-sm"
            >
              ↶ Undo
            </button>

            <button className="flex items-center gap-2 px-3 py-1 rounded-md bg-secondary text-sm">
              <AiOutlineDropbox />
              Export
            </button>

            <button
              onClick={() => setShowSettings(true)}
              className="px-3 py-1 rounded-md bg-secondary text-sm"
            >
              ⚙️
            </button>


          </div>
        </div>

        {/* FILE TAB */}
        <div className="px-6 py-2 border-b border-border flex items-center justify-between">

          {/* LEFT SIDE (file name) */}
          <div className="flex items-center gap-2">
            {selectedFile && (
              <div className="px-3 py-1 rounded-md bg-primary/20 text-primary text-xs">
                {selectedFile.split("\\").pop()}
              </div>
            )}
          </div>

          {/* RIGHT SIDE (buttons) */}
          <div className="flex items-center gap-2">

            <button
              onClick={async () => {
                if (!selectedFile) return;

                try {
                  const isStrictJSON = selectedFile.endsWith(".json");

                  let output = content;

                  const parsed = JSON5.parse(content);

                  if (isStrictJSON) {
                    output = JSON.stringify(parsed, null, 2);
                  }

                  // SAVE CURRENT VERSION BEFORE OVERWRITING
                  setHistory(prev => {
                    const existing = prev[selectedFile!] || [];

                    return {
                      ...prev,
                      [selectedFile!]: [content, ...existing].slice(0, 50)
                    };
                  });

                  const success = await window.electronAPI.writeFile(
                    selectedFile,
                    output
                  );

                  if (success) {
                    setContent(output);

                    addRecent(
                      activeMod || "Unknown",
                      selectedFile.split("\\").pop() || "file",
                      "saved"
                    );

                    setNotif({
                      type: "success",
                      message: "Saved successfully",
                    });
                  } else {
                    setNotif({
                      type: "error",
                      message: "Failed to save",
                    });
                  }
                } catch (err: any) {
                  setNotif({
                    type: "error",
                    message: "Invalid JSON/JSON5: " + err.message,
                  });
                }
              }}
              className="flex items-center gap-2 text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-500"
            >
              <AiFillSave />
              Save
            </button>

            {/* 👇 FIX JSON  */}

            <button
              onClick={() => {
                if (!content) return;

                let fixed = content;

                try {
                  // 🧪 FIRST ATTEMPT (raw)
                  const parsed = JSON5.parse(fixed);

                  const formatted = JSON.stringify(parsed, null, 2);

                  setContent(formatted);
                  editorRef.current?.setValue(formatted);

                  setFileErrors(prev => ({
                    ...prev,
                    [selectedFile!]: null
                  }));

                  setNotif({
                    type: "success",
                    message: "JSON formatted",
                  });

                  return;

                } catch (err) {
                  console.log("First parse failed, attempting auto-fix...");
                }

                try {
                  // 🔧 AUTO FIX PASS

                  fixed = fixed

                    // REMOVE TRAILING COMMAS
                    .replace(/,\s*([}\]])/g, "$1")

                    // REMOVE INVALID CHARACTERS AFTER TRUE/FALSE/NULL
                    .replace(/(true|false|null)\s+[^\s,}\]]+/g, "$1")

                    // REMOVE DOUBLE COMMAS
                    .replace(/,,+/g, ",")

                    // FIX MISSING COMMAS BETWEEN PROPS (basic)
                    .replace(/"\s*"\s*:/g, '", "')

                  const parsed = JSON5.parse(fixed);

                  const formatted = JSON.stringify(parsed, null, 2);

                  setContent(formatted);
                  editorRef.current?.setValue(formatted);

                  setFileErrors(prev => ({
                    ...prev,
                    [selectedFile!]: null
                  }));

                  setNotif({
                    type: "success",
                    message: "JSON auto-repaired",
                  });

                } catch (err: any) {

                  setNotif({
                    type: "error",
                    message: "Could not fix: " + err.message,
                  });

                }
              }}
              className="text-xs px-2 py-1 rounded bg-green-600 hover:bg-green-500"
            >
              🛠 Fix JSON
            </button>

            <button
              onClick={() => setShowItemDB(true)}
              className="text-xs px-2 py-1 rounded bg-secondary"
            >
              📦 Item DB
            </button>

          </div>
        </div>

        {/* EDITOR AREA */}
        <div className="flex-1 p-6 flex flex-col gap-4">

          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : selectedFile ? (
            <div className="flex-1 border border-border rounded-xl overflow-hidden shadow-lg bg-secondary/30">
              <Editor
                height="100%"
                language={language}
                value={content}
                onChange={(value) => {
                  if (value === undefined) return;

                  setContent(value);

                  clearTimeout((window as any).jsonTimer);

                  (window as any).jsonTimer = setTimeout(() => {
                    try {
                      JSON5.parse(value);

                      setFileErrors(prev => ({
                        ...prev,
                        [selectedFile!]: null
                      }));

                    } catch (err: any) {
                      setFileErrors(prev => ({
                        ...prev,
                        [selectedFile!]: err.message
                      }));
                    }
                  }, 400); // 👈 delay
                }}
                theme="vs-dark"
                onMount={handleEditorMount}
                options={{
                  minimap: { enabled: editorSettings.minimap },
                  fontSize: editorSettings.fontSize,
                  fontFamily: editorSettings.fontFamily,
                  wordWrap: editorSettings.wordWrap,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Select a config file to edit
            </div>
          )}

        </div>

      </div>
      {showSettings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowSettings(false)} // click outside closes
        >

          <div
            className="w-[420px] bg-background border border-border rounded-xl p-5 shadow-2xl animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
          >

            {/* HEADER */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-semibold">Editor Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-xs opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            </div>

            {/* CONTENT */}
            <div className="space-y-4">

              {/* FONT SIZE */}
              <div>
                <label className="text-xs">Font Size</label>
                <input
                  type="range"
                  min={10}
                  max={30}
                  value={editorSettings.fontSize}
                  onChange={(e) =>
                    setEditorSettings({
                      ...editorSettings,
                      fontSize: Number(e.target.value),
                    })
                  }
                  className="w-full"
                />
              </div>

              {/* FONT FAMILY */}
              <div>
                <label className="text-xs">Font Family</label>
                <select
                  value={editorSettings.fontFamily}
                  onChange={(e) =>
                    setEditorSettings({
                      ...editorSettings,
                      fontFamily: e.target.value,
                    })
                  }
                  className="w-full px-2 py-1 rounded bg-input border border-border text-xs"
                >
                  <option>Consolas</option>
                  <option>Courier New</option>
                  <option>Fira Code</option>
                  <option>JetBrains Mono</option>
                </select>
              </div>

              {/* WORD WRAP */}
              <div className="flex justify-between items-center">
                <span className="text-xs">Word Wrap</span>
                <button
                  onClick={() =>
                    setEditorSettings({
                      ...editorSettings,
                      wordWrap:
                        editorSettings.wordWrap === "on" ? "off" : "on",
                    })
                  }
                  className="px-2 py-1 rounded bg-secondary text-xs"
                >
                  {editorSettings.wordWrap === "on" ? "ON" : "OFF"}
                </button>
              </div>

              {/* MINIMAP */}
              <div className="flex justify-between items-center">
                <span className="text-xs">Minimap</span>
                <button
                  onClick={() =>
                    setEditorSettings({
                      ...editorSettings,
                      minimap: !editorSettings.minimap,
                    })
                  }
                  className="px-2 py-1 rounded bg-secondary text-xs"
                >
                  {editorSettings.minimap ? "ON" : "OFF"}
                </button>
              </div>

              {/* RESET */}
              <button
                onClick={() =>
                  setEditorSettings({
                    fontSize: 14,
                    fontFamily: "Consolas",
                    wordWrap: "on",
                    minimap: false,
                  })
                }
                className="w-full mt-2 py-2 rounded bg-red-500 text-white text-xs"
              >
                Reset to Defaults
              </button>

            </div>
          </div>
        </div>
      )}

      {showItemDB && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowItemDB(false)}
        >
          <div
            className="w-[75vw] h-[75vh] max-w-[1100px] bg-background border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >

            {/* HEADER */}
            <div className="flex justify-between items-center p-3 border-b border-border">
              <h2 className="text-sm font-semibold">SPT Item Database</h2>

              <button
                onClick={() => setShowItemDB(false)}
                className="text-xs opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            </div>

            {/* CONTENT */}
            <div className="flex-1 flex flex-col p-4 overflow-hidden gap-3">

              {/* SEARCH */}
              <input
                placeholder="Search items or IDs..."
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                className="
                px-4 py-2 rounded-lg
                bg-input border border-border
                text-sm outline-none
                focus:ring-2 focus:ring-primary
              "
              />
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-muted-foreground">Copy format</span>

                <select
                  value={copyMode}
                  onChange={(e) => setCopyMode(e.target.value as any)}
                  className="text-xs px-2 py-1 rounded bg-input border border-border"
                >
                  <option value="simple">Key Value</option>
                  <option value="tpl">Tpl Object</option>
                </select>
              </div>

              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-muted-foreground">View</span>

                <div className="flex gap-1">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`px-2 py-1 text-xs rounded ${viewMode === "list" ? "bg-primary text-white" : "bg-secondary"
                      }`}
                  >
                    List
                  </button>

                  <button
                    onClick={() => setViewMode("grid")}
                    className={`px-2 py-1 text-xs rounded ${viewMode === "grid" ? "bg-primary text-white" : "bg-secondary"
                      }`}
                  >
                    Grid
                  </button>
                </div>
              </div>

              {/* CATEGORY PILLS */}
              <div className="flex flex-wrap gap-2 mb-1">
                {["All", "Weapons", "Ammo", "Explosives", "Gear", "Medical", "Food", "Keys", "Mods", "Electronics", "Valuables", "Containers"].map(cat => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1 text-xs rounded-full ${selectedCategory === cat
                      ? "bg-primary text-white"
                      : "bg-secondary hover:bg-primary/20"
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>



              {/* TOP INFO */}
              <p className="text-xs text-muted-foreground mb-2">
                Showing {(currentPage - 1) * itemsPerPage + 1}–
                {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length}
              </p>

              {/* LIST + PAGINATION WRAPPER */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div
                  id="item-db-list"
                  className={`flex-1 overflow-y-auto pr-2 ${viewMode === "grid"
                    ? "grid grid-cols-2 gap-3"
                    : "space-y-2"
                    }`}
                >
                  {loadingItems ? (
                    <p className="text-sm text-muted-foreground">Loading items...</p>
                  ) : (
                    <>
                      {paginatedItems.map((item) => {
                        if (viewMode === "grid") {
                          return (
                            <div
                              key={item.id}
                              className="border border-border rounded-lg p-3 bg-secondary/40 flex flex-col gap-2"
                            >
                              {/* ✅ IMAGE */}
                              {item.image && (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="w-full h-24 object-contain rounded"
                                />
                              )}

                              <div className="text-sm font-medium line-clamp-2">
                                {item.name}
                              </div>

                              <div className="text-[10px] text-muted-foreground break-all">
                                {item.id}
                              </div>

                              <button
                                onClick={() => {
                                  let text = "";

                                  if (copyMode === "simple") {
                                    text = `// ${item.name}\n"${item.id}": 1`;
                                  }

                                  if (copyMode === "tpl") {
                                    text = `// ${item.name}\n{ "Tpl": "${item.id}", "Chance": 100 }`;
                                  }

                                  navigator.clipboard.writeText(text);

                                  setNotif({
                                    type: "success",
                                    message: "Copied formatted item",
                                  });
                                }}
                                className="text-xs px-2 py-1 bg-primary rounded mt-auto"
                              >
                                📋 Copy
                              </button>

                            </div>
                          );
                        }

                        // LIST VIEW
                        return (
                          <div
                            key={item.id}
                            className="border border-border rounded-lg p-3 flex justify-between items-center bg-secondary/40"
                          >
                            <div>
                              <div className="text-sm font-medium">{item.name}</div>
                              <div className="text-xs text-muted-foreground">{item.id}</div>
                            </div>

                            <button
                              onClick={() => {
                                let text = "";

                                if (copyMode === "simple") {
                                  text = `// ${item.name}\n"${item.id}": 1`;
                                }

                                if (copyMode === "tpl") {
                                  text = `// ${item.name}\n{ "Tpl": "${item.id}", "Chance": 100 }`;
                                }

                                navigator.clipboard.writeText(text);

                                setNotif({
                                  type: "success",
                                  message: "Copied formatted item",
                                });
                              }}
                              className="text-xs px-2 py-1 bg-primary rounded"
                            >
                              📋
                            </button>

                          </div>
                        );
                      })}
                    </>
                  )}


                </div>

                <div className="flex justify-center items-center gap-2 pt-3 border-t border-border">

                  {/* PREV */}
                  <button
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    className="px-2 py-1 text-xs rounded bg-secondary"
                  >
                    ←
                  </button>

                  {/* DYNAMIC PAGE NUMBERS */}
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const page = i + 1;

                    // ONLY SHOW PAGES NEAR CURRENT (clean UI)
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 2 && page <= currentPage + 2)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-2 py-1 text-xs rounded ${currentPage === page
                            ? "bg-primary text-white"
                            : "bg-secondary"
                            }`}
                        >
                          {page}
                        </button>
                      );
                    }

                    if (
                      page === currentPage - 3 ||
                      page === currentPage + 3
                    ) {
                      return <span key={page} className="text-xs">...</span>;
                    }

                    return null;
                  })}

                  {/* NEXT */}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    className="px-2 py-1 text-xs rounded bg-secondary"
                  >
                    →
                  </button>

                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {showInstalled && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowInstalled(false)}
        >
          <div
            className="w-[500px] max-h-[70vh] bg-background border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >

            {/* HEADER */}
            <div className="flex justify-between items-center p-3 border-b border-border">
              <h2 className="text-sm font-semibold">Installed Mods</h2>

              <button
                onClick={() => setShowInstalled(false)}
                className="text-xs opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            </div>

            {/* TABS */}
            <div className="flex gap-2 p-3 border-b border-border">
              <button
                onClick={() => setInstalledTab("mods")}
                className={`px-3 py-1 rounded text-xs ${installedTab === "mods"
                  ? "bg-primary text-white"
                  : "bg-secondary"
                  }`}
              >
                Mods ({installedMods.length})
              </button>

              <button
                onClick={() => setInstalledTab("plugins")}
                className={`px-3 py-1 rounded text-xs ${installedTab === "plugins"
                  ? "bg-primary text-white"
                  : "bg-secondary"
                  }`}
              >
                Plugins ({installedPlugins.length})
              </button>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">

              {/* MODS */}
              {installedTab === "mods" &&
                installedMods.map((mod) => (
                  <div
                    key={mod}
                    className="px-3 py-2 rounded bg-secondary/40"
                  >
                    📦 {mod}
                  </div>
                ))}

              {/* PLUGINS */}
              {installedTab === "plugins" &&
                installedPlugins.map((plugin) => (
                  <div
                    key={plugin}
                    className="px-3 py-2 rounded bg-secondary/40"
                  >
                    🔌 {plugin.replace(/\.dll$/i, "")}
                  </div>
                ))}

            </div>

          </div>
        </div>
      )}

      {confirmExit && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
          <div className="bg-background border border-border rounded-xl p-5 w-[300px]">

            <p className="text-sm mb-4">
              Unsaved changes will be lost. Continue?
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmExit(false)}
                className="px-3 py-1 bg-secondary rounded text-xs"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  setConfirmExit(false);
                  goToHome();
                }}
                className="px-3 py-1 bg-primary rounded text-xs"
              >
                OK
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}