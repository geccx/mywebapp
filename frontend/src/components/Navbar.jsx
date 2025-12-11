import React, { useState, useEffect } from "react";

export default function Navbar({ onProfile, onLogout }) {
  const [profile, setProfile] = useState(null);
  const API = import.meta.env.VITE_API;
  const API_ROOT = API.replace("/api", "");

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await fetch(`${API}/me`, {
          headers: { Authorization: "Bearer " + token },
        });
        if (!res.ok) return; // ignore
        const data = await res.json();
        setProfile(data);
      } catch (err) {
        console.error("Navbar load profile error:", err);
      }
    }
    load();
  }, []);

  return (
    <nav className="nav">
      <div className="nav-left">MyWebApp</div>
      <div className="nav-right">
        <div className="profile-dropdown">
          <img
            src={
              profile?.profile_image
                ? `${API_ROOT}${profile.profile_image}`
                : "https://via.placeholder.com/40?text=U"
            }
            alt="pf"
            className="pfpic"
          />
          <div className="dropdown-content">
            <button className="dropdown-btn" onClick={onProfile}>
              Profile
            </button>
            <button className="dropdown-btn" onClick={onLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
