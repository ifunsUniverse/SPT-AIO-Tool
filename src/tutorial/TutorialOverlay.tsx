import { useEffect, useState } from "react";
import { useTutorial } from "./TutorialProvider";
import { tutorialSteps } from "./tutorialSteps";

export default function TutorialOverlay() {
    const { step, enabled, started } = useTutorial();
    const [rect, setRect] = useState<DOMRect | null>(null);

    const current = tutorialSteps.find((s) => s.step === step);

    useEffect(() => {
        if (!current) return;
        if (!started || currentStep === null) return null;

        const el = document.getElementById(current.target);
        if (!el) {
            setRect(null);
            return;
        }

        const update = () => {
            const r = el.getBoundingClientRect();
            setRect(r);
        };

        update();

        window.addEventListener("resize", update);
        window.addEventListener("scroll", update);

        return () => {
            window.removeEventListener("resize", update);
            window.removeEventListener("scroll", update);
        };
    }, [step, current]);

    if (!enabled || !current) return null;

    return (
        <div className="fixed inset-0 z-[9999] pointer-events-none">

            {/* DARK OVERLAY */}
            {started && (
                <div className="absolute inset-0 bg-black/70" />
            )}

            {/* 🔥 SPOTLIGHT CUTOUT */}
            {rect && (
                <div
                    className="absolute border-2 border-primary rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] transition-all duration-300"
                    style={{
                        top: rect.top - 6,
                        left: rect.left - 6,
                        width: rect.width + 12,
                        height: rect.height + 12,
                    }}
                />
            )}

            {/* TOOLTIP */}
            {rect && (
                <div
                    className="absolute bg-background border border-border rounded-xl px-4 py-3 shadow-xl text-sm pointer-events-auto max-w-xs"
                    style={{
                        top: rect.bottom + 10,
                        left: rect.left,
                    }}
                >
                    {current.text}
                </div>
            )}

        </div>
    );
}