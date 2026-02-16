import type { Session } from "@supabase/supabase-js";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AuthPage from "../features/auth/AuthPage";
import AppHomePage from "./pages/AppHomePage";
import LandingPage from "./pages/LandingPage";

type AppRouterProps = {
  session: Session | null;
  authReady: boolean;
};

export default function AppRouter({ session, authReady }: AppRouterProps) {
  if (!authReady) {
    return (
      <main className="status-page">
        <p>Loading your session...</p>
      </main>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage isAuthenticated={!!session} />} />
        <Route
          path="/auth"
          element={session ? <Navigate to="/app" replace /> : <AuthPage />}
        />
        <Route
          path="/app"
          element={
            session ? <AppHomePage session={session} /> : <Navigate to="/auth" replace />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
