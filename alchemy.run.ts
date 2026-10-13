import * as Alchemy from "alchemy"
import * as Cloudflare from "alchemy/Cloudflare"
import * as Effect from "effect/Effect"

export default Alchemy.Stack(
  "darjs-portfolio",
  { providers: Cloudflare.providers(), state: Cloudflare.state() },
  Effect.gen(function* () {
    const site = yield* Cloudflare.Website.Vite("Site", {
      domain: "portfoliov2.darjs.dev",
      assets: { notFoundHandling: "single-page-application" },
    })
    return { url: site.url.as<string>() }
  }),
)
