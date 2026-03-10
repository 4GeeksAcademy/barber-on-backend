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
import PaymentMethods from "./pages/PaymentMethods";
import ServicesMap from "./pages/ServicesMap";
import AppointmentNew from "./pages/AppointmentNew";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

function isAuthed() {
  return !!localStorage.getItem("token");
}

function PublicOnly({ children }) {
  return isAuthed() ? <Navigate to="/home" replace /> : children;
}

function PrivateRoute({ children }) {
  return isAuthed() ? children : <Navigate to="/login" replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* PUBLIC ROUTES */}
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

      <Route
        path="/forgot-password"
        element={
          <PublicOnly>
            <ForgotPassword />
          </PublicOnly>
        }
      />

      <Route
        path="/reset-password"
        element={
          <PublicOnly>
            <ResetPassword />
          </PublicOnly>
        }
      />

      {/* PROTECTED ROUTES */}
      <Route
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route path="/home" element={<Home />} />
        <Route path="/appointments/new" element={<AppointmentNew />} />
        <Route path="/services" element={<Services />} />
        <Route path="/services/men/trends" element={<MenTrends />} />
        <Route path="/products" element={<Products />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/account" element={<Account />} />
        <Route path="/tips" element={<Tips />} />
        <Route path="/barbers/:id" element={<BarberDetail />} />
        <Route path="/payment-methods" element={<PaymentMethods />} />
        <Route path="/services-map" element={<ServicesMap />} />
      </Route>

      {/* FALLBACK */}
      <Route
        path="*"
        element={<Navigate to={isAuthed() ? "/home" : "/login"} replace />}
      />
    </Routes>
  );
}