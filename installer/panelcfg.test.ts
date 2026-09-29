import { describe, test, expect } from "bun:test"
import { execSync } from "node:child_process"
import { join } from "node:path"
import { parsePanelConfig, xfconfSetArgs, splitArrayBody, type PanelProp } from "./panelcfg"

const REPO = join(import.meta.dir, "..")
const TAR = join(REPO, "dots", ".config", "xfce4", "panel", "Miserable_xfce.tar.bz2")
const raw = execSync(`tar -xOjf '${TAR}' config.txt`, { encoding: "utf8" })
const { props, warnings } = parsePanelConfig(raw)
const get = (p: string): PanelProp | undefined => props.find((x) => x.prop === p)
const count = (args: string[], flag: string) => args.filter((a) => a === flag).length

const VALID_TYPES = new Set(["uint", "int", "double", "bool", "string"])

describe("shipped Miserable_xfce config.txt", () => {
  test("every line parses into a property, no warnings", () => {
    const lines = raw.split("\n").filter((l) => l.trim())
    expect(props.length).toBe(lines.length)
    expect(warnings).toEqual([])
  })

  test("all property paths are absolute and all types are valid", () => {
    for (const p of props) {
      expect(p.prop.startsWith("/")).toBe(true)
      expect(p.types.length).toBe(p.values.length)
      expect(p.values.length).toBeGreaterThan(0)
      for (const t of p.types) expect(VALID_TYPES.has(t)).toBe(true)
    }
  })

  test("/panels/panel-2/plugin-ids -> int32 array in layout order", () => {
    const p = get("/panels/panel-2/plugin-ids")
    expect(p).toBeDefined()
    expect(p!.array).toBe(true)
    expect(p!.types.every((t) => t === "int")).toBe(true)
    expect(p!.values).toEqual(["12", "2", "11", "6", "9", "1", "4", "8", "7"])
  })

  test("/panels panel list -> single-element int32 array", () => {
    const p = get("/panels")
    expect(p).toBeDefined()
    expect(p!.array).toBe(true)
    expect(p!.types).toEqual(["int"])
    expect(p!.values).toEqual(["2"])
  })

  test("scalars keep their types", () => {
    expect(get("/panels/panel-2/position")!.values[0]).toBe("p=10;x=794;y=873")
    expect(get("/panels/panel-2/position")!.types).toEqual(["string"])
    expect(get("/panels/panel-2/length")!.types).toEqual(["double"])
    expect(get("/panels/panel-2/length")!.values).toEqual(["91.6875"])
    expect(get("/plugins/plugin-9/icon-size")!.types).toEqual(["uint"])
    expect(get("/plugins/plugin-9/icon-size")!.values).toEqual(["22"])
    expect(get("/panels/dark-mode")!.types).toEqual(["bool"])
    expect(get("/panels/dark-mode")!.values).toEqual(["true"])
    expect(get("/configver")!.types).toEqual(["uint"])
    expect(get("/plugins/plugin-7/digital-time-format")!.values).toEqual(["%l:%m"])
    expect(get("/plugins/plugin-7/digital-time-font")!.values).toEqual(["Sans Bold 12"])
  })

  test("string arrays keep spaces, unicode and element count", () => {
    const p = get("/plugins/plugin-9/known-legacy-items")
    expect(p).toBeDefined()
    expect(p!.types.every((t) => t === "string")).toBe(true)
    expect(p!.values.length).toBe(3)
    expect(p!.values).toContain("blueman")
    const single = get("/plugins/plugin-12/items")
    expect(single!.array).toBe(true)
    expect(single!.values).toEqual(["17535292505.desktop"])
  })

  test("double array: background-rgba", () => {
    const p = get("/panels/panel-2/background-rgba")
    expect(p).toBeDefined()
    expect(p!.array).toBe(true)
    expect(p!.types.every((t) => t === "double")).toBe(true)
    expect(p!.values.length).toBe(4)
    expect(p!.values[3]).toBe("1.0")
  })

  test("xfconf-set argv is well-formed for every property", () => {
    for (const p of props) {
      const args = xfconfSetArgs(p)
      expect(args[0]).toBe("-c")
      expect(args[1]).toBe("xfce4-panel")
      expect(args).toContain("-n")
      expect(args).toContain(p.prop)
      expect(count(args, "-t")).toBe(p.values.length)
      expect(count(args, "-s")).toBe(p.values.length)
      expect(args.includes("-a")).toBe(p.array)
      // value order matches type order
      const tAt = args.map((a, i) => (a === "-t" ? args[i + 1] : null)).filter(Boolean)
      expect(tAt).toEqual(p.types)
    }
  })
})

describe("parser edge cases", () => {
  test("splitArrayBody honours quotes containing commas", () => {
    expect(splitArrayBody(`'a, b', 'c'`)).toEqual(["'a, b'", "'c'"])
    expect(splitArrayBody(`<12>, <2>`)).toEqual(["<12>", "<2>"])
    expect(splitArrayBody(``)).toEqual([])
  })

  test("type annotations and bare negatives", () => {
    const { props: ps, warnings: w } = parsePanelConfig(
      "/a @au [12, 2]\n/b -5\n/c @as []\n/d double -1.5\n",
    )
    // /c is an empty array: skipped with a warning (xfconf-query cannot set it)
    expect(w).toEqual(["line 3: empty array /c skipped (xfconf-query cannot set it)"])
    expect(ps.find((p) => p.prop === "/c")).toBeUndefined()
    expect(ps.find((p) => p.prop === "/a")!.values).toEqual(["12", "2"])
    expect(ps.find((p) => p.prop === "/b")!.types).toEqual(["int"])
    expect(ps.find((p) => p.prop === "/d")!.types).toEqual(["double"])
    expect(ps.find((p) => p.prop === "/d")!.values).toEqual(["-1.5"])
  })

  test("unparsed values fall back to string with a warning", () => {
    const { props: ps, warnings: w } = parsePanelConfig("/x bareword\n")
    expect(w.length).toBe(1)
    expect(ps[0].types).toEqual(["string"])
    expect(ps[0].values).toEqual(["bareword"])
  })
})
