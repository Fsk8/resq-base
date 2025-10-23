import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AppProviders } from "../providers";

// Si estás usando el overlay de errores de debug que te pasé, déjalo igual.
// Solo asegúrate de renderizar App dentro de AppProviders.

ReactDOM.createRoot(document.getElementById("root")!).render(
  // quita StrictMode si sigues depurando para evitar dobles efectos
  // <React.StrictMode>
  <AppProviders>
    <App />
  </AppProviders>
  // </React.StrictMode>
);
