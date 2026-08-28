import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import VendorApp from "./pages/VendorApp.jsx";
import { Navigate } from "react-router-dom";
import VendorPage from "./pages/VendorPage.jsx";
import CustomerApp from "./pages/CustomerApp.jsx";
import CustomerPage from "./pages/CustomerPage.jsx";
import ImageGallery from "./components/ImageGallery.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/vendor/*" element={<VendorApp />}>
          <Route index element={<Navigate to="main" replace />} />
          <Route path="main" element={<VendorPage />} />
          <Route path="dashboard" element={<VendorPage />} />
          <Route path="gallery" element={<ImageGallery />} />
        </Route>
        <Route path="/customer/*" element={<CustomerApp />}>
          <Route index element={<Navigate to="main" replace />} />
          <Route path="main" element={<CustomerPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
