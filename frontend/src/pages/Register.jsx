import React, { useState } from "react";
import axios from "axios";

export default function Register(){
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const API = import.meta.env.VITE_API;

  const submit = async () => {
    try {
      await axios.post(`${API}/register`, form);
      alert("Registered. Please login.");
      window.location.href = "/";
    } catch (err) {
      alert(err?.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="centered">
      <div className="auth-card">
        <h2>Create Account</h2>
        <input placeholder="Name" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} />
        <input placeholder="Email" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} />
        <input type="password" placeholder="Password" value={form.password} onChange={e=>setForm({...form, password: e.target.value})} />
        <button onClick={submit}>Register</button>
        <div className="muted"><a href="/">Back to login</a></div>
      </div>
    </div>
  );
}
