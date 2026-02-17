import type { Session } from "@supabase/supabase-js";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AuthPage from "../features/auth/AuthPage";
import GroceryPage from "../features/grocery/pages/GroceryPage";
import MealPlansPage from "../features/meal-plans/pages/MealPlansPage";
import RecipeCreatePage from "../features/recipes/pages/RecipeCreatePage";
import RecipeDetailPage from "../features/recipes/pages/RecipeDetailPage";
import RecipesPage from "../features/recipes/pages/RecipesPage";
import AppWorkspaceLayout from "./components/AppWorkspaceLayout";
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
          element={session ? <AppWorkspaceLayout /> : <Navigate to="/auth" replace />}
        >
          <Route index element={<AppHomePage />} />
          <Route path="recipes" element={<RecipesPage />} />
          <Route path="recipes/new" element={<RecipeCreatePage />} />
          <Route path="recipes/:recipeId" element={<RecipeDetailPage />} />
          <Route path="meal-plans" element={<MealPlansPage />} />
          <Route path="grocery" element={<GroceryPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
