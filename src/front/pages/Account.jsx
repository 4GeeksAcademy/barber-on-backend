import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight,
  Pencil,
  Shield,
  Inbox,
  CreditCard,
  History,
  LogOut,
  Gift,
  Users,
  Star,
  Gem,
  MapPin,
  Siren,
  Lock
} from "lucide-react";

export default function Account() {
  const navigate = useNavigate();

  const [user] = useState({
    name: "Mauricio Britez",
    rating: 4.9,
    verified: true,
    inboxCount: 2
  });

  const [locationEnabled, setLocationEnabled] = useState(true);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  const sections = useMemo(
    () => [
      {
        title: "Cuenta",
        items: [
          { icon: "user", label: "Perfil", onClick: () => navigate("/account/profile") },
          { icon: "security", label: "Seguridad", onClick: () => navigate("/account/security") },
          {
            icon: "inbox",
            label: "Bandeja de entrada",
            badge: user.inboxCount,
            onClick: () => navigate("/inbox")
          },

          // ✅ FIX: route must match routes.jsx
          { icon: "card", label: "Métodos de pago", onClick: () => navigate("/payment-methods") },

          { icon: "history", label: "Historial de reservas", onClick: () => navigate("/account/bookings") },
          { icon: "logout", label: "Cerrar sesión", danger: true, onClick: handleLogout }
        ]
      },
      {
        title: "Beneficios",
        items: [
          { icon: "gift", label: "Recompensas BarberOn", onClick: () => navigate("/account/rewards") },
          { icon: "users", label: "Invita amigos y gana crédito", onClick: () => navigate("/account/invite") },
          { icon: "star", label: "Tus puntos acumulados", onClick: () => navigate("/account/points") },
          { icon: "pro", label: "BarberOn Pro", rightText: "próximamente", onClick: () => {} }
        ]
      }
    ],
    [navigate, user.inboxCount]
  );

  return (
    <div className="bo-page">
      <div className="bo-pageHeader">
        <div className="bo-profileRow">
          <div className="bo-avatar" aria-hidden="true" />
          <div className="bo-profileMeta">
            <div className="bo-profileNameRow">
              <h1 className="bo-profileName">{user.name}</h1>
              <button className="bo-iconBtn bo-iconBtn--soft" aria-label="Editar perfil">
                <Pencil size={18} />
              </button>
            </div>

            <div className="bo-profileSub">
              <span className="bo-rating">
                <Star size={14} /> {user.rating}
              </span>
              <span className="bo-dot">•</span>
              <span className="bo-verified">Cliente verificado {user.verified ? "✓" : ""}</span>
            </div>
          </div>
        </div>
      </div>

      {sections.map((sec) => (
        <section className="bo-panel" key={sec.title}>
          <div className="bo-panelTitle">{sec.title}</div>
          <div className="bo-panelBody">
            {sec.items.map((it) => (
              <button
                key={it.label}
                className={`bo-rowBtn ${it.danger ? "bo-rowBtn--danger" : ""}`}
                onClick={it.onClick}
                type="button"
              >
                <span className="bo-rowLeft">
                  <span className="bo-rowIcon">{renderIcon(it.icon)}</span>
                  <span className="bo-rowLabel">{it.label}</span>
                  {typeof it.badge === "number" && it.badge > 0 ? (
                    <span className="bo-badgeDot">{it.badge}</span>
                  ) : null}
                </span>

                <span className="bo-rowRight">
                  {it.rightText ? <span className="bo-muted">{it.rightText}</span> : null}
                  <ChevronRight size={18} />
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}

      <section className="bo-panel">
        <div className="bo-panelTitle">Seguridad</div>

        <div className="bo-panelBody">
          <div className="bo-rowStatic">
            <span className="bo-rowLeft">
              <span className="bo-rowIcon">{renderIcon("location")}</span>
              <span className="bo-rowLabel">Control de ubicación</span>
            </span>

            <label className="bo-switch">
              <input
                type="checkbox"
                checked={locationEnabled}
                onChange={(e) => setLocationEnabled(e.target.checked)}
              />
              <span className="bo-switchTrack" />
            </label>
          </div>

          <button className="bo-rowBtn" onClick={() => navigate("/account/emergency")} type="button">
            <span className="bo-rowLeft">
              <span className="bo-rowIcon">{renderIcon("emergency")}</span>
              <span className="bo-rowLabel">Botón de emergencia</span>
            </span>
            <span className="bo-rowRight">
              <span className="bo-muted">ON</span>
              <ChevronRight size={18} />
            </span>
          </button>

          <button className="bo-rowBtn" onClick={() => navigate("/account/auth")} type="button">
            <span className="bo-rowLeft">
              <span className="bo-rowIcon">{renderIcon("auth")}</span>
              <span className="bo-rowLabel">Autenticación activa</span>
            </span>
            <span className="bo-rowRight">
              <span className="bo-muted">ON</span>
              <ChevronRight size={18} />
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}

function renderIcon(key) {
  const common = { size: 18 };
  switch (key) {
    case "user": return <span className="bo-i"><Users {...common} /></span>;
    case "security": return <span className="bo-i"><Shield {...common} /></span>;
    case "inbox": return <span className="bo-i"><Inbox {...common} /></span>;
    case "card": return <span className="bo-i"><CreditCard {...common} /></span>;
    case "history": return <span className="bo-i"><History {...common} /></span>;
    case "logout": return <span className="bo-i"><LogOut {...common} /></span>;
    case "gift": return <span className="bo-i"><Gift {...common} /></span>;
    case "users": return <span className="bo-i"><Users {...common} /></span>;
    case "star": return <span className="bo-i"><Star {...common} /></span>;
    case "pro": return <span className="bo-i"><Gem {...common} /></span>;
    case "location": return <span className="bo-i"><MapPin {...common} /></span>;
    case "emergency": return <span className="bo-i"><Siren {...common} /></span>;
    case "auth": return <span className="bo-i"><Lock {...common} /></span>;
    default: return <span className="bo-i"><ChevronRight {...common} /></span>;
  }
}