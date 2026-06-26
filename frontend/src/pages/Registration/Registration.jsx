import { useState, useEffect, useRef } from "react";
import { vehicleAPI, driverAPI } from "../../services/api";

const XLSX_CDN = "https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs";

async function loadXLSX() {
  return import(/* @vite-ignore */ XLSX_CDN);
}

export default function Registration() {
  const [tab, setTab]         = useState("vehicle");
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vf, setVf]           = useState({ plate:"", type:"", owner:"", state:"" });
  const [df, setDf]           = useState({ name:"", license:"", mobile:"", aadhaar:"" });
  const [saving, setSaving]   = useState(false);
  const [vahanBusy, setVahanBusy] = useState(null);
  const [msg, setMsg]         = useState(null);
  const [xlsxRows, setXlsxRows]   = useState(null);
  const [xlsxLoading, setXlsxLoading] = useState(false);
  const [xlsxDone, setXlsxDone]   = useState(null);
  const fileRef = useRef();

  const load = async () => {
    setLoading(true);
    try {
      const [vr, dr] = await Promise.all([
        vehicleAPI.list({ limit:200 }),
        driverAPI.list({ limit:200 }),
      ]);
      setVehicles(vr.data.data || []);
      setDrivers(dr.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  /* ── Single vehicle add ── */
  const addVehicle = async (e) => {
    e.preventDefault(); setSaving(true); setMsg(null);
    try {
      await vehicleAPI.create(vf);
      setVf({ plate:"", type:"", owner:"", state:"" });
      setMsg({ ok:true, text:"Vehicle added successfully" });
      load();
    } catch (err) {
      setMsg({ ok:false, text: err.response?.data?.message || "Failed to add vehicle" });
    } finally { setSaving(false); }
  };

  /* ── Single driver enroll ── */
  const addDriver = async (e) => {
    e.preventDefault(); setSaving(true); setMsg(null);
    try {
      await driverAPI.create(df);
      setDf({ name:"", license:"", mobile:"", aadhaar:"" });
      setMsg({ ok:true, text:"Driver enrolled successfully" });
      load();
    } catch (err) {
      setMsg({ ok:false, text: err.response?.data?.message || "Failed to enroll driver" });
    } finally { setSaving(false); }
  };

  /* ── VAHAN check ── */
  const runVahan = async (id) => {
    setVahanBusy(id);
    try { await vehicleAPI.vahanCheck(id); load(); }
    catch (e) { console.error(e); }
    finally { setVahanBusy(null); }
  };

  /* ── Approve driver ── */
  const approveDriver = async (id) => {
    try { await driverAPI.approve(id); load(); }
    catch (e) { console.error(e); }
  };

  /* ── Excel file parse ── */
  const handleExcelFile = async (file) => {
    if (!file) return;
    setXlsxLoading(true); setXlsxRows(null); setXlsxDone(null);
    try {
      const XLSX = await loadXLSX();
      const buf  = await file.arrayBuffer();
      const wb   = XLSX.read(buf, { type:"array" });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:"" });

      if (!rows || rows.length < 2) {
        setXlsxRows({ ok:[], errors:["File is empty or missing header row"] });
        return;
      }

      const [headerRow, ...dataRows] = rows;
      const hdr = headerRow.map(h => String(h).toLowerCase().trim().replace(/\s+/g,"_"));

      const ok = [], errors = [];
      dataRows.forEach((row, i) => {
        if (row.every(c => !c && c !== 0)) return; // skip blank rows
        const obj = {};
        hdr.forEach((h, j) => { obj[h] = String(row[j] ?? "").trim(); });

        if (tab === "vehicle" && !obj.plate) {
          errors.push(`Row ${i+2}: "plate" column is required`); return;
        }
        if (tab === "driver" && (!obj.name || !obj.license)) {
          errors.push(`Row ${i+2}: "name" and "license" columns are required`); return;
        }
        ok.push(obj);
      });

      setXlsxRows({ ok, errors });
    } catch (e) {
      setXlsxRows({ ok:[], errors:["Could not read file — ensure it is a valid .xlsx or .csv"] });
    } finally { setXlsxLoading(false); }
  };

  /* ── Import parsed rows to backend ── */
  const importExcel = async () => {
    if (!xlsxRows?.ok?.length) return;
    setSaving(true);
    try {
      const fn  = tab === "vehicle" ? vehicleAPI.bulk : driverAPI.bulk;
      const res = await fn(xlsxRows.ok);
      setXlsxDone(res.data.data);
      setXlsxRows(null);
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  /* ── Download sample template ── */
  const downloadTemplate = async () => {
    try {
      const XLSX = await loadXLSX();
      const cols =
        tab === "vehicle"
          ? [["plate","type","owner","rc_number","state","fitness_expiry"],
             ["GJ12AB3456","10W Truck","Ramesh Transport","GJ-01-2018-001","Gujarat","2027-12-31"]]
          : [["name","license","mobile","aadhaar","dob","address"],
             ["Ramesh Kumar","GJ01-20180023456","+91-9876543210","7823","1985-06-15","123 Main St, Surat"]];
      const ws = XLSX.utils.aoa_to_sheet(cols);
      ws["!cols"] = cols[0].map(() => ({ wch: 22 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, tab === "vehicle" ? "Vehicles" : "Drivers");
      XLSX.writeFile(wb, `DPA_${tab === "vehicle" ? "Vehicle" : "Driver"}_Template.xlsx`);
    } catch (e) {
      alert("Could not generate template. Check your internet connection.");
    }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }} className="fade-up">
      <div style={{ fontFamily:"Outfit,sans-serif", fontWeight:700, fontSize:20, color:"var(--navy)" }}>Registration</div>

      {/* Tabs */}
      <div style={{ display:"flex", background:"var(--gray-100)", borderRadius:12, padding:4, width:"fit-content" }}>
        {[{id:"vehicle",l:"🚛 Vehicles"},{id:"driver",l:"👤 Drivers"}].map(t => (
          <button key={t.id}
            onClick={() => { setTab(t.id); setMsg(null); setXlsxRows(null); setXlsxDone(null); }}
            style={{ padding:"8px 18px", background:tab===t.id?"var(--white)":"transparent", color:tab===t.id?"var(--navy)":"var(--gray-500)", border:"none", borderRadius:10, fontWeight:tab===t.id?700:500, fontSize:13, boxShadow:tab===t.id?"var(--shadow)":"none", transition:"all .15s" }}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ── Excel Upload Banner ── */}
      <div className="card" style={{ padding:18, border:"2px dashed var(--blue)", background:"var(--blue-xl)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:14, flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:"var(--blue)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>📊</div>
            <div>
              <div style={{ fontWeight:700, color:"var(--navy)", fontSize:14 }}>Bulk Upload via Excel — up to 200 records</div>
              <div style={{ color:"var(--gray-500)", fontSize:12, marginTop:2 }}>
                Supports .xlsx · .xls · .csv &nbsp;|&nbsp; Required: {tab==="vehicle" ? "plate, type, owner" : "name, license, mobile"}
              </div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button className="btn btn-gh btn-sm" onClick={downloadTemplate}>⬇ Template</button>
            <button className="btn btn-p btn-sm" onClick={() => fileRef.current?.click()}>📂 Upload File</button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display:"none" }}
              onChange={e => { if (e.target.files[0]) handleExcelFile(e.target.files[0]); }}/>
          </div>
        </div>

        {/* Parse status */}
        {xlsxLoading && (
          <div style={{ marginTop:12, color:"var(--blue)", fontSize:13 }}>⟳ Reading and validating file...</div>
        )}
        {xlsxDone && (
          <div style={{ marginTop:12, background:"var(--green-xl)", border:"1px solid var(--green)", borderRadius:10, padding:"12px 16px" }}>
            <div style={{ color:"var(--green)", fontWeight:700, fontSize:13 }}>
              ✓ Imported {xlsxDone.created} · Skipped duplicates: {xlsxDone.duplicates} · Errors: {xlsxDone.errors?.length ?? 0}
            </div>
            {xlsxDone.errors?.length > 0 && (
              <div style={{ marginTop:6 }}>
                {xlsxDone.errors.slice(0,5).map((e,i) => (
                  <div key={i} style={{ color:"var(--gray-700)", fontSize:11 }}>• {e}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {xlsxRows && !xlsxLoading && (
          <div style={{ marginTop:14, borderTop:"1px solid var(--gray-200)", paddingTop:14 }}>
            <div style={{ display:"flex", gap:10, marginBottom:10, flexWrap:"wrap" }}>
              <div style={{ background:"var(--green-xl)", border:"1px solid var(--green)", borderRadius:8, padding:"8px 14px" }}>
                <div style={{ color:"var(--green)", fontWeight:700, fontSize:14 }}>{xlsxRows.ok.length}</div>
                <div style={{ color:"var(--gray-500)", fontSize:11 }}>Valid rows</div>
              </div>
              {xlsxRows.errors.length > 0 && (
                <div style={{ background:"var(--red-xl)", border:"1px solid var(--red)", borderRadius:8, padding:"8px 14px" }}>
                  <div style={{ color:"var(--red)", fontWeight:700, fontSize:14 }}>{xlsxRows.errors.length}</div>
                  <div style={{ color:"var(--gray-500)", fontSize:11 }}>Rows with errors (skipped)</div>
                  <div style={{ marginTop:4 }}>
                    {xlsxRows.errors.slice(0,3).map((e,i) => (
                      <div key={i} style={{ color:"var(--red)", fontSize:10 }}>• {e}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {xlsxRows.ok.length > 0 && (
              <button className="btn btn-p" onClick={importExcel} disabled={saving}>
                {saving ? "⟳ Importing..." : `✓ Import ${xlsxRows.ok.length} Record${xlsxRows.ok.length !== 1 ? "s" : ""}`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Two-column layout ── */}
      <div style={{ display:"grid", gridTemplateColumns:"360px 1fr", gap:16 }} className="grid-mobile-1">

        {/* Single entry form */}
        {tab === "vehicle" ? (
          <div className="card card-p">
            <div style={{ fontWeight:700, color:"var(--navy)", marginBottom:14 }}>🚛 Add Single Vehicle</div>
            {msg && (
              <div style={{ padding:"10px 12px", borderRadius:8, background:msg.ok?"var(--green-xl)":"var(--red-xl)", color:msg.ok?"var(--green)":"var(--red)", fontSize:13, marginBottom:12, fontWeight:600 }}>
                {msg.ok?"✓":"✕"} {msg.text}
              </div>
            )}
            <form onSubmit={addVehicle}>
              <div style={{ marginBottom:12 }}>
                <label className="lbl">Number Plate</label>
                <input className="inp" value={vf.plate} onChange={e=>setVf(p=>({...p,plate:e.target.value.toUpperCase().replace(/\s/g,"")}))} placeholder="GJ12AB3456" required/>
              </div>
              <div style={{ marginBottom:12 }}>
                <label className="lbl">Vehicle Type</label>
                <select className="inp" value={vf.type} onChange={e=>setVf(p=>({...p,type:e.target.value}))} required>
                  <option value="">— Select —</option>
                  {["6W Truck","10W Truck","12W Trailer","14W Trailer","20W Trailer"].map(v=><option key={v}>{v}</option>)}
                </select>
              </div>
              <div style={{ marginBottom:12 }}>
                <label className="lbl">Owner / Company</label>
                <input className="inp" value={vf.owner} onChange={e=>setVf(p=>({...p,owner:e.target.value}))} placeholder="Transport company name" required/>
              </div>
              <div style={{ marginBottom:16 }}>
                <label className="lbl">State</label>
                <input className="inp" value={vf.state} onChange={e=>setVf(p=>({...p,state:e.target.value}))} placeholder="Gujarat"/>
              </div>
              <button className="btn btn-p btn-full" type="submit" disabled={saving}>
                {saving ? "⟳ Saving..." : "+ Add Vehicle"}
              </button>
            </form>
          </div>
        ) : (
          <div className="card card-p">
            <div style={{ fontWeight:700, color:"var(--navy)", marginBottom:14 }}>👤 Enroll Driver</div>
            {msg && (
              <div style={{ padding:"10px 12px", borderRadius:8, background:msg.ok?"var(--green-xl)":"var(--red-xl)", color:msg.ok?"var(--green)":"var(--red)", fontSize:13, marginBottom:12, fontWeight:600 }}>
                {msg.ok?"✓":"✕"} {msg.text}
              </div>
            )}
            <form onSubmit={addDriver}>
              <div style={{ marginBottom:12 }}>
                <label className="lbl">Full Name</label>
                <input className="inp" value={df.name} onChange={e=>setDf(p=>({...p,name:e.target.value}))} placeholder="Ramesh Kumar" required/>
              </div>
              <div style={{ marginBottom:12 }}>
                <label className="lbl">License Number</label>
                <input className="inp" value={df.license} onChange={e=>setDf(p=>({...p,license:e.target.value}))} placeholder="GJ01-20180023456" required/>
              </div>
              <div style={{ marginBottom:12 }}>
                <label className="lbl">Mobile Number</label>
                <input className="inp" value={df.mobile} onChange={e=>setDf(p=>({...p,mobile:e.target.value}))} placeholder="+91-9876543210" required/>
              </div>
              <div style={{ marginBottom:16 }}>
                <label className="lbl">Aadhaar (last 4 digits)</label>
                <input className="inp" value={df.aadhaar} onChange={e=>setDf(p=>({...p,aadhaar:e.target.value}))} placeholder="7823" maxLength={4}/>
              </div>
              <button className="btn btn-g btn-full" type="submit" disabled={saving}>
                {saving ? "⟳ Enrolling..." : "👤 Enroll Driver"}
              </button>
            </form>
          </div>
        )}

        {/* Master list */}
        <div className="card card-p">
          <div style={{ fontWeight:700, color:"var(--navy)", marginBottom:14 }}>
            📋 {tab==="vehicle" ? `Registered Vehicles (${vehicles.length})` : `Enrolled Drivers (${drivers.length})`}
          </div>
          <div style={{ overflowX:"auto" }}>
            {tab === "vehicle" ? (
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, minWidth:500 }}>
                <thead>
                  <tr style={{ borderBottom:"2px solid var(--gray-100)", background:"var(--gray-50)" }}>
                    {["Plate","Type","Owner","State","VAHAN","Action"].map(h => (
                      <th key={h} style={{ textAlign:"left", padding:"8px", color:"var(--gray-500)", fontWeight:600, fontSize:11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array(5).fill(0).map((_,i) => (
                        <tr key={i}><td colSpan={6} style={{ padding:8 }}><div className="skeleton" style={{ height:20 }}/></td></tr>
                      ))
                    : vehicles.map(v => (
                        <tr key={v._id} style={{ borderBottom:"1px solid var(--gray-100)" }}
                          onMouseEnter={e=>e.currentTarget.style.background="var(--gray-50)"}
                          onMouseLeave={e=>e.currentTarget.style.background=""}>
                          <td style={{ padding:"9px 8px", fontFamily:"JetBrains Mono,monospace", fontWeight:700, color:"var(--blue)", fontSize:11 }}>{v.plate}</td>
                          <td style={{ padding:"9px 8px", fontSize:12 }}>{v.type}</td>
                          <td style={{ padding:"9px 8px", color:"var(--gray-700)" }}>{v.owner}</td>
                          <td style={{ padding:"9px 8px", color:"var(--gray-500)", fontSize:11 }}>{v.state || "—"}</td>
                          <td style={{ padding:"9px 8px" }}>
                            <span className={`tag ${v.vahanStatus==="verified"?"tag-g":v.vahanStatus==="failed"?"tag-r":"tag-y"}`}>
                              {v.vahanStatus}
                            </span>
                          </td>
                          <td style={{ padding:"9px 8px" }}>
                            {v.vahanStatus !== "verified" && (
                              <button className="btn btn-sm btn-ob" onClick={() => runVahan(v._id)} disabled={vahanBusy===v._id} style={{ fontSize:11, padding:"4px 10px" }}>
                                {vahanBusy===v._id ? "⟳" : "🔍 VAHAN"}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            ) : (
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, minWidth:440 }}>
                <thead>
                  <tr style={{ borderBottom:"2px solid var(--gray-100)", background:"var(--gray-50)" }}>
                    {["Name","License","Mobile","Status","Action"].map(h => (
                      <th key={h} style={{ textAlign:"left", padding:"8px", color:"var(--gray-500)", fontWeight:600, fontSize:11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array(5).fill(0).map((_,i) => (
                        <tr key={i}><td colSpan={5} style={{ padding:8 }}><div className="skeleton" style={{ height:20 }}/></td></tr>
                      ))
                    : drivers.map(d => (
                        <tr key={d._id} style={{ borderBottom:"1px solid var(--gray-100)" }}
                          onMouseEnter={e=>e.currentTarget.style.background="var(--gray-50)"}
                          onMouseLeave={e=>e.currentTarget.style.background=""}>
                          <td style={{ padding:"9px 8px", fontWeight:600, color:"var(--navy)" }}>{d.name}</td>
                          <td style={{ padding:"9px 8px", fontFamily:"JetBrains Mono,monospace", fontSize:10, color:"var(--gray-500)" }}>
                            ···{d.license.slice(-8)}
                          </td>
                          <td style={{ padding:"9px 8px", color:"var(--gray-500)", fontSize:11 }}>{d.mobile}</td>
                          <td style={{ padding:"9px 8px" }}>
                            <span className={`tag ${d.status==="approved"?"tag-g":d.status==="suspended"?"tag-r":"tag-y"}`}>
                              {d.status}
                            </span>
                          </td>
                          <td style={{ padding:"9px 8px" }}>
                            {d.status === "pending" && (
                              <button className="btn btn-sm btn-g" onClick={() => approveDriver(d._id)} style={{ fontSize:11, padding:"4px 10px" }}>
                                ✓ Approve
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
