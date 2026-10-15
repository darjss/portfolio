def page [name: string] {
  let gl = http get $"https://canvasui.dev/r/($name)-vanilla.json"
  let gpu = try { http get $"https://canvasui.dev/r/($name)-vanilla-webgpu.json" } catch { null }
  let deps = $gl.dependencies? | default []
  let registry = if $gpu == null {
    $"https://canvasui.dev/r/($name)-vanilla.json"
  } else {
    $"https://canvasui.dev/r/($name)-vanilla.json \(WebGL\), https://canvasui.dev/r/($name)-vanilla-webgpu.json \(WebGPU\)"
  }
  let sources = [[flavor item]; [vanilla $gl] [vanilla-webgpu $gpu]]
    | where item != null
    | each {|s| $s.item.files | each {|f| $"## Source \(($s.flavor)\): `($f.path)`\n\n```ts\n($f.content)\n```\n" } }
    | flatten
    | str join "\n"
  [
    $"# ($gl.title)\n"
    $"- Docs: https://canvasui.dev/docs/components/($name)"
    $"- Registry: ($registry)"
    $"- Install: `npx shadcn@latest add @canvas-ui/($name)-vanilla`\n"
    $"## What it does\n\n($gl.description)\n"
    $"## Dependencies\n\n(if ($deps | is-empty) { 'None.' } else { $deps | each {|d| $'- ($d)' } | str join "\n" })\n"
    $sources
  ] | str join "\n" | $in + "\n"
}

def main [] {
  let dir = $env.FILE_PWD | path join components
  http get https://canvasui.dev/r/registry.json
  | get items.name
  | where $it ends-with "-vanilla"
  | each {|n| $n | str replace --regex '-vanilla$' "" }
  | par-each {|name| page $name | save --force ($dir | path join $"($name).md") }
  | ignore
}
