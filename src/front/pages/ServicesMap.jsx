import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { useNavigate } from "react-router-dom";
import "maplibre-gl/dist/maplibre-gl.css";

export default function ServicesMap() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef([]);
  const navigate = useNavigate();

  const [userLocation, setUserLocation] = useState(null);
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState("");

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: [-73.935242, 40.73061],
      zoom: 12,
    });

    map.current.addControl(new maplibregl.NavigationControl(), "top-right");

    map.current.on("click", () => {
      setSelectedBarber(null);
      setMapError("");
    });
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setMapError("Geolocation is not available in this browser.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setUserLocation(coords);

        if (map.current) {
          map.current.flyTo({
            center: [coords.lng, coords.lat],
            zoom: 14,
          });

          new maplibregl.Marker({ color: "#c6a75e" })
            .setLngLat([coords.lng, coords.lat])
            .addTo(map.current);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setMapError("Could not get your location.");
        setLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    if (!userLocation) return;

    const fetchBarbers = async () => {
      try {
        setLoading(true);
        setMapError("");

        const url =
          `${BACKEND_URL}/api/places/nearby` +
          `?lat=${userLocation.lat}` +
          `&lng=${userLocation.lng}` +
          `&radius=2000`;

        const res = await fetch(url);

        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }

        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results || [];

        drawMarkers(list);
      } catch (err) {
        console.error("Error fetching nearby barbers:", err);
        setMapError("Could not load nearby barbers.");
      } finally {
        setLoading(false);
      }
    };

    fetchBarbers();
  }, [userLocation, BACKEND_URL]);

  function drawMarkers(barbersList) {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    barbersList.forEach((barber) => {
      const lat = barber.lat ?? barber.latitude;
      const lng = barber.lng ?? barber.longitude;

      if (lat == null || lng == null) return;
      if (!map.current) return;

      const marker = new maplibregl.Marker({ color: "#ffffff" })
        .setLngLat([Number(lng), Number(lat)])
        .addTo(map.current);

      marker.getElement().addEventListener("click", (e) => {
        e.stopPropagation();
        setSelectedBarber(barber);
        setMapError("");
      });

      markersRef.current.push(marker);
    });
  }

  const handleBook = () => {
    if (!selectedBarber) return;

    const placeKey =
      selectedBarber.id ||
      selectedBarber.place_id ||
      selectedBarber.placeId ||
      `map-place-${Date.now()}`;

    navigate(`/barbers/${encodeURIComponent(placeKey)}`, {
      state: { barber: selectedBarber },
    });
  };

  return (
    <div style={{ position: "relative", padding: 14 }}>
      <div
        ref={mapContainer}
        style={{
          width: "100%",
          height: "80vh",
          borderRadius: 20,
          overflow: "hidden",
          background: "#000",
        }}
      />

      {loading && (
        <div
          style={{
            position: "absolute",
            top: 20,
            left: 20,
            background: "#111",
            color: "#fff",
            padding: "8px 14px",
            borderRadius: 10,
            zIndex: 20,
          }}
        >
          Loading nearby barbers...
        </div>
      )}

      {mapError && (
        <div
          style={{
            position: "absolute",
            top: loading ? 70 : 20,
            left: 20,
            right: 20,
            background: "rgba(140, 20, 20, 0.95)",
            color: "#fff",
            padding: "10px 12px",
            borderRadius: 12,
            zIndex: 25,
            fontSize: 13,
            lineHeight: 1.35,
          }}
        >
          {mapError}
        </div>
      )}

      {selectedBarber && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: 20,
            right: 20,
            background: "#0d0d0d",
            color: "#fff",
            padding: 16,
            borderRadius: 18,
            border: "1px solid #c6a75e",
            zIndex: 30,
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          }}
        >
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
            {selectedBarber.name || "Barber"}
          </h3>

          <p style={{ margin: "8px 0 0 0", opacity: 0.88, fontSize: 15 }}>
            {selectedBarber.address || "Nearby barber"}
          </p>

          <button
            type="button"
            onClick={handleBook}
            style={{
              marginTop: 16,
              padding: "12px 18px",
              borderRadius: 12,
              border: "none",
              background: "#c6a75e",
              color: "#000",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            Book Appointment
          </button>
        </div>
      )}
    </div>
  );
}