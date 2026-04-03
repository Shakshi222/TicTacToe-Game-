// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Game from "./pages/Game";
import Leaderboard from "./pages/Leaderboard";
import Rooms from "./pages/Rooms";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"              element={<Home />} />
        <Route path="/game/:matchId" element={<Game />} />
        <Route path="/leaderboard"   element={<Leaderboard />} />
        <Route path="/rooms"         element={<Rooms />} />
      </Routes>
    </BrowserRouter>
  );
}
