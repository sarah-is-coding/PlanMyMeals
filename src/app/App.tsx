import "../styles/app.css";
import { useAuthSession } from "../features/auth/hooks/useAuthSession";
import AppRouter from "./AppRouter";

function App() {
  const { session, authReady } = useAuthSession();
  return <AppRouter session={session} authReady={authReady} />;
}

export default App;
