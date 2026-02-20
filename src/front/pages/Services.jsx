import BottomNav from "../components/BottomNav";
import { Sparkles, PawPrint, Scissors } from "lucide-react";

const categories = [
  { key: "women", title: "Women", tone: "rose", icon: Sparkles },
  { key: "pets", title: "Pets", tone: "green", icon: PawPrint },
  { key: "men", title: "Men", tone: "amber", icon: Scissors }
];

export default function Services() {
  return (
    <div className="bo-app">
      <div className="bo-shell">
        <main className="bo-main bo-services">
          <header className="bo-servicesHeader">
            <div className="bo-servicesBrandRow">
              <span className="bo-brandDot" aria-hidden="true" />
              <span className="bo-brandText">BarberOn</span>
            </div>

            <h1 className="bo-servicesTitle">BarberOn</h1>
            <p className="bo-servicesSub">Styling services to your door</p>
          </header>

          {/* Banner grande */}
          <section className="bo-heroCard">
            <div className="bo-heroImage" />
          </section>

          {/* Grid 3 cards */}
          <section className="bo-catGrid">
            {/* chip Nuevo sobre la primera */}
            <div className="bo-catWrap">
              <span className="bo-chipNew">Nuevo</span>
              <CategoryCard {...categories[0]} />
            </div>

            <CategoryCard {...categories[1]} />
            <CategoryCard {...categories[2]} />
          </section>
        </main>

      </div>
    </div>
  );
}

function CategoryCard({ title, tone, icon: Icon }) {
  return (
    <button className={`bo-catCard bo-tone-${tone}`} type="button">
      <div className="bo-catImg" />
      <div className="bo-catOverlay">
        <div className="bo-catIcon">
          <Icon size={22} />
        </div>
        <div className="bo-catTitle">{title}</div>
      </div>
    </button>
  );
}
