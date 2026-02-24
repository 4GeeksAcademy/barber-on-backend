import { useNavigate } from "react-router-dom";
import TopTabs from "../components/TopTabs";
import {
  Search,
  Clock,
  Info,
  ArrowRight,
  CalendarDays,
  Home as HomeIcon
} from "lucide-react";

const shops = [
  { id: 1, name: "Elegance Barbershop", address: "428 West St Astoria, NY" },
  { id: 2, name: "The Gentleman's Parlor", address: "833 38th Ave Astoria, NY" }
];

const suggestions = [
  { title: "Tendencias", badge: null },
  { title: "Cortes", badge: null },
  { title: "Afeitado", badge: "Oferta" },
  { title: "Cuidados", badge: "20%" }
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <>
      <header className="bo-header">
        <TopTabs />
      </header>

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

      {/* ========================= */}
      {/* LISTA DE BARBERÍAS */}
      {/* ========================= */}
      <section className="bo-list">
        {shops.map((s) => (
          <article
            className="bo-card bo-cardRow"
            key={s.id}
            style={{ cursor: "pointer" }}
          >
            <div
              className="bo-cardLeft"
              onClick={() => navigate(`/barbers/${s.id}`)}
            >
              <div className="bo-roundIcon">
                <Clock size={18} />
              </div>
              <div>
                <div className="bo-cardTitle">{s.name}</div>
                <div className="bo-cardSub">{s.address}</div>
              </div>
            </div>

            {/* BOTONES LADO DERECHO */}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                className="bo-chipBtn"
                onClick={() => navigate(`/barbers/${s.id}`)}
                style={{
                  padding: "6px 10px",
                  fontSize: 12
                }}
              >
                <CalendarDays size={14} />
                <span>Reservar</span>
              </button>

              <button
                className="bo-iconBtn"
                aria-label="Más info"
                onClick={() => navigate(`/barbers/${s.id}`)}
              >
                <Info size={18} />
              </button>
            </div>
          </article>
        ))}
      </section>

      {/* ========================= */}
      {/* SUGERENCIAS */}
      {/* ========================= */}
      <div className="bo-sectionHead">
        <h3>Sugerencias</h3>
        <button className="bo-roundBtn">
          <ArrowRight size={18} />
        </button>
      </div>

      <section className="bo-hscroll">
        {suggestions.map((c) => (
          <div className="bo-miniCard" key={c.title}>
            <div className="bo-miniTop">
              <div className="bo-miniGlyph" />
              {c.badge && <span className="bo-badge">{c.badge}</span>}
            </div>
            <div className="bo-miniTitle">{c.title}</div>
          </div>
        ))}
      </section>

      {/* ========================= */}
      {/* INSPIRACIÓN */}
      {/* ========================= */}
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

      {/* BOTÓN FLOTANTE */}
      <button className="bo-fab" type="button">
        <span className="bo-fabIcon">
          <HomeIcon size={18} />
        </span>
        <span>A domicilio</span>
      </button>
    </>
  );
}