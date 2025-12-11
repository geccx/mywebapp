import React, { useState } from "react";
import axios from "axios";

export default function Login() {
  const API = import.meta.env.VITE_API;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    try {
      const res = await axios.post(`${API}/login`, { email, password });
      localStorage.setItem("token", res.data.token);
      window.location.href = "/dashboard";
    } catch (err) {
      alert(err?.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="centered">
      <div className="auth-card">
        <h2>Login</h2>
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button onClick={login}>Login</button>
        <div className="muted">Don't have an account? <a href="/register">Register</a></div>
      </div>
    </div>
  );
}
