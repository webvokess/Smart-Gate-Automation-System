import { useState, useEffect } from "react";
import { permitAPI, vehicleAPI, driverAPI } from "../../services/api";
import { useSocket } from "../../hooks/useSocket";

const STAGES = ["GATE_ENTRY","TARE_WEIGH","LOADING","GROSS_WEIGH","GATE_EXIT","COMPLETED"];
const stageLabels = { GATE_ENTRY:"Gate Entry", TARE_WEIGH:"Tare Weigh", LOADING:"Loading", GROSS_WEIGH:"Gross Weigh", GATE_EXIT:"Gate Exit", COMPLETED:"Completed" };
const stageTags   = { GATE_ENTRY:"tag-b", TARE_WEIGH:"tag-y", LOADING:"tag-o", GROSS_WEIGH:"tag-o", GATE_EXIT:"tag-b", COMPLETED:"tag-g" };

const StageTrack = ({ stage }) => {
  const cur = STAGES.indexOf(stage);
  return (
    <div style={{ display:"flex", alignItems:"center", margin:"10px 0 2px" }}>
      {STAGES.map((s, i) => (
        <div key={s} style={{ display:"flex", alignItems:"center", flex:1 }}>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0 }}>
            <div style={{
              width:18, height:18, borderRadius:"50%",
              background: i < cur ? "var(--green)" : i === cur ? "var(--blue)" : "var(--gray-200)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:8, fontWeight:700,
              color: i <= cur ? "#fff" : "var(--gray-400)",
            }}>
              {i < cur ? "✓" : i + 1}
            </div>
            <div style={{ fontSize:7, marginTop:2, color:i<=cur?"var(--navy)":"var(--gray-400)", whiteSpace:"nowrap" }}>
              {stageLabels[s]}
            </div>
          </div>
          {i < STAGES.length - 1 && (
            <div style={{ flex:1, height:2, background:i<cur?"var(--green)":"var(--gray-200)", margin:"0 1px", marginBottom:12 }}/>
          )}
        </div>
      ))}
    </div>
  );
};

