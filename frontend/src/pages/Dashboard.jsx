import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import Modal from "../components/Modal";

export default function Dashboard(){
  const API = import.meta.env.VITE_API;                // http://localhost:5000/api
const API_ROOT = API.replace("/api", "");            // http://localhost:5000

  const token = localStorage.getItem("token");

  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [image, setImage] = useState(null);
  const [editId, setEditId] = useState(null);

  // modals
  const [openView, setOpenView] = useState(false);
  const [viewSrc, setViewSrc] = useState("");
  const [openEdit, setOpenEdit] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);

  // profile
  const [profile, setProfile] = useState({ name: "", email: "", profile_image: null });
  const [pfImage, setPfImage] = useState(null);
  const [pfPassword, setPfPassword] = useState("");

  const headers = { Authorization: "Bearer " + token };

  const loadItems = async () => {
    try {
      const res = await axios.get(`${API}/items`, { headers });
      setItems(res.data);
    } catch (err) { console.error(err); }
  };

  const loadProfile = async () => {
    try {
      const res = await axios.get(`${API}/me`, { headers });
      setProfile(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { loadItems(); loadProfile(); }, []);

  const submitItem = async () => {
    try {
      const fd = new FormData();
      fd.append("name", name);
      if (image) fd.append("image", image);

      if (editId) {
        await axios.put(`${API}/items/${editId}`, fd, { headers });
      } else {
        await axios.post(`${API}/items`, fd, { headers });
      }
      setName(""); setImage(null); setEditId(null);
      loadItems();
    } catch (err) {
      alert("Error saving item");
    }
  };

  const startEdit = (item) => {
    setEditId(item.id);
    setName(item.name);
    setOpenEdit(true);
  };

  const remove = async (id) => {
    if (!confirm("Delete this item?")) return;
    await axios.delete(`${API}/items/${id}`, { headers });
    loadItems();
  };

  const viewImage = (item) => {
    if (!item.image) { alert("No image"); return; }
    setViewSrc(`${API_ROOT}${item.image}`);
    setOpenView(true);
  };

  const logout = () => { localStorage.removeItem("token"); window.location.href = "/"; };

  // profile update
  const submitProfile = async () => {
    try {
      const fd = new FormData();
      if (profile.name) fd.append("name", profile.name);
      if (profile.email) fd.append("email", profile.email);
      if (pfPassword) fd.append("password", pfPassword);
      if (pfImage) fd.append("profile", pfImage);

      await axios.put(`${API}/me`, fd, { headers });
      setPfPassword("");
      setPfImage(null);
      setOpenProfile(false);
      loadProfile();
    } catch (err) {
      alert(err?.response?.data?.message || "Profile update failed");
    }
  };

  const openProfileModal = () => setOpenProfile(true);

  return (
    <>
      <Navbar onProfile={openProfileModal} onLogout={logout} />
      <div className="container">
        <div className="top-actions">
          <div style={{flex:1}}>
            <input placeholder="Item name" value={name} onChange={e=>setName(e.target.value)} />
            <input type="file" onChange={e=>setImage(e.target.files[0])} />
            <button onClick={submitItem}>{editId ? "Update Item" : "Add Item"}</button>
            { editId && <button className="btn-muted" onClick={()=>{ setEditId(null); setName(""); }}>Cancel Edit</button>}
          </div>
        </div>

        <h3>Your Items</h3>
        <ul className="item-list">
          {items.map(it => (
            <li key={it.id}>
              <div style={{flex:1}}>
                <strong>{it.name}</strong>
                <div className="muted">Added: {new Date(it.created_at).toLocaleString()}</div>
              </div>

              <div className="item-actions">
                <button onClick={()=>viewImage(it)}>View</button>
                <button onClick={()=>startEdit(it)}>Edit</button>
                <button className="btn-danger" onClick={()=>remove(it.id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* View Image Modal */}
      <Modal open={openView} onClose={()=>setOpenView(false)} title="Image Preview">
        <div style={{textAlign:"center"}}>
          <img src={viewSrc} alt="full" style={{maxWidth:"100%", maxHeight:"70vh"}} />
        </div>
      </Modal>

      {/* Edit Item Modal */}
      <Modal open={openEdit} onClose={()=>setOpenEdit(false)} title={editId ? "Edit Item" : "New Item"}>
        <div>
          <input placeholder="Item name" value={name} onChange={e=>setName(e.target.value)} />
          <input type="file" onChange={e=>setImage(e.target.files[0])} />
          <div style={{display:"flex", gap:8, marginTop:8}}>
            <button onClick={() => { submitItem(); setOpenEdit(false); }}>Save</button>
            <button className="btn-muted" onClick={()=>setOpenEdit(false)}>Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Profile Modal */}
      <Modal open={openProfile} onClose={()=>setOpenProfile(false)} title="My Profile">
        <div>
          <div style={{display:"flex", gap:12, alignItems:"center"}}>
            <img
  src={
    profile.profile_image
      ? `${API_ROOT}${profile.profile_image}`
      : "https://via.placeholder.com/80?text=U"
  }
  className="profile-modal-pic"
  alt="profile"
/>

            <div>
              <input placeholder="Name" value={profile.name || ""} onChange={e=>setProfile({...profile, name:e.target.value})} />
              <input placeholder="Email" value={profile.email || ""} onChange={e=>setProfile({...profile, email:e.target.value})} />
            </div>
          </div>

          <div style={{marginTop:8}}>
            <input type="password" placeholder="New password (leave blank to keep)" value={pfPassword} onChange={e=>setPfPassword(e.target.value)} />
            <input type="file" onChange={e=>setPfImage(e.target.files[0])} />
          </div>

          <div style={{display:"flex", gap:8, marginTop:12}}>
            <button onClick={submitProfile}>Save Profile</button>
            <button className="btn-muted" onClick={()=>setOpenProfile(false)}>Cancel</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
