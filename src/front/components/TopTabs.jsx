import { NavLink } from "react-router-dom";
import { Store, Package, Star, CalendarDays } from "lucide-react";

export default function TopTabs() {
  const cls = ({ isActive }) => `bo-topItem ${isActive ? "bo-topActive" : ""}`;

  return (
    <div className="bo-topTabs">
      <NavLink to="/home" className={cls}>
        <Store size={16} />
        <span>Barberías</span>
      </NavLink>

      <NavLink to="/products" className={cls}>
        <Package size={16} />
        <span>Productos</span>
      </NavLink>

      <NavLink to="/tips" className={cls}>
        <Star size={16} />
        <span>Consejos</span>
      </NavLink>

      <NavLink to="/appointments" className={cls}>
        <CalendarDays size={16} />
        <span>Citas</span>
      </NavLink>
    </div>
  );
}