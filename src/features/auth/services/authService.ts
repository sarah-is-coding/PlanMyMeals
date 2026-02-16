import { supabase } from "../../../lib/supabaseClient";

export const authService = {
  signInWithEmail(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password });
  },

  signUpWithEmail(email: string, password: string) {
    return supabase.auth.signUp({ email, password });
  },

  requestPasswordReset(email: string, redirectTo: string) {
    return supabase.auth.resetPasswordForEmail(email, { redirectTo });
  },

  updatePassword(password: string) {
    return supabase.auth.updateUser({ password });
  },

  signOut() {
    return supabase.auth.signOut();
  },
};
