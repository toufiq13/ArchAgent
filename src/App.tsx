import { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

const HomePage = lazy(() => import("./pages/HomePage"));
const OrchestrationPage = lazy(() => import("./pages/OrchestrationPage"));
const ShowcasePage = lazy(() => import("./pages/ShowcasePage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const DemoPage = lazy(() => import("./pages/DemoPage"));

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
      } else if (localStorage.getItem("auth_token") === "mock") {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setIsAuthenticated(true);
        localStorage.setItem("auth_token", "true");
      } else if (localStorage.getItem("auth_token") === "mock") {
        setIsAuthenticated(true);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        localStorage.removeItem("auth_token");
      } else {
        // For INITIAL_SESSION with no session and no mock token
        // We set to false but don't necessarily wipe token yet to be safe, 
        // though if no mock and no session, token is likely null anyway.
        setIsAuthenticated(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  if (isAuthenticated === null) {
    return <div className="bg-black h-screen w-screen flex items-center justify-center text-white font-sans uppercase tracking-[0.4em] text-[10px]">Initializing Auth...</div>;
  }

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
