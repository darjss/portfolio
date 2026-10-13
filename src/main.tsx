import { Route, Router } from "@solidjs/router"
import { lazy } from "solid-js"
import { render } from "solid-js/web"
import Index from "./lab/Index"
import "./styles/global.css"

render(
  () => (
    <Router>
      <Route path="/" component={Index} />
      <Route path="/movie" component={lazy(() => import("./directions/projection/Projection"))} />
      <Route path="/concert" component={lazy(() => import("./directions/datamosh/Datamosh"))} />
    </Router>
  ),
  document.getElementById("root")!,
)
