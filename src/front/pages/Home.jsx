import TopTabs from "../components/TopTabs";
import BottomNav from "../components/BottomNav";
import {
  Search,
  Clock,
  Info,
  ArrowRight,
  CalendarDays,
  Home as HomeIcon
} from "lucide-react";

const shops = [
  { name: "Elegance Barbershop", address: "428 West St Astoria, NY" },
  { name: "The Gentleman's Parlor", address: "833 38th Ave Astoria, NY" }
];

const suggestions = [
  { title: "Tendencias", badge: null },
  { title: "Cortes", badge: null },
  { title: "Afeitado", badge: "Oferta" },
  { title: "Cuidados", badge: "20%" }
];

export default function Home() {
  return (
    <div className="bo-app">
      <div className="bo-shell">
        <header className="bo-header">
          <TopTabs />
        </header>

        <main className="bo-main">
          <div className="bo-searchRow">
            <div className="bo-search">
              <Search size={18} />
              <input placeholder="¿Qué deseas?" />
            </div>

            <button className="bo-chipBtn">
              <CalendarDays size={18} />
              <span>Más tarde</span>
            </button>
          </div>

          <section className="bo-list">
            {shops.map((s) => (
              <article className="bo-card bo-cardRow" key={s.name}>
                <div className="bo-cardLeft">
                  <div className="bo-roundIcon">
                    <Clock size={18} />
                  </div>
                  <div>
                    <div className="bo-cardTitle">{s.name}</div>
                    <div className="bo-cardSub">{s.address}</div>
                  </div>
                </div>

                <button className="bo-iconBtn" aria-label="Más info">
                  <Info size={18} />
                </button>
              </article>
            ))}
          </section>

          <div className="bo-sectionHead">
            <h3>Sugerencias</h3>
            <button className="bo-roundBtn" aria-label="Ver más sugerencias">
              <ArrowRight size={18} />
            </button>
          </div>

          <section className="bo-hscroll">
            {suggestions.map((c) => (
              <div className="bo-miniCard" key={c.title}>
                <div className="bo-miniTop">
                  <div className="bo-miniGlyph" />
                  {c.badge ? <span className="bo-badge">{c.badge}</span> : null}
                </div>
                <div className="bo-miniTitle">{c.title}</div>
              </div>
            ))}
          </section>

          <div className="bo-sectionHead">
            <h3>Inspírate con los mejores</h3>
          </div>

          <section className="bo-grid2">
            <div className="bo-imageCard">
              <div className="bo-imagePh" />
              <div className="bo-imageLabel">Barberos expertos</div>
            </div>

            <div className="bo-imageCard">
              <div className="bo-imagePh" />
              <div className="bo-imageLabel">Últimos estilos</div>
            </div>
          </section>

          <button className="bo-fab">
            <span className="bo-fabIcon">
              <HomeIcon size={18} />
            </span>
            <span>A domicilio</span>
          </button>
        </main>

        {/* Ahora navega por rutas */}
        <BottomNav />
      </div>
    </div>
  );
}
