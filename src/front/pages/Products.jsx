import TopTabs from "../components/TopTabs";
import { Search, CalendarDays, ChevronRight, Info } from "lucide-react";

const quickItems = [
  { title: "Pomada para el cabello", sub: "Gel fijador" },
  { title: "Gel fijador", sub: "Gel fijador" }
];

const suggestions = [
  { title: "Cabello", badge: null },
  { title: "Peinado", badge: null },
  { title: "Barba", badge: "ENVÍO GRATIS" },
  { title: "Secadoras", badge: "20%" }
];

export default function Products() {
  return (
    <div className="bo-products">
      <header className="bo-header">
        <TopTabs />
      </header>

      <div className="bo-searchRow">
        <div className="bo-search">
          <Search size={18} />
          <input placeholder="¿Qué deseas?" />
        </div>

        <button className="bo-chipBtn" type="button">
          <CalendarDays size={18} />
          <span>Más tarde</span>
        </button>
      </div>

      <section className="bo-list">
        {quickItems.map((it) => (
          <article className="bo-productRow" key={it.title}>
            <div className="bo-productRowText">
              <div className="bo-cardTitle">{it.title}</div>
              <div className="bo-cardSub">{it.sub}</div>
            </div>

            <button className="bo-iconBtn" type="button" aria-label="Info">
              <Info size={18} />
            </button>
          </article>
        ))}
      </section>

      <div className="bo-sectionHead">
        <h3>Sugerencias</h3>
        <button className="bo-roundBtn" type="button" aria-label="Ver más">
          <ChevronRight size={18} />
        </button>
      </div>

      <section className="bo-prodSuggest">
        {suggestions.map((s) => (
          <button className="bo-prodChip" type="button" key={s.title}>
            <div className="bo-prodImg" aria-hidden="true" />
            {s.badge ? <span className="bo-prodBadge">{s.badge}</span> : null}
            <div className="bo-prodTitle">{s.title}</div>
          </button>
        ))}
      </section>

      <div className="bo-sectionHead">
        <h3>Explora las categorías</h3>
      </div>

      <section className="bo-grid2 bo-prodCats">
        <div className="bo-imageCard bo-prodCatCard">
          <div className="bo-imagePh bo-prodCatPh" />
          <div className="bo-imageLabel">Cuidado del cabello</div>
        </div>

        <div className="bo-imageCard bo-prodCatCard">
          <div className="bo-imagePh bo-prodCatPh" />
          <div className="bo-imageLabel">Estilismo</div>
        </div>
      </section>

      <div className="bo-empty">
        <div className="bo-emptyTitle">No hay productos disponibles.</div>
        <div className="bo-emptySub">
          Lo sentimos, no hay resultados para tu dirección de entrega.
        </div>
      </div>
    </div>
  );
}