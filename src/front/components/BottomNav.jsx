import { NavLink } from "react-router-dom";
import { Home, Scissors, Bell, Inbox, User } from "lucide-react";

const items = [
  { label: "Inicio", to: "/home", icon: Home },
  { label: "Servicios", to: "/services", icon: Scissors },
  { label: "Actividad", to: "/activity", icon: Bell },
  { label: "Bandeja", to: "/inbox", icon: Inbox },
  { label: "Cuenta", to: "/account", icon: User }
];

export default function BottomNav() {
  return (
    <nav className="bo-bottomNav" aria-label="Navegación inferior">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <NavLink
            key={it.label}
            to={it.to}
            className={({ isActive }) => `bo-navItem ${isActive ? "isActive" : ""}`}
          >
            <Icon size={20} />
            <span className="bo-navText">{it.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
