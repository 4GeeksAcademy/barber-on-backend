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

import { getNearbyBarbers } from "../../services/api"; // <-- ajusta si hace falta

const fallbackShops = [
  { id: 1, name: "Elegance Barbershop", address: "428 West St, Astoria, NY" },
  { id: 2, name: "The Gentleman's Parlor", address: "833 38th Ave, Astoria, NY" },
];

export default function Home() {
  const navigate = useNavigate();

  const [query, setQuery] = useState("");

  // Nearby state
  const [nearby, setNearby] = useState([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState("");

  const suggestions = useMemo(
    () => [
      { title: "Trends", badge: null },
      { title: "Haircuts", badge: null },
      { title: "Shave", badge: "Deal" },
      { title: "Care", badge: "20% OFF" },
    ],
    []
  );

  // Load nearby on mount
  useEffect(() => {
    let isMounted = true;

    async function loadNearby() {
      try {
        setNearbyLoading(true);
        setNearbyError("");

        if (!navigator.geolocation) {
          setNearbyError("Geolocation is not supported.");
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
              setNearbyError(e?.message || "Failed to load nearby barbers.");
            } finally {
              if (isMounted) setNearbyLoading(false);
            }
          },
          () => {
            if (!isMounted) return;
            setNearbyError("Location permission denied.");
            setNearbyLoading(false);
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
        );
      } catch (e) {
        if (!isMounted) return;
        setNearbyError(e?.message || "Failed to load nearby barbers.");
        setNearbyLoading(false);
      }
    }

    loadNearby();
    return () => {
      isMounted = false;
    };
  }, []);

  // Choose data source: nearby if available, else fallback
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

  function handleReserve(e, id) {
    e.preventDefault();
    e.stopPropagation();
    goToBarber(id);
  }

  function handleInfo(e, id) {
    e.preventDefault();
    e.stopPropagation();
    goToBarber(id);
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
            aria-label="Search"
          />
        </div>

        <button className="bo-chipBtn" type="button">
          <CalendarDays size={18} />
          <span>Later</span>
        </button>
      </div>

      {/* Nearby status */}
      <div style={{ padding: "6px 2px", opacity: 0.9, display: "flex", gap: 8, alignItems: "center" }}>
        <MapPin size={16} />
        {nearbyLoading && <span>Loading nearby barbers...</span>}
        {!nearbyLoading && nearby.length > 0 && <span>Showing barbers near you</span>}
        {!nearbyLoading && nearby.length === 0 && !nearbyError && <span>Showing featured barbers</span>}
        {nearbyError && <span>{nearbyError}</span>}
      </div>

      {/* ========================= */}
      {/* BARBERSHOP LIST */}
      {/* ========================= */}
      <section className="bo-list">
        {filteredShops.map((s, idx) => {
          const id = s.place_id || s.id || idx;
          const address = s.address || s.vicinity || "";

          return (
            <article
              className="bo-card bo-cardRow"
              key={id}
              role="button"
              tabIndex={0}
              style={{ cursor: "pointer" }}
              onClick={() => goToBarber(id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") goToBarber(id);
              }}
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

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  className="bo-chipBtn"
                  type="button"
                  onClick={(e) => handleReserve(e, id)}
                  style={{ padding: "6px 10px", fontSize: 12 }}
                >
                  <CalendarDays size={14} />
                  <span>Book</span>
                </button>

                <button
                  className="bo-iconBtn"
                  type="button"
                  aria-label="More info"
                  onClick={(e) => handleInfo(e, id)}
                >
                  <Info size={18} />
                </button>
              </div>
            </article>
          );
        })}

        {filteredShops.length === 0 && (
          <div className="bo-empty" style={{ padding: "10px 2px", opacity: 0.85 }}>
            No results. Try a different search.
          </div>
        )}
      </section>

      {/* ========================= */}
      {/* SUGGESTIONS */}
      {/* ========================= */}
      <div className="bo-sectionHead">
        <h3>Suggestions</h3>
        <button className="bo-roundBtn" type="button" aria-label="See more">
          <ArrowRight size={18} />
        </button>
      </div>

      <section className="bo-hscroll">
        {suggestions.map((c) => (
          <div className="bo-miniCard" key={c.title} role="button" tabIndex={0}>
            <div className="bo-miniTop">
              <div className="bo-miniGlyph" />
              {c.badge && <span className="bo-badge">{c.badge}</span>}
            </div>
            <div className="bo-miniTitle">{c.title}</div>
          </div>
        ))}
      </section>

      {/* ========================= */}
      {/* INSPIRATION */}
      {/* ========================= */}
      <div className="bo-sectionHead">
        <h3>Get inspired by the best</h3>
      </div>

      <section className="bo-grid2">
        <div className="bo-imageCard" role="button" tabIndex={0}>
          <div className="bo-imagePh" />
          <div className="bo-imageLabel">Top barbers</div>
        </div>

        <div className="bo-imageCard" role="button" tabIndex={0}>
          <div className="bo-imagePh" />
          <div className="bo-imageLabel">Latest styles</div>
        </div>
      </section>

      <button className="bo-fab" type="button" aria-label="At home service">
        <span className="bo-fabIcon">
          <HomeIcon size={18} />
        </span>
        <span>At home</span>
      </button>
    </>
  );
}