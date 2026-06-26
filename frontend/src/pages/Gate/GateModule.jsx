import { useState, useEffect } from "react";
import { gateAPI } from "../../services/api";
import { useSocket } from "../../hooks/useSocket";

export default function GateModule() {
  const [mode, setMode]         = useState("entry");
  const [queue, setQueue]       = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [processing, setProcessing] = useState(false);
  const [result, setResult]     = useState(null);

  const load = async () => {
    try {
      const res = await gateAPI.queue(mode);
      setQueue(res.data.data || []);
    } catch (e) { console.error("Gate queue error:", e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    setLoading(true); setSelected(null); setResult(null); load();
  }, [mode]);

  useSocket({
    gate_entry:     () => load(),
    gate_exit:      () => load(),
    permit_updated: () => load(),
  });

  const authorize = async () => {
    if (!selected) return;
    setProcessing(true);
    try {
      const fn = mode === "entry" ? gateAPI.entry : gateAPI.exit;
      await fn(selected._id);
      setResult({ ok:true, id: selected.permitId });
      setSelected(null);
      load();
    } catch (err) {
      setResult({ ok:false, message: err.response?.data?.message || "Authorization failed" });
    } finally { setProcessing(false); }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }} className="fade-up">
      <div style={{ fontFamily:"Outfit,sans-serif", fontWeight:700, fontSize:20, color:"var(--navy)" }}>Gate Module</div>

      {/* Mode tabs */}
      <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
        <div style={{ display:"flex", background:"var(--gray-100)", borderRadius:12, padding:4 }}>
          {[{id:"entry",l:"🚛 Gate Entry"},{id:"exit",l:"🔄 Gate Exit"}].map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              style={{ padding:"8px 18px", background:mode===m.id?"var(--white)":"transparent", color:mode===m.id?"var(--navy)":"var(--gray-500)", border:"none", borderRadius:10, fontWeight:mode===m.id?700:500, fontSize:13, boxShadow:mode===m.id?"var(--shadow)":"none", transition:"all .15s" }}>
              {m.l}
            </button>
          ))}
        </div>
        <div style={{ background:"var(--blue-xl)", borderRadius:8, padding:"6px 14px", color:"var(--blue)", fontSize:13, fontWeight:600 }}>
          {loading ? "..." : `${queue.length} permit${queue.length !== 1 ? "s" : ""}`} in queue
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }} className="grid-mobile-1">

        {/* Queue */}
        <div className="card card-p">
          <div style={{ fontWeight:700, color:"var(--navy)", marginBottom:14 }}>
            📋 {mode === "entry" ? "Awaiting Gate Entry" : "Awaiting Gate Exit"}
          </div>

          {loading
            ? Array(3).fill(0).map((_,i) => <div key={i} className="skeleton" style={{ height:80, borderRadius:10, marginBottom:8 }}/>)
            : queue.length === 0
              ? (
                  <div style={{ textAlign:"center", padding:"30px 0", color:"var(--gray-400)", fontSize:14 }}>
                    No vehicles in queue.
                  </div>
                )
              : queue.map((p, i) => (
                  <div key={p._id} onClick={() => { setSelected(p); setResult(null); }}
                    style={{ background:selected?._id===p._id?"var(--blue-xl)":"var(--gray-50)", border:`1.5px solid ${selected?._id===p._id?"var(--blue)":"var(--gray-200)"}`, borderRadius:12, padding:"12px 14px", marginBottom:8, cursor:"pointer", transition:"all .15s" }}>
                    {i === 0 && (
                      <div style={{ background:"var(--blue)", color:"#fff", borderRadius:5, padding:"2px 7px", fontSize:10, fontWeight:700, display:"inline-block", marginBottom:6 }}>
                        NEXT IN QUEUE
                      </div>
                    )}
                    <div style={{ fontFamily:"JetBrains Mono,monospace", fontWeight:700, color:"var(--blue)", fontSize:12 }}>{p.permitId}</div>
                    <div style={{ fontWeight:600, color:"var(--navy)", fontSize:14, marginTop:2 }}>{p.vehicle?.plate}</div>
                    <div style={{ color:"var(--gray-500)", fontSize:12 }}>{p.driver?.name} · {p.cargo}</div>
                    <div style={{ color:"var(--gray-400)", fontSize:11, marginTop:3 }}>
                      Declared: {p.declaredWeight?.toLocaleString()} kg · {new Date(p.createdAt).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
                    </div>
                  </div>
                ))
          }
        </div>

        {/* Authorization panel */}
        <div className="card card-p">
          <div style={{ fontWeight:700, color:"var(--navy)", marginBottom:14 }}>✅ Authorization Panel</div>

          {!selected ? (
            <div style={{ textAlign:"center", padding:"50px 20px", color:"var(--gray-300)" }}>
              <div style={{ fontSize:32 }}>🔍</div>
              <div style={{ fontSize:13, color:"var(--gray-500)", marginTop:8 }}>Select a permit from the queue</div>
            </div>
          ) : (
            <>
              {/* Details */}
              <div style={{ background:"var(--gray-50)", borderRadius:10, padding:14, marginBottom:14 }}>
                {[
                  ["Permit ID",       selected.permitId,                 true ],
                  ["Vehicle Plate",   selected.vehicle?.plate,           true ],
                  ["Driver",          selected.driver?.name,             false],
                  ["Cargo",           selected.cargo,                    false],
                  ["Declared Weight", `${selected.declaredWeight?.toLocaleString()} kg`, false],
                  ["VCN",             selected.vcn,                      false],
                ].map(([k, v, mono]) => (
                  <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid var(--gray-200)" }}>
                    <span style={{ color:"var(--gray-500)", fontSize:12 }}>{k}</span>
                    <span style={{ color:"var(--navy)", fontSize:13, fontWeight:600, fontFamily:mono?"JetBrains Mono,monospace":undefined }}>{v || "—"}</span>
                  </div>
                ))}
              </div>

              {/* Verification badges */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
                <div style={{ background:"var(--green-xl)", border:"1px solid var(--green)33", borderRadius:10, padding:"10px 12px", textAlign:"center" }}>
                  <div style={{ color:"var(--green)", fontWeight:700, fontSize:12 }}>✓ ANPR Verified</div>
                  <div style={{ color:"var(--gray-500)", fontSize:11 }}>{selected.vehicle?.plate}</div>
                </div>
                <div style={{ background:"var(--green-xl)", border:"1px solid var(--green)33", borderRadius:10, padding:"10px 12px", textAlign:"center" }}>
                  <div style={{ color:"var(--green)", fontWeight:700, fontSize:12 }}>✓ Driver Verified</div>
                  <div style={{ color:"var(--gray-500)", fontSize:11 }}>{selected.driver?.name?.split(" ")[0]}</div>
                </div>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <button className="btn btn-g btn-full" onClick={authorize} disabled={processing}>
                  {processing ? "⟳ Processing..." : `✓ Authorize ${mode === "entry" ? "Entry" : "Exit"} — Open Barrier`}
                </button>
                <button className="btn btn-gh btn-full" onClick={() => setSelected(null)} disabled={processing}>
                  ✕ Skip / Cancel
                </button>
              </div>

              {result && (
                <div style={{ marginTop:12, padding:"12px 14px", borderRadius:10, background:result.ok?"var(--green-xl)":"var(--red-xl)", textAlign:"center" }}>
                  <div style={{ color:result.ok?"var(--green)":"var(--red)", fontWeight:700 }}>
                    {result.ok
                      ? `✓ ${mode === "entry" ? "Entry" : "Exit"} Authorized — ${result.id}`
                      : `✕ ${result.message}`
                    }
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
