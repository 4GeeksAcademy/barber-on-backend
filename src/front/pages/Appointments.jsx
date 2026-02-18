import BottomNav from "../components/BottomNav";

export default function Appointments() {
  return (
    <div className="bo-app">
      <div className="bo-shell">
        <main className="bo-main">
          <h2 style={{ margin: 8 }}>Citas</h2>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
