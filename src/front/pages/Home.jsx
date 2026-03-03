import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopTabs from "../components/TopTabs";
import {
  Search,
  Clock,
  Info,
  ArrowRight,
  CalendarDays,
  Home as HomeIcon,
  MapPin,
} from "lucide-react";

import { getNearbyBarbers } from "../../services/api";

const fallbackShops = [
  { id: 1, name: "Elegance Barbershop", address: "428 West St, Astoria, NY" },
  { id: 2, name: "The Gentleman's Parlor", address: "833 38th Ave, Astoria, NY" },
];

/* =========================
   IMÁGENES REALES QUE FUNCIONAN
========================= */

const HAIRCUT_IMAGES = [
  "https://img.freepik.com/fotos-premium/cliente-haciendo-corte-pelo-salon-barberia_148840-10682.jpg",
  "https://img.freepik.com/foto-gratis/hombre-corte-pelo-peluqueria_23-2148895008.jpg",
  "https://img.freepik.com/foto-gratis/barbero-cortando-cabello-hombre_23-2148765761.jpg",
  "https://img.freepik.com/foto-gratis/hombre-recibiendo-corte-pelo-barberia_23-2148895013.jpg",
  "https://www.hairfinder.com/es/imagenes/consejos-de-peluqueria.jpg"
];

const BARBERSHOP_IMAGES = [
  "https://img.freepik.com/foto-gratis/interior-salon-barberia-moderno_23-2148905043.jpg",
  "https://img.freepik.com/foto-gratis/barberia-moderna-sillas-espejos_23-2148905041.jpg"
];

function randomImage(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export default function Home() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const [nearby, setNearby] = useState([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState("");

  /* =========================
     IMÁGENES ALEATORIAS AL CARGAR
  ========================= */

  const [suggestionImages, setSuggestionImages] = useState([]);
  const [topImage, setTopImage] = useState("");
  const [latestImage, setLatestImage] = useState("");

  useEffect(() => {
    setSuggestionImages([
      randomImage(HAIRCUT_IMAGES),
      randomImage(HAIRCUT_IMAGES),
      randomImage(HAIRCUT_IMAGES),
      randomImage(HAIRCUT_IMAGES),
    ]);

    setTopImage(randomImage(BARBERSHOP_IMAGES));
    setLatestImage(randomImage(HAIRCUT_IMAGES));
  }, []);

  /* =========================
     GEOLOCATION
  ========================= */

  useEffect(() => {
    let isMounted = true;

    async function loadNearby() {
      try {
        setNearbyLoading(true);
        setNearbyError("");

        if (!navigator.geolocation) {
          setNearbyError("Geolocation is not supported.");
          setNearbyLoading(false);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              const lat = pos.coords.latitude;
              const lng = pos.coords.longitude;

              const data = await getNearbyBarbers({ lat, lng, radius: 2000 });
              if (!isMounted) return;

              setNearby(Array.isArray(data?.results) ? data.results : []);
            } catch (e) {
              if (!isMounted) return;
              setNearbyError("Failed to load nearby barbers.");
            } finally {
              if (isMounted) setNearbyLoading(false);
            }
          },
          () => {
            if (!isMounted) return;
            setNearbyError("Location permission denied.");
            setNearbyLoading(false);
          }
        );
      } catch (e) {
        if (!isMounted) return;
        setNearbyError("Failed to load nearby barbers.");
        setNearbyLoading(false);
      }
    }

    loadNearby();
    return () => {
      isMounted = false;
    };
  }, []);

  const shopsSource = nearby.length ? nearby : fallbackShops;

  const filteredShops = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return shopsSource;

    return shopsSource.filter((s) => {
      const name = (s.name || "").toLowerCase();
      const addr = (s.address || s.vicinity || "").toLowerCase();
      return name.includes(q) || addr.includes(q);
    });
  }, [query, shopsSource]);

  function goToBarber(id) {
    navigate(`/barbers/${id}`);
  }

  return (
    <>
      <header className="bo-header">
        <TopTabs />
      </header>

      <div className="bo-searchRow">
        <div className="bo-search">
          <Search size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What are you looking for?"
          />
        </div>

        <button className="bo-chipBtn" type="button">
          <CalendarDays size={18} />
          <span>Later</span>
        </button>
      </div>

      <div style={{ padding: "6px 2px", display: "flex", gap: 8, alignItems: "center" }}>
        <MapPin size={16} />
        {nearbyLoading && <span>Loading nearby barbers...</span>}
        {!nearbyLoading && nearby.length > 0 && <span>Showing barbers near you</span>}
        {!nearbyLoading && nearby.length === 0 && !nearbyError && <span>Showing featured barbers</span>}
        {nearbyError && <span>{nearbyError}</span>}
      </div>

      {/* BARBERS LIST */}
      <section className="bo-list">
        {filteredShops.map((s, idx) => {
          const id = s.place_id || s.id || idx;
          const address = s.address || s.vicinity || "";

          return (
            <article
              className="bo-card bo-cardRow"
              key={id}
              onClick={() => goToBarber(id)}
              style={{ cursor: "pointer" }}
            >
              <div className="bo-cardLeft">
                <div className="bo-roundIcon">
                  <Clock size={18} />
                </div>
                <div>
                  <div className="bo-cardTitle">{s.name}</div>
                  <div className="bo-cardSub">{address}</div>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {/* SUGGESTIONS */}
      <div className="bo-sectionHead">
        <h3>Suggestions</h3>
      </div>

      <section className="bo-hscroll">
        {["Trends", "Haircuts", "Shave", "Care"].map((title, i) => (
          <div className="bo-miniCard bo-hasImg" key={title}>
            <img
              className="bo-cardImg"
              src={suggestionImages[i]}
              alt=""
            />
            <div className="bo-imgOverlay" />
            <div className="bo-miniTitle">{title}</div>
          </div>
        ))}
      </section>

      {/* INSPIRED */}
      <div className="bo-sectionHead">
        <h3>Get inspired by the best</h3>
      </div>

      <section className="bo-grid2">
        <div className="bo-imageCard bo-hasImg">
          <img className="bo-cardImg" src={topImage} alt="" />
          <div className="bo-imgOverlay" />
          <div className="bo-imageLabel">Top barbers</div>
        </div>

        <div className="bo-imageCard bo-hasImg">
          <img className="bo-cardImg" src={latestImage} alt="" />
          <div className="bo-imgOverlay" />
          <div className="bo-imageLabel">Latest styles</div>
        </div>
      </section>

      <button className="bo-fab" type="button">
        <span className="bo-fabIcon">
          <HomeIcon size={18} />
        </span>
        <span>At home</span>
      </button>
    </>
  );
}