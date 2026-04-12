import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App.jsx";
import { FilterProvider } from "./context/FilterContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <FilterProvider>
      <App />
    </FilterProvider>
  </React.StrictMode>,
);
