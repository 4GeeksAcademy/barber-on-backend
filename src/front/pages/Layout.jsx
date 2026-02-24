import { Outlet } from "react-router-dom";
import ScrollToTop from "../components/ScrollToTop";
import BottomNav from "../components/BottomNav";

export default function Layout() {
  return (
    <ScrollToTop>
      <div className="bo-app">
        <div className="bo-shell">
          <main className="bo-main">
            <Outlet />
          </main>
          <BottomNav />
        </div>
      </div>
    </ScrollToTop>
  );
}