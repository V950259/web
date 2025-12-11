import { useState } from "react";
import Login from "./pages/Login";
import MapPage from "./pages/MapPage";

export default function App() {
  const [authed, setAuthed] = useState(false);
  return authed ? <MapPage /> : <Login onSuccess={() => setAuthed(true)} />;
}

