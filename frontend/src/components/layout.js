import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore, useThemeStore } from "../store";
import { useSocket } from "../hooks/useSocket";

const MODS = [
  { path:"/",           label:"Dashboard",    icon:"🏠", roles:["ADMIN","CHA","GATE_OPERATOR","WEIGHBRIDGE_OPERATOR"] },
  { path:"/cha",        label:"CHA Portal",   icon:"📋", roles:["ADMIN","CHA"] },
  { path:"/gate",       label:"Gate Module",  icon:"🚪", roles:["ADMIN","GATE_OPERATOR"] },
  { path:"/weighbridge",label:"Weighbridge",  icon:"⚖️", roles:["ADMIN","WEIGHBRIDGE_OPERATOR"] },
  { path:"/registration",label:"Registration",icon:"🗄️", roles:["ADMIN","GATE_OPERATOR"] },
  { path:"/reports",    label:"Reports",      icon:"📊", roles:["ADMIN"] },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const { dark, toggle } = useThemeStore();
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [notifications, setNotifications] = useState([]);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => { window.removeEventListener("resize", h); clearInterval(t); };
  }, []);

  useSocket({
    permit_updated: (data) => setNotifications(p => [{ id: Date.now(), msg: `Permit ${data.permit?.permitId} → ${data.stage}`, type:"info" }, ...p.slice(0,4)]),
    permit_alert:   (data) => setNotifications(p => [{ id: Date.now(), msg: data.message, type:"alert" }, ...p.slice(0,4)]),
    gate_entry:     (data) => setNotifications(p => [{ id: Date.now(), msg: `Gate entry: ${data.plate}`, type:"info" }, ...p.slice(0,4)]),
  });

  const navItems = MODS.filter(m => m.roles.includes(user?.role));

  const handleLogout = () => { logout(); navigate("/login"); };

  const SidebarContent = () => (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      {/* Logo */}
      <div style={{ padding:"20px 16px 16px", borderBottom:`1px solid var(--gray-200)` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:36, height:36, background:"linear-gradient(135deg,#1E90FF,#1B2B4B)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>⚓</div>
          <div>
            <div style={{ fontFamily:"Outfit,sans-serif", fontWeight:800, fontSize:14, color:"var(--navy)" }}>Smart Gate</div>
            <div style={{ fontSize:10, color:"var(--gray-500)" }}>DPA · IIT Madras · 2026</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding:"12px 10px", flex:1 }}>
        {navItems.map(m => (
          <NavLink key={m.path} to={m.path} end={m.path==="/"} onClick={() => isMobile && setDrawer(false)}
            style={({ isActive }) => ({
              display:"flex", alignItems:"center", gap:10, width:"100%", padding:"10px 14px",
              background: isActive ? "var(--blue-xl)" : "transparent",
              color: isActive ? "var(--blue)" : "var(--gray-500)",
              border:"none", borderRadius:10, fontWeight: isActive ? 700 : 500, fontSize:14,
              marginBottom:2, transition:"all .12s", textDecoration:"none",
            })}>
            <span style={{ fontSize:16 }}>{m.icon}</span>{m.label}
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      <div style={{ padding:"14px 16px", borderTop:`1px solid var(--gray-200)` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
          <div style={{ width:32, height:32, borderRadius:"50%", background:"linear-gradient(135deg,#1E90FF,#1B2B4B)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:14, flexShrink:0 }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontWeight:600, fontSize:13, color:"var(--navy)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.name}</div>
            <div style={{ fontSize:11, color:"var(--gray-500)" }}>{user?.role?.replace("_"," ")}</div>
          </div>
        </div>
        <button className="btn btn-gh btn-sm btn-full" onClick={handleLogout}>🚪 Logout</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"var(--gray-50)", display:"flex", flexDirection:"column" }}>
      {/* Top bar */}
      <div style={{ background:"var(--white)", borderBottom:`1px solid var(--gray-200)`, padding:`0 ${isMobile?"14px":"24px"}`, height:56, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:150, boxShadow:"var(--shadow)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {isMobile && (
            <button onClick={() => setDrawer(true)} style={{ background:"none", border:"none", padding:6, fontSize:20, display:"flex", flexDirection:"column", gap:4 }}>
              {[20,15,20].map((w,i) => <div key={i} style={{ width:w, height:2, background:"var(--navy)", borderRadius:2 }}/>)}
            </button>
          )}
          {!isMobile && <div style={{ width:28, height:28, background:"linear-gradient(135deg,#1E90FF,#1B2B4B)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>⚓</div>}
          <span style={{ fontFamily:"Outfit,sans-serif", fontWeight:800, fontSize: isMobile?13:15, color:"var(--navy)" }}>Smart Gate Automation System</span>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap: isMobile?8:16 }}>
          {!isMobile && (
            <div style={{ display:"flex", gap:12 }}>
              {[{l:"POS",c:"var(--green)"},{l:"ANPR",c:"var(--blue)"},{l:"WB",c:"var(--green)"}].map((s,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:s.c, boxShadow:`0 0 5px ${s.c}` }}/>
                  <span style={{ fontSize:11, color:"var(--gray-500)" }}>{s.l}</span>
                </div>
              ))}
            </div>
          )}
          {notifications.length > 0 && (
            <div style={{ background:"var(--red-xl)", borderRadius:8, padding:"4px 10px", fontSize:11, color:"var(--red)", fontWeight:700 }}>🔔 {notifications.length}</div>
          )}
          <div style={{ fontFamily:"JetBrains Mono,monospace", fontSize:12, fontWeight:700, color:"var(--navy)", background:"var(--blue-xl)", padding:"4px 10px", borderRadius:7 }}>
            {time.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
          </div>
          <button onClick={toggle} style={{ background:"none", border:"none", fontSize:18, padding:4 }}>{dark ? "☀️" : "🌙"}</button>
        </div>
      </div>

      <div style={{ display:"flex", flex:1 }}>
        {/* Desktop sidebar */}
        {!isMobile && (
          <div style={{ width:220, background:"var(--white)", borderRight:`1px solid var(--gray-200)`, position:"sticky", top:56, height:"calc(100vh - 56px)", overflow:"auto", flexShrink:0 }}>
            <SidebarContent />
          </div>
        )}

        {/* Mobile drawer */}
        {isMobile && drawer && (
          <>
            <div className="fade-in" onClick={() => setDrawer(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:200 }}/>
            <div style={{ position:"fixed", top:0, left:0, bottom:0, width:260, background:"var(--white)", zIndex:201, animation:"slideRight .25s ease", boxShadow:"8px 0 32px rgba(0,0,0,.15)" }}>
              <SidebarContent />
            </div>
          </>
        )}

        {/* Main content */}
        <main style={{ flex:1, overflow:"auto", padding: isMobile ? "12px 12px 80px" : "22px" }}>
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      {isMobile && (
        <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"var(--white)", borderTop:`1px solid var(--gray-200)`, display:"flex", zIndex:100, boxShadow:"0 -2px 12px rgba(0,0,0,.08)" }}>
          {navItems.slice(0, 5).map(m => (
            <NavLink key={m.path} to={m.path} end={m.path==="/"} style={({ isActive }) => ({ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"8px 4px", color: isActive ? "var(--blue)" : "var(--gray-500)", textDecoration:"none" })}>
              {({ isActive }) => (<>
                <span style={{ fontSize:18 }}>{m.icon}</span>
                <span style={{ fontSize:9, fontWeight: isActive ? 700 : 500, marginTop:1 }}>{m.label.split(" ")[0]}</span>
                {isActive && <div style={{ width:4, height:4, borderRadius:"50%", background:"var(--blue)", marginTop:2 }}/>}
              </>)}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
