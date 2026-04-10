import React, { useEffect, useState } from "react";
import { FcOpenedFolder } from "react-icons/fc";
import { useTutorial } from "../tutorial/TutorialProvider";




export default function Hub({
    goToEditor,
    goToBrowser,
}: {

    goToEditor: () => void;
    goToBrowser: () => void;
}) {
    const { nextStep, enabled } = useTutorial();
    const [showSPTModal, setShowSPTModal] = useState(false);


    useEffect(() => {
        const shouldShow = localStorage.getItem("show-spt-modal") === "true";

        if (shouldShow) {
            setShowSPTModal(true);
            localStorage.removeItem("show-spt-modal");
        }
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">

            <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-8 shadow-lg">

                <div className="flex flex-col items-center text-center space-y-8">

                    {/* TITLE */}
                    <div>
                        <h1 className="text-2xl font-bold">
                            SPT Control Hub
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            What would you like to do?
                        </p>
                    </div>

                    {/* BUTTONS */}
                    {/* FEATURE CARDS */}
                    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* CONFIG EDITOR */}
                        <div
                            id="editor-card"
                            onClick={() => {
                                if (showSPTModal) return;

                                goToEditor();

                                if (enabled) nextStep();
                            }}
                            className="cursor-pointer rounded-xl border border-border bg-background/40 p-6 hover:bg-background/60 transition group"
                        >
                            <div className="flex flex-col items-center text-center space-y-4">

                                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-xl">
                                    <FcOpenedFolder />
                                </div>

                                <div>
                                    <h2 className="text-lg font-semibold group-hover:text-primary transition">
                                        Config Editor
                                    </h2>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Edit mod configuration files with a visual editor
                                    </p>
                                </div>

                            </div>
                        </div>

                        {/* MOD BROWSER */}
                        <div
                            onClick={goToBrowser}
                            className="cursor-pointer rounded-xl border border-border bg-background/40 p-6 hover:bg-background/60 transition group"
                        >
                            <div className="flex flex-col items-center text-center space-y-4">

                                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-xl">
                                    🌐
                                </div>

                                <div>
                                    <h2 className="text-lg font-semibold group-hover:text-primary transition">
                                        Mod Browser
                                    </h2>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Browse and discover mods from the community
                                    </p>
                                </div>

                            </div>
                        </div>

                    </div>

                </div>

            </div>

            {showSPTModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70">
                    <div className="bg-background border border-border rounded-xl p-6 w-[420px] text-center">
                        <h2 className="text-lg font-semibold mb-3">SPT Detected</h2>

                        <p className="text-sm text-muted-foreground mb-5">
                            Your SPT install is ready. You can now manage mods and configs.
                        </p>

                        <button
                            onClick={() => setShowSPTModal(false)}
                            className="px-4 py-2 bg-primary rounded text-white"
                        >
                            Continue
                        </button>
                    </div>
                </div>
            )}
        </div >
    );
}