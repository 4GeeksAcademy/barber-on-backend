import { useMemo, useState } from "react";
import TopTabs from "../components/TopTabs";
import { Scissors, Home as HomeIcon, Gem } from "lucide-react";

export default function Tips() {
  const slides = useMemo(
    () => [
      {
        title: "En el Salón",
        subtitle: "Reserva tu cita y ahorra.",
        icon: "salon",
        bullets: [
          "Agenda tu turno desde la app.",
          "Obtén hasta 15% de descuento en servicios en salón.",
          "Atención profesional en ambiente premium.",
          "Sin cargos adicionales."
        ],
        footer: "Mejor precio, experiencia completa."
      },
      {
        title: "A Domicilio",
        subtitle: "Comodidad total.",
        icon: "home",
        bullets: [
          "Servicio profesional en tu casa.",
          "Ideal si no quieres desplazarte.",
          "Disponible para Men, Women y Pets.",
          "Cargo adicional por movilidad."
        ],
        footer: "Tu estilo, sin salir de casa."
      },
      {
        title: "Membresía",
        subtitle: "Beneficios exclusivos.",
        icon: "pro",
        bullets: [
          "Acceso a descuentos premium.",
          "Ofertas especiales.",
          "Reservas prioritarias.",
          "Servicios ilimitados."
        ],
        footer: "Invierte en tu estilo, ahorra en grande."
      }
    ],
    []
  );

  const [active, setActive] = useState(1);

  function next() {
    setActive((v) => (v + 1) % slides.length);
  }
  function prev() {
    setActive((v) => (v - 1 + slides.length) % slides.length);
  }

  return (
    <div className="bo-page bo-tips">
      {/* TopTabs va arriba como en Home */}
      <div className="bo-tipsTop">
        <TopTabs active="tips" />
      </div>

      {/* Hero */}
      <div className="bo-tipsHero" role="img" aria-label="Barbería premium">
        <div className="bo-tipsHeroOverlay" />
      </div>

      {/* Cards: horizontal scroll (tipo carrusel) para que no se te agrande en desktop */}
      <div className="bo-tipsCards" role="list">
        {slides.map((c, idx) => (
          <article
            key={c.title}
            className={`bo-tipsCard ${idx === active ? "isActive" : ""}`}
            onClick={() => setActive(idx)}
            role="listitem"
            tabIndex={0}
          >
            <div className="bo-tipsCardHead">
              <div className="bo-tipsIcon">{renderTipIcon(c.icon)}</div>
              <div className="bo-tipsHeadText">
                <div className="bo-tipsTitle">{c.title}</div>
                <div className="bo-tipsSub">{c.subtitle}</div>
              </div>
            </div>

            <ul className="bo-tipsList">
              {c.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>

            <div className="bo-tipsFooter">{c.footer}</div>
          </article>
        ))}
      </div>

      <div className="bo-dotsRow">
        <button className="bo-dotBtn" onClick={prev} aria-label="Anterior" />
        <div className="bo-dots">
          {slides.map((_, i) => (
            <button
              key={i}
              className={`bo-dot ${i === active ? "isActive" : ""}`}
              onClick={() => setActive(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
        <button className="bo-dotBtn" onClick={next} aria-label="Siguiente" />
      </div>

      <div className="bo-tipsHint">Toca una tarjeta para cambiar</div>
    </div>
  );
}

function renderTipIcon(key) {
  const common = { size: 22 };
  switch (key) {
    case "salon":
      return <Scissors {...common} />;
    case "home":
      return <HomeIcon {...common} />;
    case "pro":
      return <Gem {...common} />;
    default:
      return <Scissors {...common} />;
  }
}