import { useState, useEffect } from "react";
import { weighAPI, permitAPI } from "../../services/api";
import { useSocket } from "../../hooks/useSocket";

export default function WeighbridgeModule() {
  const [mode, setMode]             = useState("tare");
  const [queue, setQueue]           = useState([]);
  const [sel, setSel]               = useState(null);
  const [weight, setWeight]         = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [advancing, setAdvancing]   = useState(false);
  const [result, setResult]         = useState(null);
  const [loading, setLoading]       = useState(true);

  const load = async () => {
    try {
      const r = await weighAPI.queue();
      setQueue(r.data.data || []);
    } catch (e) { console.error("Weighbridge load error:", e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useSocket({ weight_updated: () => load(), permit_updated: () => load() });

  const filteredQ = queue.filter(
    (p) => p.stage === (mode === "tare" ? "TARE_WEIGH" : "GROSS_WEIGH")
  );

  const record = async () => {
    if (!sel || !weight) return;
    setSubmitting(true); setResult(null);
    try {
      const fn  = mode === "tare" ? weighAPI.tare : weighAPI.gross;
      const res = await fn(sel._id, Number(weight));
      setResult({ ok: true, data: res.data.data });
      load();
    } catch (err) {
      setResult({ ok: false, message: err.response?.data?.message || "Failed to record weight" });
    } finally { setSubmitting(false); }
  };

  const advance = async () => {
    if (!result?.ok) return;
    setAdvancing(true);
    try {
      await permitAPI.transition(result.data._id);
      setResult(null); setSel(null); setWeight(""); load();
    } catch (err) { console.error("Advance error:", err); }
    finally { setAdvancing(false); }
  };

  // Derived values — safe even when sel is null
  const displayedPermit = result?.ok ? result.data : sel;
  const tare     = displayedPermit?.tareWeight  ?? null;
  const gross    = displayedPermit?.grossWeight ?? null;
  const net      = displayedPermit?.netWeight   ?? (gross != null && tare != null ? gross - tare : null);
  const declared = sel?.declaredWeight ?? displayedPermit?.declaredWeight ?? 0;
  const bigNum   = result?.ok ? (mode === "tare" ? result.data.tareWeight : result.data.grossWeight) : null;

  let wS = null;
  if (net != null && declared) {
    const d = net - declared;
    wS = Math.abs(d) < 500 ? "ok" : d > 0 ? "overload" : "underload";
  }

  const summaryRows = [
    ["Permit",   displayedPermit?.permitId ?? "—",                 true ],
    ["Declared", declared ? `${declared.toLocaleString()} kg` : "—", false],
    ["Tare",     tare  ? `${tare.toLocaleString()} kg`  : "—",    false],
    ["Gross",    gross ? `${gross.toLocaleString()} kg` : "—",    false],
  ];

  const borderColor = result?.ok
    ? (wS === "ok" ? "var(--green)" : wS === "overload" ? "var(--red)" : "var(--yellow)")
    : "var(--gray-200)";
  const numColor = result?.ok
    ? (wS === "ok" ? "var(--green)" : wS === "overload" ? "var(--red)" : "var(--yellow)")
    : "var(--gray-300)";
  const netColor = wS === "ok" ? "var(--green)" : wS === "overload" ? "var(--red)" : "var(--yellow)";
  const netBg    = wS === "ok" ? "var(--green-xl)" : wS === "overload" ? "var(--red-xl)" : "var(--yellow-xl)";

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }} className="fade-up">
      <div style={{ fontFamily:"Outfit,sans-serif", fontWeight:700, fontSize:20, color:"var(--navy)" }}>Weighbridge Module</div>

      {/* Mode tabs */}
      <div style={{ display:"flex", background:"var(--gray-100)", borderRadius:12, padding:4, width:"fit-content" }}>
        {[{id:"tare",l:"⚖️ Tare (Empty)"},{id:"gross",l:"⚖️ Gross (Loaded)"}].map(m => (
          <button key={m.id}
            onClick={() => { setMode(m.id); setSel(null); setResult(null); setWeight(""); }}
            style={{ padding:"8px 18px", background:mode===m.id?"var(--white)":"transparent", color:mode===m.id?"var(--navy)":"var(--gray-500)", border:"none", borderRadius:10, fontWeight:mode===m.id?700:500, fontSize:13, boxShadow:mode===m.id?"var(--shadow)":"none", transition:"all .15s" }}>
            {m.l}
          </button>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"240px 1fr 260px", gap:14 }} className="grid-mobile-1">

        {/* Queue */}
        <div className="card card-p">
          <div style={{ fontWeight:700, color:"var(--navy)", marginBottom:12 }}>{mode==="tare"?"Tare Queue":"Gross Queue"}</div>
          {loading
            ? Array(3).fill(0).map((_,i) => <div key={i} className="skeleton" style={{ height:70, borderRadius:8, marginBottom:8 }}/>)
            : filteredQ.length === 0
              ? <div style={{ color:"var(--gray-400)", fontSize:13, textAlign:"center", paddingTop:20 }}>Queue empty.</div>
              : filteredQ.map(p => (
                  <div key={p._id} onClick={() => { setSel(p); setResult(null); setWeight(""); }}
                    style={{ background:sel?._id===p._id?"var(--blue-xl)":"var(--gray-50)", border:`1.5px solid ${sel?._id===p._id?"var(--blue)":"var(--gray-200)"}`, borderRadius:10, padding:"11px 12px", marginBottom:8, cursor:"pointer", transition:"all .15s" }}>
                    <div style={{ fontFamily:"JetBrains Mono,monospace", fontWeight:700, color:"var(--blue)", fontSize:11 }}>{p.permitId}</div>
                    <div style={{ fontWeight:600, color:"var(--navy)", fontSize:13 }}>{p.vehicle?.plate}</div>
                    <div style={{ color:"var(--gray-500)", fontSize:12 }}>{p.cargo}</div>
                    <div style={{ color:"var(--gray-500)", fontSize:11, marginTop:2 }}>Declared: {p.declaredWeight?.toLocaleString()} kg</div>
                    {mode==="gross" && p.tareWeight && <div style={{ color:"var(--orange)", fontSize:11, fontWeight:600 }}>Tare: {p.tareWeight.toLocaleString()} kg</div>}
                  </div>
                ))
          }
        </div>

        {/* Weight entry */}
        <div className="card card-p">
          <div style={{ fontWeight:700, color:"var(--navy)", marginBottom:14 }}>⚖️ {mode==="tare"?"Tare Weighment":"Gross Weighment"}</div>

          <div style={{ background:"var(--gray-50)", border:`3px solid ${borderColor}`, borderRadius:16, padding:"28px 20px", textAlign:"center", marginBottom:16, transition:"all .4s" }}>
            <div style={{ color:"var(--gray-500)", fontSize:11, fontWeight:700, letterSpacing:2, marginBottom:8 }}>
              {mode==="tare"?"TARE WEIGHT (kg)":"GROSS WEIGHT (kg)"}
            </div>
            <div style={{ fontFamily:"JetBrains Mono,monospace", fontSize:52, fontWeight:900, lineHeight:1, color:numColor }}>
              {bigNum != null ? String(bigNum).padStart(7,"0") : "-------"}
            </div>
            <div style={{ color:"var(--gray-500)", fontSize:12, marginTop:6 }}>kilograms</div>
          </div>

          {sel ? (
            <>
              <div style={{ marginBottom:12 }}>
                <label className="lbl">Enter {mode==="tare"?"Tare":"Gross"} Weight (kg)</label>
                <input className="inp" type="number" value={weight} onChange={e=>setWeight(e.target.value)} placeholder="e.g. 8200" style={{ fontSize:18, fontFamily:"JetBrains Mono,monospace", fontWeight:700 }}/>
              </div>
              <button className="btn btn-p btn-full" onClick={record} disabled={submitting||!weight} style={{ marginBottom:8 }}>
                {submitting?"⟳ Recording...":`✓ Record ${mode==="tare"?"Tare":"Gross"} Weight`}
              </button>
              {result?.ok && (
                <button className="btn btn-g btn-full" onClick={advance} disabled={advancing}>
                  {advancing?"⟳ Advancing...":"→ Advance to Next Stage"}
                </button>
              )}
              {result && !result.ok && (
                <div style={{ background:"var(--red-xl)", borderRadius:8, padding:"8px 12px", color:"var(--red)", fontSize:13, marginTop:8 }}>✕ {result.message}</div>
              )}
            </>
          ) : (
            <div style={{ textAlign:"center", color:"var(--gray-400)", fontSize:14, paddingTop:20 }}>Select a permit from the queue</div>
          )}
        </div>

        {/* Summary panel */}
        <div className="card card-p">
          <div style={{ fontWeight:700, color:"var(--navy)", marginBottom:14 }}>🧮 Weight Summary</div>
          {(sel || result?.ok) ? (
            <>
              {summaryRows.map(([k,v,mono]) => (
                <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid var(--gray-100)" }}>
                  <span style={{ color:"var(--gray-500)", fontSize:12 }}>{k}</span>
                  <span style={{ color:"var(--navy)", fontSize:13, fontWeight:600, fontFamily:mono?"JetBrains Mono,monospace":undefined }}>{v}</span>
                </div>
              ))}
              {net != null && (
                <div style={{ marginTop:14, background:netBg, border:`2px solid ${netColor}`, borderRadius:12, padding:16, textAlign:"center" }}>
                  <div style={{ color:"var(--gray-500)", fontSize:10, fontWeight:700, letterSpacing:1.5, marginBottom:4 }}>NET WEIGHT</div>
                  <div style={{ fontFamily:"JetBrains Mono,monospace", fontSize:28, fontWeight:900, color:netColor }}>{net.toLocaleString()} kg</div>
                  <div style={{ color:netColor, fontWeight:700, fontSize:12, marginTop:8 }}>
                    {wS==="ok"?"✓ Weight Compliant":wS==="overload"?"⚠ Overload Detected":"⚠ Underload"}
                  </div>
                  {declared > 0 && (
                    <div style={{ color:"var(--gray-500)", fontSize:11, marginTop:2 }}>
                      Δ {net-declared>0?"+":""}{(net-declared).toLocaleString()} kg vs declared
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign:"center", color:"var(--gray-300)", paddingTop:40, fontSize:32 }}>
              ⚖️<div style={{ fontSize:12, color:"var(--gray-500)", marginTop:8 }}>Select a permit</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
