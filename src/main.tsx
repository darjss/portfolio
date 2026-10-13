import { Route, Router } from "@solidjs/router"
import { lazy } from "solid-js"
import { render } from "solid-js/web"
import Index from "./lab/Index"
import "./styles/global.css"

render(
  () => (
    <Router>
      <Route path="/" component={Index} />
      <Route path="/spectrogram" component={lazy(() => import("./directions/spectrogram/Spectrogram"))} />
      <Route path="/datamosh" component={lazy(() => import("./directions/datamosh/Datamosh"))} />
      <Route path="/projection" component={lazy(() => import("./directions/projection/Projection"))} />
      <Route path="/tiling" component={lazy(() => import("./directions/tiling/Tiling"))} />
      <Route path="/galley" component={lazy(() => import("./directions/galley/Galley"))} />
    </Router>
  ),
  document.getElementById("root")!,
)
