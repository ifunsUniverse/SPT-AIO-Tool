import { useEffect } from "react";


export default function Notification({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`
      fixed top-4 right-4 z-50
      px-4 py-3 rounded-lg shadow-lg
      text-sm font-medium
      transition-all
      ${type === "error" && "bg-red-500 text-white"}
      ${type === "success" && "bg-green-500 text-white"}
      ${type === "info" && "bg-blue-500 text-white"}
    `}>
      {message}
    </div>
  );
}
