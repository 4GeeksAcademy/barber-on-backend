import { useMemo, useState } from "react";
import { ArrowRight, ChevronDown, Heart, Search, Star } from "lucide-react";

const DEFAULT_ADDRESS = "2714 14th St";

export default function MenTrends() {
  const [query, setQuery] = useState("");
  const [address] = useState(DEFAULT_ADDRESS);

  const trendCuts = useMemo(
    () => [
      { name: "Modern Fade", img: "https://images.unsplash.com/photo-1517832207067-4db24a2ae47c?auto=format&fit=crop&w=300&q=60" },
      { name: "Classic Taper", img: "https://images.unsplash.com/photo-1520975682031-aad0f2ad5d05?auto=format&fit=crop&w=300&q=60" },
      { name: "Buzz Cut", img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=300&q=60" },
      { name: "Pompadour", img: "https://images.unsplash.com/photo-1520975867597-0e2c35a2a1bb?auto=format&fit=crop&w=300&q=60" }
    ],
    []
  );

  const nearbyBarbers = useMemo(
    () => [
      { name: "King’s Barber Shop", time: "3:20 PM", rating: 4.8, reviews: 48 },
      { name: "Gentlemen’s Den", time: "4:30 PM", rating: 4.6, reviews: 90 },
      { name: "NYC Classic Cuts", time: "4:00 PM", rating: 4.7, reviews: 70 },
      { name: "Fade Masters", time: "4:15 PM", rating: 4.9, reviews: 140, promo: "$5 OFF" }
    ],
    []
  );

  const filtered = nearbyBarbers.filter((b) =>
    (b.name + " " + b.time).toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="bo-page bo-trendsPage">
      {/* top */}
      <header className="bo-trendsTop">
        <div className="bo-trendsSearch">
          <Search size={18} />
          <input
            className="bo-trendsInput"
            placeholder="Search haircuts or barbershops"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="bo-trendsAddress">
          <span className="bo-trendsDivider" />
          <button className="bo-trendsAddressBtn" type="button">
            <span className="bo-goldText">{address}</span>
            <ChevronDown size={16} />
          </button>
          <span className="bo-trendsDivider" />
        </div>
      </header>

      {/* trends */}
      <section className="bo-trendsSection">
        <div className="bo-trendsRowTitle">
          <h2 className="bo-trendsH2">Trending cuts</h2>
          <button className="bo-trendsArrowBtn" type="button" aria-label="See more">
            <ArrowRight size={18} />
          </button>
        </div>

        <div className="bo-trendsCuts">
          {trendCuts.map((c) => (
            <button key={c.name} className="bo-trendsCut" type="button">
              <div className="bo-trendsCutRing">
                <img className="bo-trendsCutImg" src={c.img} alt={c.name} />
              </div>
              <div className="bo-trendsCutName">{c.name}</div>
            </button>
          ))}
        </div>
      </section>

      {/* nearby */}
      <section className="bo-trendsSection">
        <div className="bo-trendsRowTitle">
          <h2 className="bo-trendsH2">Nearby barbershops</h2>
          <button className="bo-trendsArrowBtn" type="button" aria-label="See more">
            <ArrowRight size={18} />
          </button>
        </div>

        <div className="bo-trendsList">
          {filtered.map((b) => (
            <article key={b.name} className="bo-trendsItem">
              <div className="bo-trendsLogo">
                <span className="bo-trendsLogoMark">BO</span>
              </div>

              <div className="bo-trendsInfo">
                <div className="bo-trendsName">{b.name}</div>
                <div className="bo-trendsMeta">
                  <span className="bo-trendsTime">{b.time}</span>

                  <span className="bo-trendsStars">
                    <Star size={16} />
                    <span>{b.rating.toFixed(1)}</span>
                    <span className="bo-trendsReviews">{b.reviews}</span>
                  </span>

                  {b.promo ? <span className="bo-trendsPromo">{b.promo}</span> : null}
                </div>
              </div>

              <button className="bo-trendsFav" type="button" aria-label="Favorite">
                <Heart size={18} />
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}