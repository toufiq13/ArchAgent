import { useState, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

const HomePage = lazy(() => import("./pages/HomePage"));
const OrchestrationPage = lazy(() => import("./pages/OrchestrationPage"));
const ShowcasePage = lazy(() => import("./pages/ShowcasePage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const DemoPage = lazy(() => import("./pages/DemoPage"));

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem("auth_token") === "true";
  });

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  return (
    <BrowserRouter>
      <Suspense fallback={<div className="bg-black h-screen w-screen flex items-center justify-center text-white font-sans uppercase tracking-[0.4em] text-[10px]">Synchronizing Neural Architecture...</div>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route 
            path="/login" 
            element={
              isAuthenticated ? (
                <Navigate to="/orchestration" replace />
              ) : (
                <LoginPage onLogin={handleLogin} />
              )
            } 
          />
          <Route 
            path="/orchestration" 
            element={
              isAuthenticated ? (
                <OrchestrationPage />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          <Route path="/showcase" element={<ShowcasePage />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
