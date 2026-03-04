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
  const [barbers, setBarbers] = useState([]);
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [loading, setLoading] = useState(true);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  // ------------------------------
  // INIT MAP
  // ------------------------------
  useEffect(() => {

    if (map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,

      // ✅ ESTILO GRATIS Y ESTABLE
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",

      center: [-73.935242, 40.730610],
      zoom: 12
    });

    map.current.addControl(new maplibregl.NavigationControl(), "top-right");

  }, []);

  // ------------------------------
  // GET USER LOCATION
  // ------------------------------
  useEffect(() => {

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition((position) => {

      const coords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      setUserLocation(coords);

      if (map.current) {

        map.current.flyTo({
          center: [coords.lng, coords.lat],
          zoom: 14
        });

        new maplibregl.Marker({ color: "#c6a75e" })
          .setLngLat([coords.lng, coords.lat])
          .addTo(map.current);
      }

    });

  }, []);

  // ------------------------------
  // FETCH BARBERS
  // ------------------------------
  useEffect(() => {

    if (!userLocation) return;

    const fetchBarbers = async () => {

      try {

        const url =
          `${BACKEND_URL}/api/places/nearby` +
          `?lat=${userLocation.lat}` +
          `&lng=${userLocation.lng}` +
          `&radius=2000`;

        const res = await fetch(url);
        const data = await res.json();

        const list = data.results || [];

        setBarbers(list);

        drawMarkers(list);

        setLoading(false);

      } catch (err) {

        console.error(err);
        setLoading(false);
      }
    };

    fetchBarbers();

  }, [userLocation]);

  // ------------------------------
  // DRAW MARKERS
  // ------------------------------
  function drawMarkers(barbersList) {

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    barbersList.forEach(barber => {

      if (!barber.lat || !barber.lng) return;

      const marker = new maplibregl.Marker({ color: "#ffffff" })
        .setLngLat([barber.lng, barber.lat])
        .addTo(map.current);

      marker.getElement().addEventListener("click", () => {
        setSelectedBarber(barber);
      });

      markersRef.current.push(marker);

    });

  }

  // ------------------------------
  // BOOK APPOINTMENT
  // ------------------------------
  const handleBook = () => {

    if (!selectedBarber) return;

    navigate("/appointment/new", {
      state: { barber: selectedBarber }
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
          background: "#000"
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
            borderRadius: 10
          }}
        >
          Loading nearby barbers...
        </div>

      )}

      {selectedBarber && (

        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: 20,
            right: 20,
            background: "#111",
            color: "#fff",
            padding: 16,
            borderRadius: 16,
            border: "1px solid #c6a75e"
          }}
        >

          <h3 style={{ margin: 0 }}>{selectedBarber.name}</h3>

          <p style={{ margin: "4px 0" }}>
            {selectedBarber.address || "Nearby barber"}
          </p>

          <button
            onClick={handleBook}
            style={{
              marginTop: 10,
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              background: "#c6a75e",
              color: "#000",
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            Book Appointment
          </button>

        </div>

      )}

    </div>

  );

}