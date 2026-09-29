/**
 * Legacy xfce4-panel-profiles `config.txt` parser -> xfconf-query argv.
 *
 * config.txt lines look like:
 *   /panels/panel-2/size uint32 45
 *   /panels/panel-2/length 91.6875
 *   /panels/panel-2/position 'p=10;x=794;y=873'
 *   /panels/panel-2/plugin-ids [<12>, <2>, <11>]
 *   /panels/dark-mode true
 *
 * `xfconf-query --import` expects a different format (`channel prop n type
 * value ...`) and does not exist in older xfconf, so we parse the file here
 * and set every property explicitly - the same effect as xfce4-panel-profiles'
 * ResetProperty + SetProperty pass, on any xfconf version.
 *
 * Values are passed as argv entries (never through a shell), so no escaping
 * is needed; spaces and unicode in strings are safe as-is.
 */

export type PanelProp = {
  prop: string
  /** xfconf type word per value ("uint", "string", "double", "bool", "int") */
  types: string[]
  /** raw values, same length as types */
  values: string[]
  array: boolean
}

export type ParseResult = { props: PanelProp[]; warnings: string[] }

const PREFIX_TYPES: Record<string, string> = {
  uint32: "uint",
  int32: "int",
  uint: "uint",
  int: "int",
  double: "double",
  bool: "bool",
  boolean: "bool",
  string: "string",
}

/** classify one scalar piece of GVariant text; null when unrecognised.
 * `bareInt` selects the type for unadorned integers: panel-level scalars are
 * uint32 in xfconf, but panel/plugin ID arrays are int32 (xfce4-panel writes
 * them with g_value_init(G_TYPE_INT) and reads with strict g_value_get_int). */
function typeOfScalar(raw: string, bareInt: "uint" | "int" = "uint"): { t: string; v: string } | null {
  const v = raw.trim()
  if (v === "true" || v === "false") return { t: "bool", v }
  if (v.length >= 2 && v.startsWith("'") && v.endsWith("'"))
    return { t: "string", v: v.slice(1, -1).replace(/\\(['\\])/g, "$1") }
  if (v.length >= 2 && v.startsWith('"') && v.endsWith('"'))
    return { t: "string", v: v.slice(1, -1) }
  const prefixed = v.match(/^([A-Za-z0-9_]+)\s+(.+)$/)
  if (prefixed && PREFIX_TYPES[prefixed[1]]) return { t: PREFIX_TYPES[prefixed[1]], v: prefixed[2].trim() }
  if (/^\d+$/.test(v)) return { t: bareInt, v }
  if (/^-\d+$/.test(v)) return { t: "int", v }
  if (/^-?(\d+\.\d*|\.\d+)([eE][-+]?\d+)?$/.test(v) || /^-?\d+[eE][-+]?\d+$/.test(v))
    return { t: "double", v }
  return null
}

/** split `[a, 'b, c', d]` body on top-level commas, honouring single quotes */
export function splitArrayBody(body: string): string[] {
  const out: string[] = []
  let depth = 0
  let inQuote = false
  let cur = ""
  for (const ch of body) {
    if (ch === "'") inQuote = !inQuote
    if (!inQuote) {
      if (ch === "[") depth++
      else if (ch === "]") depth--
      else if (ch === "," && depth === 0) {
        out.push(cur.trim())
        cur = ""
        continue
      }
    }
    cur += ch
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}

export function parsePanelConfig(text: string): ParseResult {
  const props: PanelProp[] = []
  const warnings: string[] = []

  text.split("\n").forEach((lineRaw, i) => {
    const line = lineRaw.trim()
    if (!line) return
    const at = line.indexOf(" ")
    if (at < 0) {
      warnings.push(`line ${i + 1}: no value for '${line}'`)
      return
    }
    const prop = line.slice(0, at)
    if (!prop.startsWith("/")) {
      warnings.push(`line ${i + 1}: not a property path ('${prop}')`)
      return
    }
    let rest = line.slice(at + 1).trim()
    // optional type annotation (`@au [12, 2]`) - drop it, infer per element
    const ann = rest.match(/^@[A-Za-z0-9_{}]+\s+(.*)$/)
    if (ann) rest = ann[1]

    if (rest.startsWith("[")) {
      if (!rest.endsWith("]")) {
        warnings.push(`line ${i + 1}: unterminated array for ${prop}`)
        return
      }
      const elems = splitArrayBody(rest.slice(1, -1))
      if (!elems.length) {
        warnings.push(`line ${i + 1}: empty array ${prop} skipped (xfconf-query cannot set it)`)
        return
      }
      const types: string[] = []
      const values: string[] = []
      for (let e of elems) {
        if (e.startsWith("<") && e.endsWith(">")) e = e.slice(1, -1).trim()
        // unadorned integers inside arrays are int32: xfce4-panel stores /panels
        // and /panels/panel-N/plugin-ids as G_TYPE_INT arrays and reads them
        // with strict g_value_get_int (panel-application.c)
        const t = typeOfScalar(e, "int")
        if (t) {
          types.push(t.t)
          values.push(t.v)
        } else {
          warnings.push(`line ${i + 1}: unparsed element '${e}' in ${prop} - stored as string`)
          types.push("string")
          values.push(e)
        }
      }
      props.push({ prop, types, values, array: true })
      return
    }

    const t = typeOfScalar(rest)
    if (t) {
      props.push({ prop, types: [t.t], values: [t.v], array: false })
    } else {
      warnings.push(`line ${i + 1}: unparsed value '${rest}' for ${prop} - stored as string`)
      props.push({ prop, types: ["string"], values: [rest], array: false })
    }
  })

  return { props, warnings }
}

/** argv (after `xfconf-query`) that creates/replaces one property */
export function xfconfSetArgs(p: PanelProp): string[] {
  const args = ["-c", "xfce4-panel", "-n", "-p", p.prop]
  if (p.array) args.push("-a")
  for (const t of p.types) args.push("-t", t)
  for (const v of p.values) args.push("-s", v)
  return args
}
