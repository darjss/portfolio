import { Route, Router } from "@solidjs/router"
import { render } from "solid-js/web"
import App from "./App"
import Compositor from "./directions/compositor/Compositor"
import ColdStorage from "./directions/cold-storage/ColdStorage"
import Flip from "./directions/flip/Flip"
import MemoryLeak from "./directions/memory-leak/MemoryLeak"
import OffRegister from "./directions/off-register/OffRegister"
import Overpressure from "./directions/overpressure/Overpressure"
import Patchbay from "./directions/patchbay/Patchbay"
import RackFocus from "./directions/rack-focus/RackFocus"
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
      <Route path="/overpressure" component={Overpressure} />
      <Route path="/cold-storage" component={ColdStorage} />
      <Route path="/rack-focus" component={RackFocus} />
      <Route path="/patchbay" component={Patchbay} />
      <Route path="/off-register" component={OffRegister} />
    </Router>
  ),
  document.getElementById("root")!,
)
