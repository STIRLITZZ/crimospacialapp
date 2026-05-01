import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App.jsx";
import { EtlStatusProvider } from "./context/EtlStatusContext.jsx";
import { FilterProvider } from "./context/FilterContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <EtlStatusProvider>
        <FilterProvider>
          <App />
        </FilterProvider>
      </EtlStatusProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
