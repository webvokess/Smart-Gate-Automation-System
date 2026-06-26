import { useEffect, useState } from "react";
import { dashAPI } from "../../services/api";
import { useSocket } from "../../hooks/useSocket";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const PC = ["#1E90FF","#4AAEFF","#FF6B35","#FFB347","#22C55E","#F59E0B"];

const TipBox = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"var(--white)", border:"1px solid var(--gray-200)", borderRadius:10, padding:"10px 14px", boxShadow:"var(--shadow-md)" }}>
      <div style={{ fontWeight:700, color:"var(--navy)", fontSize:12, marginBottom:4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color:p.color, fontSize:12 }}>{p.name}: <b>{p.value}</b></div>
      ))}
    </div>
  );
};

const StatCard = ({ icon, label, value, trend, trendUp, color = "#1E90FF", loading }) => (
  <div className="card" style={{ padding:"18px 16px", flex:1, minWidth:140, borderTop:`3px solid ${color}` }}>
    {loading ? (
      <div>
        <div className="skeleton" style={{ height:14, width:80, marginBottom:8 }}/>
        <div className="skeleton" style={{ height:30, width:60 }}/>
      </div>
    ) : (
      <>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize:12, color:"var(--gray-500)", marginBottom:4 }}>{label}</div>
            <div style={{ fontFamily:"Outfit,sans-serif", fontSize:30, fontWeight:800, color:"var(--navy)", lineHeight:1 }}>{value}</div>
          </div>
          <div style={{ width:40, height:40, borderRadius:10, background:`${color}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
            {icon}
          </div>
        </div>
        {trend && (
          <div style={{ marginTop:10 }}>
            <span style={{ background:trendUp?"var(--green-xl)":"var(--red-xl)", color:trendUp?"var(--green)":"var(--red)", borderRadius:5, padding:"2px 7px", fontSize:11, fontWeight:700 }}>
              {trendUp?"↑":"↓"} {trend}
            </span>
          </div>
        )}
      </>
    )}
  </div>
);

const stageTags   = { GATE_ENTRY:"tag-b", TARE_WEIGH:"tag-y", LOADING:"tag-o", GROSS_WEIGH:"tag-o", GATE_EXIT:"tag-b", COMPLETED:"tag-g" };
const stageLabels = { GATE_ENTRY:"Gate Entry", TARE_WEIGH:"Tare Weigh", LOADING:"Loading", GROSS_WEIGH:"Gross Weigh", GATE_EXIT:"Gate Exit", COMPLETED:"Completed" };

export default function Dashboard() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");

  const load = async () => {
    try {
      const res = await dashAPI.stats();
      setData(res.data.data);
      setError("");
    } catch (e) {
      setError("Could not load dashboard data.");
      console.error(e);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useSocket({
    permit_updated: () => load(),
    gate_entry:     () => load(),
    weight_updated: () => load(),
    permit_created: () => load(),
  });

  const stats         = data?.stats         ?? {};
  const weekly        = data?.weekly        ?? [];
  const stages        = data?.stages        ?? [];
  const hourly        = data?.hourly        ?? [];
  const recentPermits = data?.recentPermits ?? [];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }} className="fade-up">
      <div style={{ fontFamily:"Outfit,sans-serif", fontWeight:700, fontSize:20, color:"var(--navy)" }}>Dashboard</div>

      {error && (
        <div style={{ padding:"10px 14px", borderRadius:8, background:"var(--red-xl)", color:"var(--red)", fontSize:13 }}>
          ⚠ {error}
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
        <StatCard icon="📋" label="Permits Today"    value={stats.totalToday   ?? 0} trend="vs yesterday" trendUp color="#1E90FF" loading={loading}/>
        <StatCard icon="🚛" label="Inside Dock"      value={stats.insideDock   ?? 0}                              color="#FF6B35" loading={loading}/>
        <StatCard icon="⚠️" label="Active Alerts"    value={stats.alerts       ?? 0}                              color="#EF4444" loading={loading}/>
        <StatCard icon="⏱️" label="Avg Gate Time"    value={`${stats.avgTurnaround ?? 0} min`}                   color="#1B2B4B" loading={loading}/>
        <StatCard icon="✅" label="Completed Today"  value={stats.completed    ?? 0}                              color="#22C55E" loading={loading}/>
      </div>

      {/* Charts row */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }} className="grid-mobile-1">
        <div className="card card-p">
          <div style={{ fontWeight:700, color:"var(--navy)", marginBottom:14 }}>📈 Hourly Throughput</div>
          <ResponsiveContainer width="100%" height={175}>
            <AreaChart data={hourly.length ? hourly : [{ h:"—", v:0 }]}>
              <defs>
                <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="10%" stopColor="#1E90FF" stopOpacity={0.18}/>
                  <stop offset="95%" stopColor="#1E90FF" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)"/>
              <XAxis dataKey="h" tick={{ fontSize:10, fill:"var(--gray-500)" }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:10, fill:"var(--gray-500)" }} axisLine={false} tickLine={false} width={28}/>
              <Tooltip content={<TipBox/>}/>
              <Area type="monotone" dataKey="v" name="Vehicles" stroke="#1E90FF" strokeWidth={2.5} fill="url(#bg)" dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card card-p">
          <div style={{ fontWeight:700, color:"var(--navy)", marginBottom:14 }}>📊 Weekly Volume</div>
          <ResponsiveContainer width="100%" height={175}>
            <BarChart data={weekly.length ? weekly : [{ day:"—", permits:0 }]} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)"/>
              <XAxis dataKey="day" tick={{ fontSize:10, fill:"var(--gray-500)" }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:10, fill:"var(--gray-500)" }} axisLine={false} tickLine={false} width={28}/>
              <Tooltip content={<TipBox/>}/>
              <Bar dataKey="permits" name="Permits" fill="#1B2B4B" radius={[4,4,0,0]}/>
              <Bar dataKey="flagged" name="Flagged"  fill="#FF6B35" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stage distribution + recent permits */}
      <div style={{ display:"grid", gridTemplateColumns:"300px 1fr", gap:16 }} className="grid-mobile-1">
        <div className="card card-p">
          <div style={{ fontWeight:700, color:"var(--navy)", marginBottom:14 }}>🔵 Pipeline Distribution</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={stages.length ? stages : [{ name:"—", value:1 }]}
                cx="50%" cy="50%" innerRadius={45} outerRadius={68} paddingAngle={3} dataKey="value">
                {(stages.length ? stages : [{}]).map((_, i) => (
                  <Cell key={i} fill={PC[i % PC.length]}/>
                ))}
              </Pie>
              <Tooltip content={<TipBox/>}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:6 }}>
            {stages.map((s, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:3, fontSize:10, color:"var(--gray-500)" }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:PC[i % PC.length] }}/>
                {stageLabels[s.name] || s.name} ({s.value})
              </div>
            ))}
          </div>
        </div>

        <div className="card card-p">
          <div style={{ fontWeight:700, color:"var(--navy)", marginBottom:14 }}>📡 Recent Permits</div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, minWidth:500 }}>
              <thead>
                <tr style={{ borderBottom:"2px solid var(--gray-100)" }}>
                  {["Permit ID","Vehicle","Driver","Cargo","Declared","Stage"].map(h => (
                    <th key={h} style={{ textAlign:"left", padding:"7px 8px", color:"var(--gray-500)", fontWeight:600, fontSize:11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array(5).fill(0).map((_, i) => (
                      <tr key={i}><td colSpan={6} style={{ padding:8 }}><div className="skeleton" style={{ height:18 }}/></td></tr>
                    ))
                  : recentPermits.map(p => (
                      <tr key={p._id} style={{ borderBottom:"1px solid var(--gray-100)" }}
                        onMouseEnter={e=>e.currentTarget.style.background="var(--gray-50)"}
                        onMouseLeave={e=>e.currentTarget.style.background=""}>
                        <td style={{ padding:"8px", fontFamily:"JetBrains Mono,monospace", fontWeight:700, color:"var(--blue)", fontSize:11 }}>{p.permitId}</td>
                        <td style={{ padding:"8px", fontFamily:"JetBrains Mono,monospace", fontSize:11 }}>{p.vehicle?.plate || "—"}</td>
                        <td style={{ padding:"8px" }}>{p.driver?.name || "—"}</td>
                        <td style={{ padding:"8px", color:"var(--gray-700)" }}>{p.cargo}</td>
                        <td style={{ padding:"8px", fontFamily:"JetBrains Mono,monospace", fontSize:11 }}>{p.declaredWeight?.toLocaleString() ?? "—"}</td>
                        <td style={{ padding:"8px" }}>
                          <span className={`tag ${stageTags[p.stage] || "tag-n"}`}>{stageLabels[p.stage] || p.stage}</span>
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