export default function CHAPortal() {
  const [form, setForm] = useState({ vcn:"", igmLine:"", vehicleId:"", driverId:"", cargo:"", declaredWeight:"" });
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers]   = useState([]);
  const [permits, setPermits]   = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(true);

  const load = async () => {
    try {
      const [vRes, dRes, pRes] = await Promise.all([
        vehicleAPI.list({ vahanStatus:"verified", limit:200 }),
        driverAPI.list({ status:"approved", limit:200 }),
        permitAPI.list({ limit:50 }),
      ]);
      setVehicles(vRes.data.data  || []);
      setDrivers(dRes.data.data   || []);
      setPermits(pRes.data.data   || []);
    } catch (e) { console.error("CHA load error:", e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useSocket({
    permit_updated: () => load(),
    permit_created: () => load(),
  });

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setResult(null);
    try {
      const res = await permitAPI.create({ ...form, declaredWeight: Number(form.declaredWeight) });
      setResult({ ok:true, permit: res.data.data });
      setForm({ vcn:"", igmLine:"", vehicleId:"", driverId:"", cargo:"", declaredWeight:"" });
      load();
    } catch (err) {
      setResult({ ok:false, message: err.response?.data?.message || "Request failed" });
    } finally { setSubmitting(false); }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }} className="fade-up">
      <div style={{ fontFamily:"Outfit,sans-serif", fontWeight:700, fontSize:20, color:"var(--navy)" }}>CHA Portal — Delivery Requests</div>

      <div style={{ display:"grid", gridTemplateColumns:"400px 1fr", gap:16 }} className="grid-mobile-1">

        {/* Form */}
        <div className="card card-p">
          <div style={{ fontWeight:700, color:"var(--navy)", fontSize:16, marginBottom:16 }}>📋 New Delivery Request</div>
          <form onSubmit={submit}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
              <div>
                <label className="lbl">VCN Number</label>
                <input className="inp" value={form.vcn} onChange={e=>f("vcn",e.target.value)} placeholder="VCN-4521" required/>
              </div>
              <div>
                <label className="lbl">IGM Line</label>
                <input className="inp" value={form.igmLine} onChange={e=>f("igmLine",e.target.value)} placeholder="IGM-LINE-03" required/>
              </div>
            </div>

            <div style={{ marginBottom:12 }}>
              <label className="lbl">Registered Vehicle (VAHAN-verified)</label>
              <select className="inp" value={form.vehicleId} onChange={e=>f("vehicleId",e.target.value)} required>
                <option value="">— Select vehicle —</option>
                {vehicles.map(v => (
                  <option key={v._id} value={v._id}>{v.plate} — {v.type} ({v.owner})</option>
                ))}
              </select>
              {!loading && vehicles.length === 0 && (
                <div style={{ fontSize:11, color:"var(--orange)", marginTop:4 }}>⚠ No VAHAN-verified vehicles. Go to Registration to add and verify vehicles.</div>
              )}
            </div>

            <div style={{ marginBottom:12 }}>
              <label className="lbl">Driver / Helper</label>
              <select className="inp" value={form.driverId} onChange={e=>f("driverId",e.target.value)} required>
                <option value="">— Select driver —</option>
                {drivers.map(d => (
                  <option key={d._id} value={d._id}>{d.name} — {d.license}</option>
                ))}
              </select>
              {!loading && drivers.length === 0 && (
                <div style={{ fontSize:11, color:"var(--orange)", marginTop:4 }}>⚠ No approved drivers. Go to Registration → Drivers to approve.</div>
              )}
            </div>

            <div style={{ marginBottom:12 }}>
              <label className="lbl">Cargo Description</label>
              <input className="inp" value={form.cargo} onChange={e=>f("cargo",e.target.value)} placeholder="e.g. Steel Coils" required/>
            </div>

            <div style={{ marginBottom:16 }}>
              <label className="lbl">Declared Weight (kg)</label>
              <input className="inp" type="number" min="1" value={form.declaredWeight} onChange={e=>f("declaredWeight",e.target.value)} placeholder="18000" required/>
            </div>

            <div style={{ background:"var(--blue-xl)", borderRadius:10, padding:"9px 12px", marginBottom:14, fontSize:12, color:"var(--blue)" }}>
              ℹ️ Permit + QR code auto-generated on submission. Synced to Gate & Weighbridge in real-time.
            </div>

            <button className="btn btn-p btn-full" type="submit" disabled={submitting || loading || !vehicles.length || !drivers.length}>
              {submitting ? "⟳ Submitting..." : "▶ Submit Delivery Request"}
            </button>
          </form>

          {result && (
            <div style={{ marginTop:14, padding:14, borderRadius:12, background:result.ok?"var(--green-xl)":"var(--red-xl)", border:`1px solid ${result.ok?"var(--green)":"var(--red)"}22` }}>
              {result.ok ? (
                <>
                  <div style={{ color:"var(--green)", fontWeight:700, fontSize:14 }}>✓ Permit Generated!</div>
                  <div style={{ fontFamily:"JetBrains Mono,monospace", fontSize:15, fontWeight:800, color:"var(--navy)", margin:"4px 0" }}>
                    {result.permit?.permitId}
                  </div>
                  <div style={{ color:"var(--gray-500)", fontSize:12 }}>QR issued · sent to Gate & Weighbridge</div>
                </>
              ) : (
                <>
                  <div style={{ color:"var(--red)", fontWeight:700 }}>✕ Rejected</div>
                  <div style={{ color:"var(--gray-700)", fontSize:13, marginTop:4 }}>{result.message}</div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Permits list */}
        <div className="card card-p">
          <div style={{ fontWeight:700, color:"var(--navy)", fontSize:16, marginBottom:16 }}>
            📡 Active Permits ({permits.length})
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10, maxHeight:560, overflowY:"auto" }}>
            {loading
              ? Array(4).fill(0).map((_,i) => (
                  <div key={i} className="skeleton" style={{ height:80, borderRadius:10 }}/>
                ))
              : permits.length === 0
                ? <div style={{ textAlign:"center", color:"var(--gray-400)", fontSize:14, paddingTop:30 }}>No permits yet. Submit a delivery request to get started.</div>
                : permits.map(p => (
                    <div key={p._id} style={{
                      background:"var(--gray-50)",
                      border:`1.5px solid ${p.alerts?.some(a=>!a.resolved) ? "var(--red)" : "var(--gray-200)"}`,
                      borderRadius:12, padding:"12px 14px",
                    }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:6 }}>
                        <span style={{ fontFamily:"JetBrains Mono,monospace", fontWeight:700, color:"var(--blue)", fontSize:12 }}>{p.permitId}</span>
                        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                          <span className={`tag ${stageTags[p.stage] || "tag-n"}`}>{stageLabels[p.stage] || p.stage}</span>
                          <span style={{ color:"var(--gray-400)", fontSize:11 }}>
                            {new Date(p.createdAt).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
                          </span>
                        </div>
                      </div>
                      <div style={{ color:"var(--gray-500)", fontSize:12, margin:"2px 0" }}>{p.vcn} · {p.igmLine}</div>
                      <div style={{ fontWeight:600, color:"var(--navy)", fontSize:13 }}>
                        {p.vehicle?.plate} · {p.driver?.name} · {p.cargo}
                      </div>
                      <div style={{ color:"var(--gray-500)", fontSize:11 }}>
                        Declared: {p.declaredWeight?.toLocaleString()} kg
                        {p.netWeight ? ` · Net: ${p.netWeight.toLocaleString()} kg` : ""}
                      </div>
                      <StageTrack stage={p.stage}/>
                      {(p.alerts || []).filter(a => !a.resolved).map((a, i) => (
                        <div key={i} style={{ background:"var(--red-xl)", borderRadius:6, padding:"3px 8px", fontSize:11, color:"var(--red)", marginTop:4 }}>
                          ⚠ {a.message}
                        </div>
                      ))}
                    </div>
                  ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}
