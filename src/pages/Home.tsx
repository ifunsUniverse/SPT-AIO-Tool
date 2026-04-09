import { useState, useEffect } from "react";
import messagesData from "../data/messages.json";
import { useTutorial } from "../tutorial/TutorialProvider";

export default function Home({ goToHub, setModal }: any) {
    const { startTutorial } = useTutorial();
    const [showTutorialPrompt, setShowTutorialPrompt] = useState(false);
    const [folder, setFolder] = useState("");
    const [message, setMessage] = useState("");
    const [confirmLoad, setConfirmLoad] = useState(false);
    const { nextStep, enabled } = useTutorial();

    useEffect(() => {
        const seen = localStorage.getItem("tutorialSeen");

        if (!seen) {
            setShowTutorialPrompt(true);
        }
    }, []);

    useEffect(() => {
        const saved = localStorage.getItem("spt-folder");
        if (saved) {
            setFolder(saved);
        }

        // 🎯 RANDOM MESSAGE ON LOAD
        const msgs = messagesData.messages;
        const random = msgs[Math.floor(Math.random() * msgs.length)];
        setMessage(random);
    }, []);

    const handleSelectFolder = async () => {
        const selected = await window.electronAPI.selectFolder();
        if (!selected) return;

        let normalized = selected;

        if (normalized.endsWith("\\SPT")) {
            normalized = normalized.replace(/\\SPT$/, "");
        }

        const result = await window.electronAPI.validateSPTFolder(normalized);

        if (!result.valid || !result.root) {
            alert(result.error || "Invalid folder");
            return;
        }

        setFolder(result.root);
        localStorage.setItem("spt-folder", result.root);

        if (result.serverPath) {
            localStorage.setItem("spt-server", result.serverPath);
        }

        if (result.modsPath) {
            localStorage.setItem("spt-mods", result.modsPath);
        }

        if (result.launcherPath) {
            localStorage.setItem("spt-launcher", result.launcherPath);
        }

        localStorage.setItem("show-spt-modal", "true");

        goToHub();
    };

    const handleLoadLast = () => {
        const saved = localStorage.getItem("spt-folder");

        if (!saved) {
            alert("No saved folder found");
            return;
        }

        setConfirmLoad(true);

    };

    const loadLastFolder = async () => {
        const saved = localStorage.getItem("spt-folder");
        if (!saved) return;

        let normalized = saved;

        if (normalized.endsWith("\\SPT")) {
            normalized = normalized.replace(/\\SPT$/, "");
        }

        const result = await window.electronAPI.validateSPTFolder(normalized);

        if (!result.valid || !result.root) {
            alert("Saved folder is no longer valid");
            return;
        }

        setFolder(result.root);

        localStorage.setItem("spt-folder", result.root);

        if (result.serverPath) {
            localStorage.setItem("spt-server", result.serverPath);
        }

        if (result.modsPath) {
            localStorage.setItem("spt-mods", result.modsPath);
        }

        if (result.launcherPath) {
            localStorage.setItem("spt-launcher", result.launcherPath);
        }

        setModal({
            title: "SPT Loaded",
            message: `Loaded existing SPT setup from ${result.root}`,
        });

        goToHub();
    };

    return (
        <div className="
      min-h-screen
      flex
      items-center
      justify-center
      bg-background
      px-4
    ">
            {/* CARD */}
            <div className="
        w-full max-w-2xl
        rounded-2xl
        border border-border
        bg-card
        p-8
        shadow-lg
      ">
                <div className="flex flex-col items-center text-center space-y-6">

                    {/* ICON */}
                    <div className="
            w-14 h-14
            rounded-full
            bg-primary/20
            flex items-center justify-center
            text-xl
          ">
                        📁
                    </div>

                    {/* TITLE */}
                    <div>
                        <h1 className="text-2xl font-bold">
                            SPT Mod Config Editor
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Select your SPT installation directory to begin
                        </p>
                    </div>

                    {/* INPUT */}
                    <div
                        className="
                        w-full
                        rounded-lg
                        bg-input
                        border border-border
                        px-4 py-3
                        text-sm
                        text-muted-foreground
                        flex items-center justify-center
                        text-center
                        min-h-[42px]
                    "
                    >
                        {message}
                    </div>

                    {/* PRIMARY BUTTON */}
                    <button
                        id="select-folder-btn"
                        onClick={async () => {
                            await handleSelectFolder();

                            if (enabled) nextStep();
                        }}
                        className="
            w-full
            bg-primary
            text-primary-foreground
            rounded-lg
            py-3
            font-medium
            hover:opacity-90
            transition
          ">
                        Select SPT Installation Folder
                    </button>

                    {/* SECONDARY BUTTON */}
                    <button onClick={handleLoadLast} className="
            w-full
            bg-secondary
            text-secondary-foreground
            rounded-lg
            py-3
            font-medium
            hover:bg-secondary/80
            transition
          ">
                        Load Last Folder
                    </button>

                    {/* FOOTER */}
                    <div className="text-xs text-muted-foreground text-left space-y-1 pt-4">
                        <p>• The app will scan for mods in: [path]/SPT/user/mods/</p>
                        <p>• Only compatible JSON config files will be loaded</p>
                        <p>• You can change this path later in settings</p>
                    </div>

                </div>
            </div>

            {confirmLoad && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">

                    <div className="bg-background border border-border rounded-xl p-6 w-[420px] shadow-2xl">

                        <p className="text-sm mb-5 text-center">
                            Are you sure you want to load:
                        </p>

                        <p className="text-xs text-muted-foreground mb-5 text-center break-all">
                            {localStorage.getItem("spt-folder")}
                        </p>

                        <div className="flex justify-center gap-3">
                            <button
                                onClick={() => setConfirmLoad(false)}
                                className="px-4 py-1.5 bg-secondary rounded text-xs"
                            >
                                No
                            </button>

                            <button
                                onClick={() => {
                                    setConfirmLoad(false);
                                    loadLastFolder(); // 👈 IMPORTANT
                                }}
                                className="px-4 py-1.5 bg-primary rounded text-xs"
                            >
                                Yes
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {showTutorialPrompt && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70">

                    <div className="bg-background border border-border rounded-xl p-6 w-[400px] text-center">

                        <h2 className="text-lg font-semibold mb-3">
                            Need a quick tutorial?
                        </h2>

                        <p className="text-sm text-muted-foreground mb-5">
                            We’ll guide you step-by-step through the app.
                        </p>

                        <div className="flex gap-3 justify-center">

                            {/* YES */}
                            <button
                                onClick={() => {
                                    startTutorial();
                                    setShowTutorialPrompt(false);
                                }}
                                className="px-4 py-2 bg-primary rounded text-white"
                            >
                                Yes I would love that
                            </button>

                            {/* NO */}
                            <button
                                onClick={() => {
                                    localStorage.setItem("tutorialSeen", "true");
                                    setShowTutorialPrompt(false);
                                }}
                                className="px-4 py-2 bg-secondary rounded"
                            >
                                Nah I'm a pro, I've got this! 😎
                            </button>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
}