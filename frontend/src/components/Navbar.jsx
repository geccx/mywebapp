import React, { useState, useEffect } from "react";

export default function Navbar({ onProfile, onLogout }) {
  const [profile, setProfile] = useState(null);

  // Fix: Build correct root URL for images
  const API = import.meta.env.VITE_API;
  const API_ROOT = API.replace("/api", "");

  useEffect(() => {
    async function loadProfile() {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await fetch(`${API}/me`, {
          headers: { Authorization: "Bearer " + token }
        });
        const data = await res.json();
        setProfile(data);
      } catch (err) {
        console.error(err);
      }
    }
    loadProfile();
  }, []);

  return (
    <nav className="nav">
      <div className="nav-left">MyWebApp</div>

      <div className="nav-right">
        {/* Profile Dropdown */}
        <div className="profile-dropdown">
          
          {/* FIXED SMALL PROFILE IMAGE */}
          <img
            src={
              profile?.profile_image
                ? `${API_ROOT}${profile.profile_image}`
                : "https://via.placeholder.com/40?text=U"
            }
            alt="Profile"
            className="pfpic"
          />

          <div className="dropdown-content">
            {/* BLACK BUTTONS */}
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
