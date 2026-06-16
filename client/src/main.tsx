import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { FontLoader } from "./utils/fontLoader";

// Initialize font loading immediately
FontLoader.getInstance().initializeFonts();

createRoot(document.getElementById("root")!).render(<App />);
