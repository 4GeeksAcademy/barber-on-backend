import { Scissors, SprayCan, Star, CalendarDays } from "lucide-react";

export default function TopTabs() {
  return (
    <div className="bo-topTabs">
      <button className="bo-topItem bo-topActive">
        <Scissors size={18} />
        <span>Barberías</span>
      </button>

      <button className="bo-topItem">
        <SprayCan size={18} />
        <span>Productos</span>
      </button>

      <button className="bo-topItem">
        <Star size={18} />
        <span>Consejos</span>
      </button>

      <button className="bo-topItem">
        <CalendarDays size={18} />
        <span>Citas</span>
      </button>
    </div>
  );
}
