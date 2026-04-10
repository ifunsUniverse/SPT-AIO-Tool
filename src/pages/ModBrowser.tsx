import { useState, useEffect } from "react";

type ModItem = {
    id: number;
    name: string;
    author: string;
    description: string;
    downloads: number;
    link?: string;
};

export default function ModBrowser({
    goToHub,
}: {
    goToHub: () => void;
}) {
    const [search, setSearch] = useState("");
    const [mods, setMods] = useState<ModItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMod, setSelectedMod] = useState<ModItem | null>(null);
    const [showApiModal, setShowApiModal] = useState(false);
    const [apiInput, setApiInput] = useState("");
    const [acknowledged, setAcknowledged] = useState(false);

    useEffect(() => {
        setLoading(true);

        const loadMods = async () => {
            try {
                const apiKey = localStorage.getItem("forge_api_key");

                if (!apiKey) {
                    setShowApiModal(true);
                    setLoading(false);
                    return;
                }

                const data = await window.electronAPI.fetchMods(apiKey);
                console.log("MOD API RESPONSE:", data);

                const mapped = (data || []).map((mod: any) => ({
                    name: mod.name,
                    author: mod.author || "Unknown",
                    description: mod.description || "No description",
                    downloads: mod.downloads || 0,
                    link: mod.link || mod.detail_url,
                    id: mod.id, // 🔥 IMPORTANT FOR INSTALL BUTTON
                }));

                setMods(mapped);
            } catch (err) {
                console.error("Failed to load mods", err);
            } finally {
                setLoading(false);
            }
        };

        loadMods();
    }, []); // 🔥🔥🔥 THIS FIXES EVERYTHING


    // 🔍 FILTER
    const filtered = mods.filter((mod) =>
        mod.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <>

            <div className="min-h-screen bg-background text-foreground p-6">

                {/* TOP BAR */}
                <div className="flex items-center justify-between mb-6">

                    <div>
                        <h1 className="text-xl font-semibold">Mod Browser</h1>
                        <p className="text-sm text-muted-foreground">
                            Browse and discover mods
                        </p>
                    </div>

                    <button
                        onClick={goToHub}
                        className="flex items-center gap-2 px-3 py-1 rounded-md bg-secondary text-sm hover:bg-secondary/80 transition"
                    >
                        ← Back
                    </button>

                </div>

                {/* SEARCH */}
                <input
                    placeholder="Search mods..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="
                w-full mb-6
                px-4 py-2 rounded-lg
                bg-input border border-border
                text-sm outline-none
                focus:ring-2 focus:ring-primary
            "
                />

                {/* GRID */}
                {loading ? (
                    <p className="text-muted-foreground">Loading mods...</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

                        {filtered.map((mod, i) => (
                            <div
                                key={mod.name || i}
                                className="
                                rounded-xl border border-border
                                bg-card p-5
                                cursor-pointer
                                transition-all duration-200
                                hover:scale-[1.02]
                                hover:bg-accent/30
                                hover:shadow-lg
                                hover:border-primary/40
                            "
                            >

                                {/* HEADER */}
                                <div className="mb-3">
                                    <h2 className="text-sm font-semibold">
                                        {mod.name}
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        by {mod.author}
                                    </p>
                                </div>

                                {/* DESCRIPTION */}
                                <p className="text-xs text-muted-foreground mb-4 line-clamp-3">
                                    {mod.description}
                                </p>

                                {/* FOOTER */}
                                <div className="flex justify-between items-center text-xs">

                                    <span className="text-muted-foreground">
                                        ⬇ {mod.downloads.toLocaleString()}
                                    </span>

                                    <button
                                        onClick={async () => {

                                            console.log("🖱 Install clicked:", mod.id);

                                            const apiKey = localStorage.getItem("forge_api_key");
                                            const modsPath = localStorage.getItem("spt-mods");

                                            if (!apiKey || !modsPath) return;

                                            const res = await window.electronAPI.downloadMod({
                                                modId: mod.id,
                                                apiKey,
                                                modsPath,
                                            });
                                            console.log("📦 Install result:", res);
                                            if (res.success) {
                                                alert("Mod installed!");
                                            } else {
                                                alert("Failed: " + res.error);
                                            }
                                        }}
                                        className="px-3 py-1 rounded bg-green-600 text-white text-sm"
                                    >
                                        Install
                                    </button>

                                </div>

                            </div>
                        ))}
                    </div>
                )}


                {selectedMod && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
                        onClick={() => setSelectedMod(null)}
                    >
                        <div
                            className="w-[500px] max-w-[90%] bg-background border border-border rounded-xl p-6 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >

                            {/* HEADER */}
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-lg font-semibold">
                                        {selectedMod.name}
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        by {selectedMod.author}
                                    </p>
                                </div>

                                <button
                                    onClick={() => setSelectedMod(null)}
                                    className="text-sm opacity-70 hover:opacity-100"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* DESCRIPTION */}
                            <p className="text-sm text-muted-foreground mb-4">
                                {selectedMod.description}
                            </p>

                            {/* STATS */}
                            <div className="flex justify-between items-center text-sm">

                                <span className="text-muted-foreground">
                                    ⬇ {selectedMod.downloads.toLocaleString()} downloads
                                </span>

                            </div>

                        </div>
                    </div>
                )}
                {showApiModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">

                        <div className="w-[400px] bg-background border border-border rounded-xl p-6 shadow-xl">

                            <h2 className="text-lg font-semibold mb-2">
                                Enter SPT Forge API Key
                            </h2>

                            <p className="text-sm text-muted-foreground mb-4">
                                You need an API key from SPT Forge to use the Mod Browser.
                            </p>

                            <input
                                placeholder="Paste API key..."
                                value={apiInput}
                                onChange={(e) => setApiInput(e.target.value)}
                                className="w-full mb-3 px-3 py-2 rounded bg-input border border-border text-sm"
                            />

                            <div className="flex items-center gap-2 mb-4 text-sm">
                                <input
                                    type="checkbox"
                                    checked={acknowledged}
                                    onChange={(e) => setAcknowledged(e.target.checked)}
                                />
                                <span>I understand this uses my API token</span>
                            </div>

                            <button
                                disabled={!apiInput || !acknowledged}
                                onClick={() => {
                                    localStorage.setItem("forge_api_key", apiInput);
                                    setShowApiModal(false);

                                    // 🔥 RELOAD MODS AFTER ENTERING KEY
                                    window.location.reload();
                                }}
                                className="w-full py-2 rounded bg-primary text-white disabled:opacity-50"
                            >
                                Continue
                            </button>

                        </div>
                    </div>
                )}
            </div>
        </>
    );
}