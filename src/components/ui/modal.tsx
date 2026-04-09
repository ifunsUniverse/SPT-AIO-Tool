import { useEffect } from "react";
import { FaCheckCircle, FaTimes } from "react-icons/fa";

type Props = {
  title: string;
  message: string;
  onClose: () => void;
};

export default function Modal({ title, message, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">

      {/* CARD */}
      <div className="
        w-full max-w-md
        rounded-2xl
        border border-border
        bg-card
        p-6
        shadow-2xl
        animate-in
      ">

        {/* HEADER */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">

            {/* ICON */}
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <FaCheckCircle className="text-green-400 text-xl" />
            </div>

            <h2 className="text-lg font-semibold">{title}</h2>
          </div>

          {/* CLOSE X */}
          <button onClick={onClose} className="text-muted-foreground hover:text-white">
            <FaTimes />
          </button>
        </div>

        {/* BODY */}
        <div className="text-sm text-muted-foreground space-y-3">
          <p>{message}</p>
        </div>

        {/* BUTTON */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="
              px-4 py-2
              rounded-lg
              bg-primary
              text-primary-foreground
              hover:opacity-90
            "
          >
            Okay
          </button>
        </div>
      </div>
    </div>
  );
}