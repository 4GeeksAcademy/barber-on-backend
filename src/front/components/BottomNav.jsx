import { NavLink } from "react-router-dom";
import { Home, Scissors, Bell, Inbox, User } from "lucide-react";

export default function BottomNav() {
  const cls = ({ isActive }) => `bo-navItem ${isActive ? "isActive" : ""}`;

  return (
    <nav className="bo-bottomNav">
      <NavLink to="/home" className={cls}>
        <Home size={18} />
        <span className="bo-navText">Inicio</span>
      </NavLink>

      <NavLink to="/services" className={cls}>
        <Scissors size={18} />
        <span className="bo-navText">Servicios</span>
      </NavLink>

      <NavLink to="/activity" className={cls}>
        <Bell size={18} />
        <span className="bo-navText">Actividad</span>
      </NavLink>

      <NavLink to="/inbox" className={cls}>
        <Inbox size={18} />
        <span className="bo-navText">Bandeja</span>
      </NavLink>

      <NavLink to="/account" className={cls}>
        <User size={18} />
        <span className="bo-navText">Cuenta</span>
      </NavLink>
    </nav>
  );
}