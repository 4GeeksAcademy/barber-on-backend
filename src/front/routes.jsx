import { Routes, Route, Navigate } from "react-router-dom";

import Layout from "./pages/Layout";
import Home from "./pages/Home";
import Services from "./pages/Services";
import Products from "./pages/Products";
import Activity from "./pages/Activity";
import Appointments from "./pages/Appointments";
import Inbox from "./pages/Inbox";
import Account from "./pages/Account";
import Tips from "./pages/Tips";
import BarberDetail from "./pages/BarberDetail";
import MenTrends from "./pages/MenTrends";

import Login from "./pages/Login";
import Register from "./pages/Register";

function isAuthed() {
  return !!localStorage.getItem("token");
}

function PublicOnly({ children }) {
  // If you are already logged in, don't allow /login or /register
  return isAuthed() ? <Navigate to="/home" replace /> : children;
}

function PrivateRoute({ children }) {
  // If you are NOT logged in, send to /login
  return isAuthed() ? children : <Navigate to="/login" replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* PUBLIC ROUTES (no Layout / no BottomNav) */}
      <Route
        path="/login"
        element={
          <PublicOnly>
            <Login />
          </PublicOnly>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnly>
            <Register />
          </PublicOnly>
        }
      />

      {/* PROTECTED APP ROUTES (with Layout) */}
      <Route
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route path="/home" element={<Home />} />
        <Route path="/services" element={<Services />} />
         <Route path="/services/men/trends" element={<MenTrends />} />
        <Route path="/products" element={<Products />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/account" element={<Account />} />
        <Route path="/tips" element={<Tips />} />
        <Route path="/barbers/:id" element={<BarberDetail />} />
      </Route>

      {/* FALLBACK */}
      <Route
        path="*"
        element={<Navigate to={isAuthed() ? "/home" : "/login"} replace />}
      />
    </Routes>
  );
}