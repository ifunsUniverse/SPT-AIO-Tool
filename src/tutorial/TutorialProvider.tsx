import { createContext, useContext, useState, useEffect } from "react";

type TutorialContextType = {
    step: number;
    enabled: boolean;
    started: boolean;
    nextStep: () => void;
    setStep: (step: number) => void;
    startTutorial: () => void;
    stopTutorial: () => void;
};

const TutorialContext = createContext<TutorialContextType | null>(null);
const [started, setStarted] = useState(false);
const startTutorial = () => {
    setStarted(true);
    setCurrentStep(0);
};

export const useTutorial = () => {
    const ctx = useContext(TutorialContext);
    if (!ctx) throw new Error("useTutorial must be used inside TutorialProvider");
    return ctx;
};

export const TutorialProvider = ({ children }: any) => {
    const [step, setStep] = useState(0);
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        const savedEnabled = localStorage.getItem("tutorialEnabled") === "true";
        const savedStep = Number(localStorage.getItem("tutorialStep") || 0);

        setEnabled(savedEnabled);
        setStep(savedStep);
    }, []);

    const nextStep = () => {
        setStep((prev) => {
            const next = prev + 1;
            localStorage.setItem("tutorialStep", String(next));
            return next;
        });
    };

    const startTutorial = () => {
        localStorage.setItem("tutorialEnabled", "true");
        localStorage.setItem("tutorialStep", "0");

        setEnabled(true);
        setStarted(true); // 🔥 ADD THIS
        setStep(0);
    };

    const stopTutorial = () => {
        localStorage.setItem("tutorialEnabled", "false");
        localStorage.setItem("tutorialSeen", "true");
        setEnabled(false);
    };

    return (
        <TutorialContext.Provider
            value={{ step, enabled, started, nextStep, setStep, startTutorial, stopTutorial }}
        >
            {children}
        </TutorialContext.Provider>
    );
};