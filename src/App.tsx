import { useState } from "react";
import Home from "./pages/Home";
import EditorPage from "./pages/Editor";
import Notification from "./components/ui/notifacation";
import Modal from "./components/ui/modal";
import Hub from "./pages/Hub";
import ModBrowser from "./pages/ModBrowser";
import { TutorialProvider } from "./tutorial/TutorialProvider";
import TutorialOverlay from "./tutorial/TutorialOverlay";


function App() {
  const [page, setPage] = useState<"home" | "hub" | "editor" | "browser">("home");
  const [notif, setNotif] = useState<any>(null);
  const [modal, setModal] = useState<any>(null);
  const goToBrowser = () => setPage("browser");

  return (
    <TutorialProvider>
      <>
        {/* 🔥 GLOBAL NOTIFICATION */}
        {notif && (
          <Notification
            message={notif.message}
            type={notif.type}
            onClose={() => setNotif(null)}
          />
        )}

        {modal && (
          <Modal
            title={modal.title}
            message={modal.message}
            onClose={() => setModal(null)}
          />
        )}

        {/* PAGES */}
        {page === "home" && (
          <Home goToHub={() => setPage("hub")} setModal={setModal} />
        )}

        {page === "hub" && (
          <Hub
            goToEditor={() => setPage("editor")}
            goToBrowser={() => setPage("browser")}
          />
        )}

        {page === "editor" && (
          <EditorPage
            setNotif={setNotif}
            goToHome={() => setPage("home")}
          />
        )}

        {page === "browser" && (
          <ModBrowser goToHub={() => setPage("hub")} />
        )}

        {/* 👇 ADD THIS */}
        <TutorialOverlay />
      </>
    </TutorialProvider>
  );
}

export default App;