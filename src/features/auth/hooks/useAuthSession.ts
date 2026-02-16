import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabaseClient";

export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session ?? null);
      setAuthReady(true);
    };

    syncSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      }
    );

    return () => listener?.subscription.unsubscribe();
  }, []);

  return { session, authReady };
}
