import React, { useState } from "react";
import axios from "axios";

export default function Register(){
  const API = import.meta.env.VITE_API;
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const submit = async () => {
    try {
      const res = await axios.post(`${API}/register`, form);
      alert(res.data.message || "Registered");
      window.location.href = "/";
    } catch (err) {
      alert(err?.response?.data?.message || "Register failed");
    }
  };

  return (
    <div className="centered">
      <div className="auth-card">
        <h2>Create Account</h2>
        <input placeholder="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
        <input placeholder="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
        <input type="password" placeholder="Password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} />
        <button onClick={submit}>Register</button>
        <div className="muted"><a href="/">Back to login</a></div>
      </div>
    </div>
  );
}
