import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store";

export default function Login() {
  const { login, loading } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email:"", password:"" });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const res = await login(form.email, form.password);
    if (res.success) navigate("/");
    else setError(res.message);
  };

  const demos = [
    { label:"Admin", email:"admin@dpa.gov.in", pass:"Admin@123", color:"#1E90FF" },
    { label:"CHA", email:"cha@dpa.gov.in", pass:"Cha@1234", color:"#FF6B35" },
    { label:"Gate Op", email:"gate@dpa.gov.in", pass:"Gate@1234", color:"#22C55E" },
    { label:"Weighbridge", email:"weigh@dpa.gov.in", pass:"Weigh@1234", color:"#F59E0B" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#1B2B4B 0%,#1E90FF 100%)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ width:"100%", maxWidth:420 }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ width:60, height:60, background:"rgba(255,255,255,.15)", borderRadius:16, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, margin:"0 auto 12px" }}>⚓</div>
          <div style={{ fontFamily:"Outfit,sans-serif", fontWeight:800, fontSize:22, color:"#fff" }}>Smart Gate Automation</div>
          <div style={{ color:"rgba(255,255,255,.6)", fontSize:13, marginTop:4 }}>Deendayal Port Authority · IIT Madras</div>
        </div>

        {/* Form card */}
        <div className="card" style={{ padding:28 }}>
          <h2 style={{ fontFamily:"Outfit,sans-serif", fontWeight:700, fontSize:20, marginBottom:20, color:"var(--navy)" }}>Sign In</h2>
          {error && <div style={{ background:"var(--red-xl)", border:"1px solid var(--red)", borderRadius:8, padding:"10px 14px", color:"var(--red)", fontSize:13, marginBottom:16 }}>⚠ {error}</div>}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom:14 }}>
              <label className="lbl">Email Address</label>
              <input className="inp" type="email" value={form.email} onChange={e => setForm(p => ({...p, email:e.target.value}))} placeholder="you@dpa.gov.in" required />
            </div>
            <div style={{ marginBottom:20 }}>
              <label className="lbl">Password</label>
              <input className="inp" type="password" value={form.password} onChange={e => setForm(p => ({...p, password:e.target.value}))} placeholder="••••••••" required />
            </div>
            <button className="btn btn-p btn-full" type="submit" disabled={loading} style={{ fontSize:15, padding:"12px" }}>
              {loading ? "⟳ Signing in..." : "Sign In →"}
            </button>
          </form>

          {/* Demo logins */}
          <div style={{ marginTop:20, paddingTop:20, borderTop:"1px solid var(--gray-200)" }}>
            <div style={{ color:"var(--gray-500)", fontSize:11, fontWeight:700, marginBottom:10, textTransform:"uppercase", letterSpacing:.5 }}>Demo Accounts (click to fill)</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {demos.map(d => (
                <button key={d.label} onClick={() => setForm({ email:d.email, password:d.pass })}
                  style={{ background:`${d.color}11`, border:`1.5px solid ${d.color}44`, borderRadius:8, padding:"8px 10px", color:d.color, fontSize:12, fontWeight:600, cursor:"pointer", textAlign:"left" }}>
                  <div>{d.label}</div>
                  <div style={{ fontSize:10, opacity:.7, marginTop:1, fontFamily:"JetBrains Mono,monospace" }}>{d.email.split("@")[0]}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
