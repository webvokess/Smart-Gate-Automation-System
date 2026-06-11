import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore, useThemeStore } from "./store";
import Layout from "./components/Layout";
import Login from "./pages/Auth/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import CHAPortal from "./pages/CHA/CHAPortal";
import GateModule from "./pages/Gate/GateModule";
import WeighbridgeModule from "./pages/Weighbridge/WeighbridgeModule";
import Registration from "./pages/Registration/Registration";
import Reports from "./pages/Reports/Reports";

/* Protected route wrapper */
const Protected = ({ children, roles }) => {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  const { init } = useThemeStore();
  useEffect(() => init(), []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Protected><Layout /></Protected>}>
          <Route index element={<Dashboard />} />
          <Route path="cha"          element={<Protected roles={["ADMIN","CHA"]}><CHAPortal /></Protected>} />
          <Route path="gate"         element={<Protected roles={["ADMIN","GATE_OPERATOR"]}><GateModule /></Protected>} />
          <Route path="weighbridge"  element={<Protected roles={["ADMIN","WEIGHBRIDGE_OPERATOR"]}><WeighbridgeModule /></Protected>} />
          <Route path="registration" element={<Protected roles={["ADMIN","GATE_OPERATOR"]}><Registration /></Protected>} />
          <Route path="reports"      element={<Protected roles={["ADMIN"]}><Reports /></Protected>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
