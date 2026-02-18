import BottomNav from "../components/BottomNav";
import { ArrowRight, ClipboardList, MapPin } from "lucide-react";

const nearby = [
  { name: "Chop Shop NYC", price: 45 },
  { name: "Astoria Grooming Co.", price: 30 },
  { name: "NYC Fade Masters", price: 35, more: true }
];

const pins = [
  { price: 25, left: "62%", top: "22%" },
  { price: 50, left: "70%", top: "44%" },
  { price: 40, left: "32%", top: "58%" }
];

export default function Activity() {
  return (
    <div className="bo-app">
      <div className="bo-shell">
        <main className="bo-main bo-activity">
          <header className="bo-activityHeader">
            <h1 className="bo-activityTitle">Actividad</h1>
          </header>

          {/* Próximo */}
          <section className="bo-block">
            <h2 className="bo-h2">Próximo</h2>

            <div className="bo-nextCard">
              <div className="bo-nextText">
                <div className="bo-nextTitle">No hay actualizaciones próximas</div>
                <div className="bo-nextSub">
                  Trabaja en tu app <ArrowRight size={16} />
                </div>
              </div>

              <div className="bo-nextIconWrap" aria-hidden="true">
                <ClipboardList size={26} />
              </div>
            </div>
          </section>

          {/* Barberías cercanas */}
          <section className="bo-block">
            <h2 className="bo-h2">Barberías cercanas</h2>

            <div className="bo-mapCard">
              <div className="bo-mapMock" />

              {pins.map((p, idx) => (
                <div
                  key={idx}
                  className="bo-mapPin"
                  style={{ left: p.left, top: p.top }}
                >
                  <span className="bo-mapPrice">${p.price}</span>
                  <span className="bo-mapDot">
                    <MapPin size={16} />
                  </span>
                </div>
              ))}
            </div>

            <div className="bo-nearScroll">
              {nearby.map((b) => (
                <article className="bo-nearCard" key={b.name}>
                  <div className="bo-nearImg" />

                  <div className="bo-nearPriceTag">${b.price}</div>

                  <div className="bo-nearContent">
                    <div className="bo-nearName">{b.name}</div>
                    <div className="bo-nearFooter">
                      <div className="bo-nearPrice">${b.price}</div>
                      {b.more ? <div className="bo-nearMore">Ver más ›</div> : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
