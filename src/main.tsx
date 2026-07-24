import { Route, Router } from "@solidjs/router"
import { render } from "solid-js/web"
import App from "./App"
import Compositor from "./directions/compositor/Compositor"
import Flip from "./directions/flip/Flip"
import MemoryLeak from "./directions/memory-leak/MemoryLeak"
import Wind from "./directions/wind/Wind"
import Home from "./pages/Home"
import "./styles/global.css"

render(
  () => (
    <Router root={App}>
      <Route path="/" component={Home} />
      <Route path="/compositor" component={Compositor} />
      <Route path="/memory-leak" component={MemoryLeak} />
      <Route path="/flip" component={Flip} />
      <Route path="/wind" component={Wind} />
    </Router>
  ),
  document.getElementById("root")!,
)
