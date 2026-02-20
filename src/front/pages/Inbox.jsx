import { useMemo, useState } from "react";
import BottomNav from "../components/BottomNav";
import { Tag, Bell, Headphones, Ticket, Clock } from "lucide-react";

const TABS = [
  { key: "all", label: "Todos", icon: null },
  { key: "offers", label: "Ofertas", icon: Tag },
  { key: "notifications", label: "Notificaciones", icon: Bell },
  { key: "support", label: "Soporte", icon: Headphones }
];

const MESSAGES = [
  {
    key: "offer",
    tab: "offers",
    title: "¡Oferta exclusiva para ti!",
    desc: "20% off tu primer corte",
    meta: "Termina en 5 días",
    badge: "Nuevo",
    cta: "Reservar ahora"
  },
  {
    key: "near",
    tab: "all",
    title: "Increíbles precios en tu zona",
    desc: "$25–$50 cortes disponibles cerca de ti",
    meta: "NYC",
    cta: "Busca barberos"
  },
  {
    key: "help",
    tab: "support",
    title: "¿Necesitas ayuda?",
    desc: "Escríbenos si tienes alguna pregunta o necesitas cambios en tu reserva",
    meta: "",
    cta: "Enviar mensaje"
  }
];

export default function Inbox() {
  const [tab, setTab] = useState("all");
  const [code, setCode] = useState("");

  const visible = useMemo(() => {
    if (tab === "all") return MESSAGES;
    return MESSAGES.filter((m) => m.tab === tab);
  }, [tab]);

  return (
    <div className="bo-app">
      <div className="bo-shell">
        <main className="bo-main bo-inbox">
          <header className="bo-inboxHeader">
            <h1 className="bo-inboxTitle">Bandeja de entrada</h1>

            <div className="bo-inboxTabs">
              {TABS.map((t) => {
                const Icon = t.icon;
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    className={`bo-inboxTab ${active ? "isActive" : ""}`}
                    onClick={() => setTab(t.key)}
                    type="button"
                  >
                    {Icon ? <Icon size={16} /> : null}
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="bo-inboxCodeRow">
              <div className="bo-inboxCode">
                <Ticket size={18} />
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Agrega el código de la oferta"
                />
              </div>
            </div>
          </header>

          <section className="bo-inboxSection">
            <h2 className="bo-h2">Bandeja de entrada</h2>

            <div className="bo-inboxList">
              {visible.map((m) => (
                <article className="bo-msgCard" key={m.key}>
                  <div className="bo-msgImg" />

                  <div className="bo-msgBody">
                    <div className="bo-msgTop">
                      <div>
                        <div className="bo-msgTitle">{m.title}</div>
                        <div className="bo-msgDesc">{m.desc}</div>
                      </div>

                      {m.badge ? <span className="bo-badge bo-badgeGreen">{m.badge}</span> : null}
                    </div>

                    <div className="bo-msgBottom">
                      <div className="bo-msgMeta">
                        {m.meta ? (
                          <>
                            <Clock size={14} />
                            <span>{m.meta}</span>
                          </>
                        ) : (
                          <span />
                        )}
                      </div>

                      <button className="bo-ctaGold" type="button">
                        {m.cta}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
