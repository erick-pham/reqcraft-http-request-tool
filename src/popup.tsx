import React from "react";
import ReactDOM from "react-dom/client";
import Popup from "./pages/Popup";

const rootEl = document.getElementById("root") || document.body;
ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
