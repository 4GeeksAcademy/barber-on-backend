import { useNavigate } from "react-router-dom";
import { Sparkles, PawPrint, Scissors, ArrowRight, Map } from "lucide-react";

export default function Services() {
  const navigate = useNavigate();

  return (
    <>
      <div className="bo-sectionHead">
        <h3>Styling services to your door</h3>
      </div>

      <div className="bo-heroImage" />

      {/* 🔥 BOTÓN MAPA NUEVO */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
        <button
          type="button"
          className="bo-mapBtn"
          onClick={() => navigate("/services-map")}
        >
          <Map size={18} />
          Explore Map
        </button>
      </div>

      <section className="bo-servicesGrid">
        
        {/* WOMEN */}
        <div className="bo-serviceCard bo-women">
          <span className="bo-badgeTop">Nuevo</span>
          <div className="bo-serviceIcon">
            <Sparkles size={22} />
          </div>
          <div className="bo-serviceLabel">Women</div>
        </div>

        {/* PETS */}
        <div className="bo-serviceCard bo-pets">
          <div className="bo-serviceIcon">
            <PawPrint size={22} />
          </div>
          <div className="bo-serviceLabel">Pets</div>
        </div>

        {/* MEN */}
        <div className="bo-serviceCard bo-men">
          <div className="bo-serviceIcon">
            <Scissors size={22} />
          </div>

          <div className="bo-serviceLabel">Men</div>

          <button
            type="button"
            className="bo-menTrendsBtn"
            onClick={() => navigate("/services/men/trends")}
          >
            Trends
            <ArrowRight size={16} />
          </button>
        </div>

      </section>
    </>
  );
}