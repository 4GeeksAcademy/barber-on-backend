import Home from "./pages/Home";
import "./styles/barberon.css";

export default function App() {
  return <Home />;
}
<Route 
  path="/profile" 
  element={
    <PrivateRoute>
      <Profile />
    </PrivateRoute>
  } 
/>
