import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/Home";
import Services from "./pages/Services";
import Activity from "./pages/Activity";
import Appointments from "./pages/Appointments";
import Account from "./pages/Account";
import Inbox from "./pages/Inbox";


export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/home" />} />
        <Route path="/inbox" element={<Inbox />} />


        <Route path="/home" element={<Home />} />
        <Route path="/services" element={<Services />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/account" element={<Account />} />
      </Routes>
    </BrowserRouter>
  );
}
