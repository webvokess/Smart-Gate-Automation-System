import { useState } from "react";
import { reportAPI } from "../../services/api";

const stageLabels = {
  GATE_ENTRY:"Gate Entry", TARE_WEIGH:"Tare Weigh", LOADING:"Loading",
  GROSS_WEIGH:"Gross Weigh", GATE_EXIT:"Gate Exit", COMPLETED:"Completed",
};
const stageTags = {
  GATE_ENTRY:"tag-b", TARE_WEIGH:"tag-y", LOADING:"tag-o",
  GROSS_WEIGH:"tag-o", GATE_EXIT:"tag-b", COMPLETED:"tag-g",
};

export default function Reports() {
  const [date, setDate]   = useState(new Date().toISOString().slice(0, 10));
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError(""); setData(null);
    try {
      const r = await reportAPI.daily(date);
      setData(r.data.data);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load report. Please try again.");
    } finally { setLoading(false); }
  };

  const summary = data?.summary ?? {};
  const permits = data?.permits ?? [];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }} className="fade-up">
      <div style={{ fontFamily:"Outfit,sans-serif", fontWeight:700, fontSize:20, color:"var(--navy)" }}>Reports</div>

      {/* Date picker */}
      <div className="card card-p">
        <div style={{ display:"flex", gap:12, alignItems:"flex-end", flexWrap:"wrap" }}>
          <div>
            <label className="lbl">Report Date</label>
            <input className="inp" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width:190 }}/>
          </div>
          <button className="btn btn-p" onClick={load} disabled={loading}>
            {loading ? "⟳ Generating..." : "📊 Generate Report"}
          </button>
        </div>
        {error && (
          <div style={{ marginTop:12, padding:"10px 14px", borderRadius:8, background:"var(--red-xl)", color:"var(--red)", fontSize:13 }}>
            ✕ {error}
          </div>
        )}
      </div>

      {/* Summary cards */}
      {data && (
        <>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            {[
              { l:"Total Permits",   v: summary.total       ?? 0,                                c:"#1E90FF" },
              { l:"Completed",       v: summary.completed   ?? 0,                                c:"#22C55E" },
              { l:"Flagged",         v: summary.flagged     ?? 0,                                c:"#EF4444" },
              { l:"Total Net Weight",v:`${((summary.totalNetWeight ?? 0)/1000).toFixed(1)} T`,  c:"#FF6B35" },
            ].map(s => (
              <div key={s.l} className="card" style={{ padding:"16px 18px", flex:1, minWidth:140, borderTop:`3px solid ${s.c}` }}>
                <div style={{ fontSize:12, color:"var(--gray-500)", marginBottom:4 }}>{s.l}</div>
                <div style={{ fontFamily:"Outfit,sans-serif", fontSize:28, fontWeight:800, color:"var(--navy)" }}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* Permits table */}
          <div className="card card-p">
            <div style={{ fontWeight:700, color:"var(--navy)", marginBottom:14 }}>
              Permit Details — {date} ({permits.length} record{permits.length !== 1 ? "s" : ""})
            </div>

            {permits.length === 0 ? (
              <div style={{ textAlign:"center", padding:"30px 0", color:"var(--gray-400)", fontSize:14 }}>
                No permits found for {date}.
              </div>
            ) : (
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, minWidth:620 }}>
                  <thead>
                    <tr style={{ borderBottom:"2px solid var(--gray-100)", background:"var(--gray-50)" }}>
                      {["Permit ID","Vehicle","Driver","Cargo","Declared (kg)","Net (kg)","Stage"].map(h => (
                        <th key={h} style={{ textAlign:"left", padding:"8px", color:"var(--gray-500)", fontWeight:600, fontSize:11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {permits.map(p => (
                      <tr key={p._id}
                        style={{ borderBottom:"1px solid var(--gray-100)" }}
                        onMouseEnter={e => e.currentTarget.style.background="var(--gray-50)"}
                        onMouseLeave={e => e.currentTarget.style.background=""}>
                        <td style={{ padding:"9px 8px", fontFamily:"JetBrains Mono,monospace", fontWeight:700, color:"var(--blue)", fontSize:11 }}>{p.permitId}</td>
                        <td style={{ padding:"9px 8px", fontFamily:"JetBrains Mono,monospace", fontSize:11 }}>{p.vehicle?.plate || "—"}</td>
                        <td style={{ padding:"9px 8px", fontWeight:500 }}>{p.driver?.name || "—"}</td>
                        <td style={{ padding:"9px 8px", color:"var(--gray-700)" }}>{p.cargo}</td>
                        <td style={{ padding:"9px 8px", fontFamily:"JetBrains Mono,monospace", fontSize:11 }}>{p.declaredWeight?.toLocaleString() ?? "—"}</td>
                        <td style={{ padding:"9px 8px", fontFamily:"JetBrains Mono,monospace", fontSize:11, color: p.netWeight ? "var(--green)" : "var(--gray-400)", fontWeight: p.netWeight ? 700 : 400 }}>
                          {p.netWeight ? p.netWeight.toLocaleString() : "—"}
                        </td>
                        <td style={{ padding:"9px 8px" }}>
                          <span className={`tag ${stageTags[p.stage] || "tag-n"}`}>{stageLabels[p.stage] || p.stage}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
