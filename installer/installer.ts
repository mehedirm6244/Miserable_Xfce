/*==============================================================================
 * Miserable_Xfce installer - single file, runs on bun + @opentui/core
 *
 * Flow: logo + confirm -> step list + live log pane -> summary
 *
 * Steps:
 *   1 detect system          6 deploy dotfiles (copy + backup + manifest)
 *   2 core packages          7 apply xfce settings (appearance / wm theme)
 *   3 AUR helper (arch)      8 import panel layout (xfconf)
 *   4 package extras         9 enable autostart (picom)
 *   5 install eww           10 summary
 *   6b build picom fork
 *
 * Flags: --settings-only   run steps 6b-9 only (dots + xfce settings)
 *        --demo            fake steps, no system changes (UI preview)
 *        --no-color        no TUI, plain log lines (debugging / pipes)
 *============================================================================*/

import {
  createCliRenderer,
  BoxRenderable,
  TextRenderable,
  SelectRenderable,
  SelectRenderableEvents,
  parseColor,
  type CliRenderer,
  type KeyEvent,
} from "@opentui/core"
import { readdir, stat, mkdir, copyFile, rename, readFile, writeFile, chmod, lstat, readlink, symlink } from "node:fs/promises"
import { existsSync } from "node:fs"
import { join, basename, dirname } from "node:path"
import { parsePanelConfig, xfconfSetArgs } from "./panelcfg"

/*============================= brand ======================================*/

const LOGO = [
  ".  . .-. .-. .-. .-. .-. .-. .   .-. ",
  "|\\/|  |  `-. |-  |(  |-| |(  |   |-  ",
  "'  ` `-' `-' `-' ' ' ` ' `-' `-' `-' ",
  "",
  ".  . .-. .-. .-.                     ",
  " )(  |-  |   |-                      ",
  "'  ` '   `-' `-'                     ",
  "",
].join("\n")

const C = {
  bg: "#1a1b26",
  panel: "#20222e",
  panelAlt: "#252733",
  fg: "#c0caf5",
  dim: "#565f89",
  accent: "#7aa2f7",
  green: "#9ece6a",
  red: "#f7768e",
  yellow: "#e0af68",
}

/*============================= log buffer =================================*/

const LOG_CAP = 800
const logBuf: string[] = []
let logsText: TextRenderable | null = null
let logViewLines = 20
let logDirty = false

const ANSI = /\x1b\[[0-9;?]*[ -\/]*[@-~]|\x1b\][^\x07]*\x07/g
const stripAnsi = (s: string) => s.replace(ANSI, "")

const termCols = () => (process.stdout as unknown as { cols?: number }).cols ?? 100
const termRows = () => (process.stdout as unknown as { rows?: number }).rows ?? 30

function pushLog(raw: string) {
  const cols = termCols()
  const line = stripAnsi(raw).replace(/\r/g, "").trimEnd().slice(0, cols * 4)
  logBuf.push(line)
  if (logBuf.length > LOG_CAP) logBuf.splice(0, logBuf.length - LOG_CAP)
  if (plainMode) console.log(line)
  else scheduleLogRender()
}

function scheduleLogRender() {
  if (logDirty || !logsText) return
  logDirty = true
  setTimeout(() => {
    logDirty = false
    if (!logsText) return
    const tail = logBuf.slice(Math.max(0, logBuf.length - logViewLines))
    logsText.content = tail.join("\n")
  }, 50)
}

/*============================= process spawn ==============================*/

type RunOpts = { cwd?: string; env?: Record<string, string> }

async function run(cmd: string[], opts: RunOpts = {}): Promise<number> {
  pushLog(`$ ${cmd.join(" ")}`)
  let proc: ReturnType<typeof Bun.spawn>
  try {
    proc = Bun.spawn({
      cmd,
      cwd: opts.cwd,
      env: { ...(process.env as Record<string, string>), ...opts.env },
      stdout: "pipe",
      stderr: "pipe",
      stdin: "ignore",
    })
  } catch (e) {
    pushLog(`spawn failed: ${cmd[0]}: ${(e as Error).message}`)
    return 127
  }
  const pump = async (stream: ReadableStream<Uint8Array> | null | undefined) => {
    if (!stream) return
    const reader = stream.getReader()
    const td = new TextDecoder()
    let buf = ""
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buf += td.decode(value, { stream: true })
      let i: number
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i)
        buf = buf.slice(i + 1)
        if (line.trim()) pushLog(line)
      }
    }
    if (buf.trim()) pushLog(buf)
  }
  await Promise.all([
    pump(proc.stdout as ReadableStream<Uint8Array> | undefined),
    pump(proc.stderr as ReadableStream<Uint8Array> | undefined),
  ])
  return await proc.exited
}

const sudo = (...args: string[]) => run(["sudo", "-n", ...args])

async function haveCmd(bin: string): Promise<boolean> {
  try {
    const p = Bun.spawn(["sh", "-c", `command -v ${bin}`], { stdout: "ignore", stderr: "ignore" })
    return (await p.exited) === 0
  } catch {
    return false
  }
}

/*============================= system detect ==============================*/

type Family = "arch" | "debian" | "fedora" | "suse" | "unknown"

const sys = {
  name: "Linux",
  id: "",
  idLike: "",
  family: "unknown" as Family,
  arch: process.arch === "arm64" ? "aarch64" : process.arch === "x64" ? "x86_64" : process.arch,
  session: process.env.XDG_SESSION_TYPE || (process.env.DISPLAY ? "x11" : "unknown"),
  hasBus: !!process.env.DBUS_SESSION_BUS_ADDRESS,
}

async function detectSystem() {
  try {
    const txt = await readFile("/etc/os-release", "utf8")
    for (const line of txt.split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/)
      if (!m) continue
      const val = m[2].replace(/^"|"$/g, "")
      if (m[1] === "ID") sys.id = val
      if (m[1] === "ID_LIKE") sys.idLike = val
      if (m[1] === "PRETTY_NAME") sys.name = val
    }
  } catch {
    /* no os-release: keep defaults */
  }
  const hay = `${sys.id} ${sys.idLike}`.toLowerCase()
  if (/(arch|manjaro|endeavouros|garuda|artix)/.test(hay)) sys.family = "arch"
  else if (/(debian|ubuntu|linuxmint|pop|kali|raspbian)/.test(hay)) sys.family = "debian"
  else if (/(fedora|rhel|centos|rocky|almalinux|nobara)/.test(hay)) sys.family = "fedora"
  else if (/(suse|opensuse|sles)/.test(hay)) sys.family = "suse"
}

/*============================= package sets ===============================*/

const CORE: Record<Family, string[]> = {
  arch: [
    "xfce4", "xfce4-goodies", "xfce4-taskmanager", "xfce4-notifyd", "thunar",
    "rofi", "bat", "zsh", "playerctl", "git", "base-devel", "meson", "ninja",
    "jq", "curl", "imagemagick", "bzip2", "fontconfig", "noto-fonts", "sddm",
    "libxext", "libxcb", "xcb-util-renderutil", "libconfig", "dbus", "pixman",
    "libev", "uthash", "libgl", "libegl", "pcre2",
  ],
  debian: [
    "xfce4", "xfce4-goodies", "xfce4-taskmanager", "thunar", "rofi", "bat",
    "zsh", "playerctl", "git", "jq", "curl", "imagemagick", "bzip2", "fonts-noto",
    "lightdm", "lightdm-gtk-greeter", "meson", "ninja-build", "build-essential",
    "pkg-config", "libxext-dev", "libxcb1-dev", "libxcb-damage0-dev",
    "libxcb-dpms0-dev", "libxcb-xfixes0-dev", "libxcb-shape0-dev",
    "libxcb-render-util0-dev", "libxcb-render0-dev", "libxcb-randr0-dev",
    "libxcb-composite0-dev", "libxcb-image0-dev", "libxcb-present-dev",
    "libxcb-glx0-dev", "libpixman-1-dev", "libdbus-1-dev", "libconfig-dev",
    "libgl-dev", "libegl-dev", "libpcre2-dev", "libevdev-dev", "uthash-dev",
    "libev-dev", "libx11-xcb-dev",
  ],
  fedora: [
    // comps group plus the explicit package set: Xfce still lands if the
    // group id ever changes (the group only adds extras)
    "@xfce-desktop-environment",
    "xfce4-session", "xfce4-panel", "xfce4-settings", "xfce4-desktop",
    "xfce4-appfinder", "xfce4-terminal", "xfce4-notifyd", "xfce4-screensaver",
    "xfce4-power-manager", "xfce4-pulseaudio-plugin", "xfce4-docklike-plugin",
    "xfce4-taskmanager", "tumbler", "thunar-volman", "gvfs", "mousepad",
    "ristretto", "parole", "lightdm", "lightdm-gtk", "google-noto-fonts",
    "bat", "rofi", "zsh", "playerctl", "git", "gcc", "bzip2", "meson",
    "ninja-build", "dbus-devel", "libconfig-devel", "libdrm-devel",
    "libev-devel", "libX11-devel", "libX11-xcb", "libXext-devel",
    "libxcb-devel", "libGL-devel", "libEGL-devel", "pcre2-devel",
    "pixman-devel", "uthash-devel", "xcb-util-image-devel",
    "xcb-util-renderutil-devel", "xorg-x11-proto-devel", "jq", "curl",
    "imagemagick", "xdg-user-dirs", "xdg-utils", "xdg-desktop-portal-gtk",
  ],
  suse: [
    "xfce4-session", "xfce4-panel", "xfce4-desktop", "xfce4-settings",
    "xfce4-appfinder", "xfce4-terminal", "xfce4-notifyd", "thunar",
    "lightdm", "lightdm-gtk-greeter", "noto-fonts", "bat", "rofi", "zsh",
    "playerctl", "git", "gcc", "bzip2", "meson", "ninja", "jq", "curl",
    "imagemagick", "libxcb-devel", "libX11-devel", "libXext-devel",
    "pixman-devel", "libconfig-devel", "libdbus-1-devel", "libev-devel",
    "libGL-devel", "libEGL-devel", "pcre2-devel", "uthash-devel",
  ],
  unknown: [],
}

// one-by-one tolerant installs: missing packages are reported, never fatal
const OPTIONAL: Record<Family, string[]> = {
  arch: ["neofetch", "skippy-xd", "findex", "onboard", "lsd", "fzf", "nvim", "qt5ct", "kvantum"],
  debian: ["neofetch", "fastfetch", "skippy-xd", "onboard", "lsd", "fzf", "neovim", "qt5ct", "kvantum", "i3lock-color"],
  fedora: ["neofetch", "fastfetch", "skippy-xd", "onboard", "lsd", "fzf", "neovim", "qt5ct", "kvantum", "i3lock-color"],
  suse: ["neofetch", "fastfetch", "skippy-xd", "onboard", "lsd", "fzf", "neovim", "qt5ct", "kvantum", "i3lock-color"],
  unknown: [],
}

// eww build deps (only used on the cargo-build path)
const EWW_BUILD_DEPS: Record<Family, string[]> = {
  arch: [],
  debian: [
    "cargo", "rustc", "libgtk-3-dev", "libpango1.0-dev", "libcairo2-dev",
    "libgdk-pixbuf-2.0-dev", "librsvg2-dev",
  ],
  fedora: [
    "cargo", "gtk3-devel", "pango-devel", "cairo-devel", "gdk-pixbuf2-devel",
    "librsvg2-devel",
  ],
  suse: [
    "cargo", "gtk3-devel", "pango-devel", "cairo-devel", "gdk-pixbuf2-devel",
    "librsvg2-devel",
  ],
  unknown: [],
}

const AUR_PKGS = ["eww", "skippy-xd-git", "i3lock-color", "findex", "neofetch"]

function pkgInstallCmd(pkgs: string[]): string[] {
  const s = ["sudo", "-n"]
  switch (sys.family) {
    case "arch":
      return [...s, "pacman", "-S", "--needed", "--noconfirm", ...pkgs]
    case "debian":
      return [...s, "apt-get", "install", "-y", ...pkgs]
    case "fedora":
      return [...s, "dnf", "install", "-y", ...pkgs]
    case "suse":
      return [...s, "zypper", "--non-interactive", "install", ...pkgs]
    default:
      return ["false"]
  }
}

async function refreshIndex() {
  switch (sys.family) {
    case "arch": await run(["sudo", "-n", "pacman", "-Sy", "--noconfirm"]); break
    case "debian":
      await run(["sudo", "-n", "apt-get", "update"], { env: { DEBIAN_FRONTEND: "noninteractive" } })
      break
    case "suse": await run(["sudo", "-n", "zypper", "refresh"]); break
    default: break // dnf refreshes lazily
  }
}

/** batch first, then package-by-package so one unknown name cannot abort all */
async function installPkgs(pkgs: string[]): Promise<{ missing: string[] }> {
  const code = await run(pkgInstallCmd(pkgs), {
    env: sys.family === "debian" ? { DEBIAN_FRONTEND: "noninteractive" } : {},
  })
  if (code === 0) return { missing: [] }
  pushLog(`batch install failed (exit ${code}) - retrying package-by-package`)
  const missing: string[] = []
  for (const p of pkgs) {
    const c = await run(pkgInstallCmd([p]), {
      env: sys.family === "debian" ? { DEBIAN_FRONTEND: "noninteractive" } : {},
    })
    if (c !== 0) missing.push(p)
  }
  if (missing.length) pushLog(`not installable: ${missing.join(", ")}`)
  return { missing }
}

/*============================= steps ======================================*/

type StepState = "pending" | "running" | "done" | "failed" | "skipped"
type Step = { name: string; state: StepState; note?: string; run: () => Promise<{ note?: string } | void> }

const HOME = process.env.HOME || "/root"
const REPO = dirname(import.meta.dir)
// dotfiles live in dots/; home/ is the pre-rename layout still shipped upstream
const dotsSrc = [join(REPO, "dots"), join(REPO, "home")].find((p) => existsSync(p)) ?? join(REPO, "dots")
const backupRoot = join(HOME, `.miserable_xfce_backup_${new Date().toISOString().slice(0, 19).replace(/:/g, "")}`)
const manifestPath = join(HOME, ".miserable_xfce_manifest")
const settingsOnly = process.argv.includes("--settings-only")
const plainMode = process.argv.includes("--no-color")

const GTK_THEME = "Lavanda-Dark-Compact-Tokyonight"
const WM_THEME = "cirkles"

/* --- helpers -------------------------------------------------------------- */

let xqMode: "direct" | "session" | "none" | null = null
async function xq(args: string[]): Promise<number> {
  // resolve the transport once: probing (and logging) per property would spam the log
  if (xqMode === null) {
    if (sys.hasBus && (await haveCmd("xfconf-query"))) xqMode = "direct"
    else if ((await haveCmd("xfconf-query")) && (await haveCmd("dbus-run-session"))) xqMode = "session"
    else xqMode = "none"
    if (xqMode === "session") pushLog("no session bus - writing through temporary dbus session (persists to XML)")
    if (xqMode === "none") pushLog("xfconf-query unavailable - cannot apply Xfce settings")
  }
  if (xqMode === "direct") return run(["xfconf-query", ...args])
  if (xqMode === "session") return run(["dbus-run-session", "--", "xfconf-query", ...args])
  return 127
}

async function xfconfSet(channel: string, prop: string, value: string, type = "string"): Promise<boolean> {
  const set = await xq(["-c", channel, "-p", prop, "-s", value])
  if (set === 0) return true
  const create = await xq(["-c", channel, "-n", "-t", type, "-p", prop, "-s", value])
  return create === 0
}

async function walkFiles(dir: string): Promise<string[]> {
  const out: string[] = []
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    const full = join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walkFiles(full)))
    else out.push(full)
  }
  return out
}

/** point every absolute Icon= path at ~/.assets/<basename> (fixes contributor paths) */
async function rewriteDesktopIcons(dir: string): Promise<number> {
  let fixed = 0
  for (const file of (await walkFiles(dir)).filter((f) => f.endsWith(".desktop"))) {
    let txt: string
    try {
      txt = await readFile(file, "utf8")
    } catch {
      continue
    }
    const next = txt.replace(/^Icon=(\/.+)$/m, (_m, path: string) => {
      const base = basename(path)
      const local = join(HOME, ".assets", base)
      const fallback = join(HOME, ".assets", "archlinux.svg")
      const target = fileExists(local) ? local : fileExists(fallback) ? fallback : path
      if (target !== path) fixed++
      return `Icon=${target}`
    })
    if (next !== txt) await writeFile(file, next)
  }
  return fixed
}

const fileExists = (p: string) => existsSync(p)

/* --- step implementations ------------------------------------------------- */

async function stepDetect(): Promise<void> {
  pushLog(`host: ${sys.name} (${sys.id || "?"})`)
  pushLog(`arch: ${sys.arch}  pkg: ${sys.family}  session: ${sys.session}  bus: ${sys.hasBus ? "yes" : "no"}`)
  const root = process.getuid?.() === 0
  if (root) pushLog("running as root - sudo not needed, but running as root is not recommended")
  else {
    const ok = await run(["sudo", "-n", "true"]).then((c) => c === 0).catch(() => false)
    if (!ok) throw new Error("sudo credential missing - run ./init.sh which keeps sudo alive")
  }
  if (sys.family === "unknown") throw new Error(`unsupported distro (ID=${sys.id || "?"})`)
}

/** run without logging - for cheap probes like `systemctl is-enabled` */
async function quiet(cmd: string[]): Promise<number> {
  try {
    return await Bun.spawn({ cmd, stdout: "ignore", stderr: "ignore", stdin: "ignore" }).exited
  } catch {
    return 127
  }
}

const XFCE_BINS = ["startxfce4", "xfce4-panel", "xfconf-query"]
async function xfcePresent(): Promise<boolean> {
  for (const b of XFCE_BINS) if (!(await haveCmd(b))) return false
  return true
}

/** Xfce is the whole point of this installer - install it explicitly if the package set missed it */
async function ensureXfce(): Promise<{ note?: string }> {
  if (await xfcePresent()) return {}
  pushLog("Xfce not fully present - installing it explicitly")
  const { missing } = await installPkgs([
    "xfce4-session", "xfce4-panel", "xfce4-settings", "xfce4-desktop",
    "xfce4-appfinder", "xfce4-terminal", "thunar", "xfconf",
    "xfce4-power-manager", "xfce4-notifyd",
  ])
  if (missing.length) pushLog(`xfce packages unavailable: ${missing.join(", ")}`)
  if (!(await xfcePresent())) throw new Error("Xfce still missing after install (startxfce4/xfce4-panel/xfconf-query)")
  return { note: "Xfce installed" }
}

/** enable a login screen only when none is enabled yet (fresh installs) */
async function ensureDisplayManager(): Promise<void> {
  if (!(await haveCmd("systemctl"))) return
  for (const dm of ["gdm", "gdm3", "sddm", "lightdm", "lxdm", "ly"]) {
    if ((await quiet(["systemctl", "is-enabled", `${dm}.service`])) === 0) {
      pushLog(`login screen: ${dm} already enabled`)
      return
    }
  }
  const want = sys.family === "arch" ? "sddm" : "lightdm"
  if ((await quiet(["systemctl", "cat", `${want}.service`])) !== 0) {
    pushLog(`no ${want}.service unit - leaving the boot target untouched`)
    return
  }
  const enabled = await run(["sudo", "-n", "systemctl", "enable", `${want}.service`])
  if (enabled !== 0) {
    pushLog(`could not enable ${want} - run: sudo systemctl enable ${want}`)
    return
  }
  pushLog(`enabled ${want} login screen`)
  if ((await quiet(["sh", "-c", "systemctl get-default | grep -q graphical.target"])) !== 0) {
    if ((await run(["sudo", "-n", "systemctl", "set-default", "graphical.target"])) === 0)
      pushLog("boot target -> graphical (login screen starts on boot)")
  }
}

async function stepCore(): Promise<{ note?: string } | void> {
  if (sys.family === "arch") await run(["sudo", "-n", "pacman", "-S", "--needed", "--noconfirm", "git"]).catch(() => 0)
  await refreshIndex()
  const { missing } = await installPkgs(CORE[sys.family])
  const xfce = await ensureXfce()
  await ensureDisplayManager()
  const note = [xfce.note, missing.length ? `${missing.length} pkg missing` : undefined].filter(Boolean).join(", ")
  return note ? { note } : undefined
}

async function stepAurHelper(): Promise<{ note?: string } | void> {
  if (sys.family !== "arch") return { note: "n/a" }
  if (await haveCmd("yay")) return { note: "present" }
  const build = `/tmp/yay-build-${Date.now()}`
  await run(["git", "clone", "https://aur.archlinux.org/yay.git", build])
  // resolve build deps once and install them ourselves (makepkg cannot fetch them here)
  const d = Bun.spawn(["sh", "-c", `cd ${build} && makepkg --printsrcdeps`], { stdout: "pipe" })
  const depList = (await new Response(d.stdout).text()).split(/\s+/).filter(Boolean)
  if ((await d.exited) !== 0) pushLog("could not resolve yay deps - continuing")
  if (depList.length) await run(["sudo", "-n", "pacman", "-S", "--needed", "--noconfirm", ...depList])
  const buildCode = await run(["sh", "-c", `cd ${build} && makepkg -d --noconfirm`])
  if (buildCode !== 0) throw new Error("yay build failed")
  const pkgs = Bun.spawn(["sh", "-c", `ls ${build}/*.pkg.tar.* 2>/dev/null`], { stdout: "pipe" })
  const pkgFiles = (await new Response(pkgs.stdout).text()).split("\n").filter(Boolean)
  await pkgs.exited
  if (!pkgFiles.length) throw new Error("yay package not produced")
  const installCode = await run(["sudo", "-n", "pacman", "-U", "--needed", "--noconfirm", ...pkgFiles])
  if (installCode !== 0) throw new Error("yay install failed")
  await run(["sh", "-c", `rm -rf ${build}`])
  return { note: "yay installed" }
}

async function stepExtras(): Promise<{ note?: string } | void> {
  if (sys.family === "arch") {
    const { missing } = await runAur(AUR_PKGS)
    const { missing: optMissing } = await installPkgs(OPTIONAL.arch.filter((p) => !AUR_PKGS.includes(p)))
    const all = [...missing, ...optMissing]
    return all.length ? { note: `${all.length} skipped` } : undefined
  }
  const { missing } = await installPkgs(OPTIONAL[sys.family])
  return missing.length ? { note: `${missing.length} skipped` } : undefined
}

async function runAur(pkgs: string[]): Promise<{ missing: string[] }> {
  const missing: string[] = []
  if (!(await haveCmd("yay"))) return { missing: pkgs }
  for (const p of pkgs) {
    const c = await run(["yay", "-S", "--noconfirm", "--needed", p])
    if (c !== 0) {
      pushLog(`AUR package failed: ${p}`)
      missing.push(p)
    }
  }
  return { missing }
}

async function stepEww(): Promise<{ note?: string } | void> {
  if (await haveCmd("eww")) return { note: "already installed" }
  if (sys.family === "arch") {
    const { missing } = await runAur(["eww"])
    if (!missing.length) return { note: "from AUR" }
  }
  // fallback: build from source, X11 features
  if (!(await haveCmd("cargo"))) {
    await installPkgs(EWW_BUILD_DEPS[sys.family])
    if (!(await haveCmd("cargo"))) return { note: "cargo missing - skipped" }
  }
  const src = "/tmp/eww-build"
  await run(["rm", "-rf", src])
  const clone = await run(["git", "clone", "--depth", "1", "https://github.com/elkowar/eww", src])
  if (clone !== 0) throw new Error("eww clone failed")
  const build = await run(["cargo", "build", "--release", "--no-default-features", "--features", "x11"], { cwd: src })
  if (build !== 0) throw new Error("eww build failed")
  await sudo("install", "-m755", join(src, "target/release/eww"), "/usr/local/bin/eww")
  return { note: "built from source" }
}

async function stepPicom(): Promise<{ note?: string } | void> {
  const src = "/tmp/picom-anim-build"
  await run(["rm", "-rf", src])
  const clone = await run(["git", "clone", "-b", "animation-pr", "https://github.com/fdev31/picom.git", src])
  if (clone !== 0) throw new Error("picom fork clone failed")
  const sub = await run(["sh", "-c", `cd ${src} && git submodule update --init --recursive`])
  if (sub !== 0) pushLog("submodule update failed - continuing")
  // positional order is `meson setup [options] <builddir> <sourcedir>`: pass only
  // the builddir, the source dir defaults to the current directory
  const setup = await run(["meson", "setup", "--buildtype=release", "build"], { cwd: src })
  if (setup !== 0) throw new Error("picom meson setup failed")
  const compile = await run(["ninja", "-C", "build"], { cwd: src })
  if (compile !== 0) throw new Error("picom build failed")
  const code = await run(["sudo", "-n", "ninja", "-C", "build", "install"], { cwd: src })
  if (code !== 0) throw new Error("picom install failed")
  await run(["sh", "-c", `rm -rf ${src}`])
  return { note: "animation fork" }
}

async function stepDeploy(): Promise<{ note?: string } | void> {
  if (!fileExists(dotsSrc)) throw new Error(`dotfiles not found at ${dotsSrc}`)
  const manifest: string[] = []
  let copied = 0
  let backedUp = 0
  let same = 0

  let failed = 0
  const walk = async (rel: string): Promise<void> => {
    const s = join(dotsSrc, rel)
    const entries = await readdir(s, { withFileTypes: true })
    for (const e of entries) {
      const childRel = rel ? join(rel, e.name) : e.name
      const srcPath = join(s, e.name)
      const dstPath = join(HOME, childRel)
      if (e.isDirectory()) {
        await mkdir(dstPath, { recursive: true })
        await walk(childRel)
        continue
      }
      if (!e.isFile() && !e.isSymbolicLink()) {
        // sockets/fifos/devices cannot be copied (icon packs have shipped one)
        pushLog(`not a regular file - left out: ${childRel}`)
        failed++
        continue
      }
      const isLink = e.isSymbolicLink()
      // identical? compare link target for symlinks, file bytes for regular files
      let identical = false
      try {
        if (isLink) {
          const [ta, tb] = await Promise.all([readlink(srcPath), readlink(dstPath)])
          identical = ta === tb
        } else {
          const [a, b] = await Promise.all([stat(srcPath), stat(dstPath)])
          if (a.size === b.size) {
            const [ca, cb] = await Promise.all([readFile(srcPath), readFile(dstPath)])
            identical = ca.equals(cb)
          }
        }
      } catch {
        /* dst missing -> not identical */
      }
      if (identical) {
        same++
        continue
      }
      try {
        // lstat so a dangling symlink left at dst is detected too
        const dstExists = await lstat(dstPath).then(() => true, () => false)
        if (dstExists) {
          const bakPath = join(backupRoot, childRel)
          await mkdir(dirname(bakPath), { recursive: true })
          await rename(dstPath, bakPath)
          backedUp++
          manifest.push(`backup\t${childRel}\t${bakPath}`)
        }
        await mkdir(dirname(dstPath), { recursive: true })
        if (isLink) {
          // recreate the symlink verbatim: target may be a directory (theme
          // assets: 306 in this tree) or dangling (24) - copyFile can't do either
          await symlink(await readlink(srcPath), dstPath)
        } else {
          await copyFile(srcPath, dstPath)
        }
      } catch (err) {
        pushLog(`could not copy ${childRel}: ${(err as Error).message}`)
        failed++
        continue
      }
      copied++
      manifest.push(`deploy\t${childRel}`)
    }
  }

  await walk("")
  // make sure every shipped script is executable
  for (const bin of [join(HOME, ".local/bin/lock.sh"), join(HOME, ".local/bin/skippy.sh")]) {
    if (fileExists(bin)) await chmod(bin, 0o755).catch(() => {})
  }
  const ewwScripts = await walkFiles(join(HOME, ".config/eww/scripts"))
  for (const f of ewwScripts) await chmod(f, 0o755).catch(() => {})

  pushLog(`copied ${copied}, unchanged ${same}, backed up ${backedUp}`)
  if (copied || backedUp) {
    // a rerun that changed nothing must not clobber the record of the run that did
    await writeFile(
      manifestPath,
      `# Miserable_Xfce deploy ${new Date().toISOString()}\n# backup dir: ${backedUp ? backupRoot : "-"}\n${manifest.join("\n")}\n`,
    )
    pushLog(`manifest: ${manifestPath}`)
    if (backedUp) pushLog(`backup:   ${backupRoot}`)
  } else {
    pushLog(`manifest: ${manifestPath} (unchanged from previous run)`)
  }
  return { note: failed ? `${copied} files, ${failed} could not be copied` : `${copied} files` }
}

async function stepXfceSettings(): Promise<{ note?: string } | void> {
  if (!(await haveCmd("xfconf-query"))) return { note: "xfconf-query missing - skipped" }
  if (!fileExists(join(HOME, ".themes", GTK_THEME))) throw new Error(`theme missing: ${GTK_THEME}`)

  const themeOk = await xfconfSet("xsettings", "/Net/ThemeName", GTK_THEME)
  pushLog(`appearance theme -> ${GTK_THEME}: ${themeOk ? "ok" : "FAILED"}`)
  const wmOk = await xfconfSet("xfwm4", "/general/theme", WM_THEME)
  pushLog(`window manager theme -> ${WM_THEME}: ${wmOk ? "ok" : "FAILED"}`)

  if (!themeOk && !wmOk) return { note: "no Xfce session" }
  if (sys.session !== "x11") pushLog(`session is '${sys.session}' - settings take effect on next Xfce login`)
  return { note: themeOk && wmOk ? "themes applied" : "partial" }
}

async function stepPanel(): Promise<{ note?: string } | void> {
  if (!(await haveCmd("xfconf-query"))) return { note: "xfconf-query missing - skipped" }
  const tar = join(HOME, ".config/xfce4/panel/Miserable_xfce.tar.bz2")
  if (!fileExists(tar)) return { note: "panel backup missing - skipped" }
  const tmp = `/tmp/miserable_panel_${Date.now()}`
  await mkdir(tmp, { recursive: true })
  const untar = await run(["tar", "xjf", tar, "-C", tmp])
  if (untar !== 0) throw new Error("panel archive extraction failed")

  const panelDir = join(HOME, ".config/xfce4/panel")
  await mkdir(panelDir, { recursive: true })
  await run(["cp", "-r", `${tmp}/.`, panelDir])
  const fixed = await rewriteDesktopIcons(panelDir)
  pushLog(`rewrote ${fixed} launcher icon paths to ${HOME}/.assets`)

  // legacy config.txt -> explicit per-property sets. xfconf-query --import rejects
  // this format (and does not exist in older xfconf), so parse it ourselves and
  // replay the same ResetProperty + SetProperty pass xfce4-panel-profiles does.
  const cfgPath = join(tmp, "config.txt")
  if (!fileExists(cfgPath)) throw new Error("panel archive has no config.txt")
  const { props, warnings } = parsePanelConfig(await readFile(cfgPath, "utf8"))
  for (const w of warnings) pushLog(`panel layout: ${w}`)
  if (!props.length) throw new Error("panel layout parsed 0 properties")

  const reset = await xq(["-c", "xfce4-panel", "-r", "-p", "/", "-R"])
  if (reset !== 0) pushLog("panel channel reset skipped (fresh channel or no permission)")
  let applied = 0
  const failed: string[] = []
  for (const p of props) {
    if ((await xq(xfconfSetArgs(p))) === 0) applied++
    else failed.push(p.prop)
  }
  await run(["sh", "-c", `rm -rf ${tmp}`])
  pushLog(`panel properties applied: ${applied}/${props.length}`)
  if (applied === 0) throw new Error("panel import failed - no properties could be set")
  if (failed.length) pushLog(`panel properties failed: ${failed.join(", ")}`)

  if (await haveCmd("xfce4-panel")) {
    const restarted = await run(["xfce4-panel", "-r"])
    if (restarted !== 0) pushLog("panel restart skipped - layout applies on next login")
  }
  return { note: failed.length ? `layout ${applied}/${props.length}` : "layout imported" }
}

async function stepAutostart(): Promise<{ note?: string } | void> {
  const dir = join(HOME, ".config/xfce4/autostart")
  await mkdir(dir, { recursive: true })
  const desktop = `[Desktop Entry]
Type=Application
Name=Picom (Miserable_Xfce animations)
Exec=sh -c 'pgrep -x picom >/dev/null || exec picom --config "$HOME/.config/picom.conf"'
OnlyShowIn=XFCE;
X-XFCE-Autostart-Override=true
`
  await writeFile(join(dir, "picom.desktop"), desktop)
  pushLog(`wrote ${join(dir, "picom.desktop")}`)
  if (sys.session === "x11" && (await haveCmd("picom"))) {
    await run(["sh", "-c", `pgrep -x picom >/dev/null || setsid picom --config "$HOME/.config/picom.conf" >/dev/null 2>&1 &`])
    pushLog("picom started")
  }
  return { note: "picom" }
}

/*============================= step table =================================*/

const steps: Step[] = [
  { name: "detect system", state: "pending", run: stepDetect },
  { name: "core packages", state: "pending", run: stepCore },
  { name: "AUR helper (yay)", state: "pending", run: stepAurHelper },
  { name: "package extras", state: "pending", run: stepExtras },
  { name: "install eww", state: "pending", run: stepEww },
  { name: "build picom fork", state: "pending", run: stepPicom },
  { name: "deploy dotfiles", state: "pending", run: stepDeploy },
  { name: "xfce appearance + wm", state: "pending", run: stepXfceSettings },
  { name: "import panel layout", state: "pending", run: stepPanel },
  { name: "enable autostart", state: "pending", run: stepAutostart },
]

if (settingsOnly) {
  for (const s of steps) {
    if (["detect system", "deploy dotfiles", "xfce appearance + wm", "import panel layout", "enable autostart"].includes(s.name))
      continue
    s.state = "skipped"
    s.note = "--settings-only"
    s.run = async () => ({ note: "--settings-only" })
  }
}

// --help / -h: usage without starting the TUI (must never hang a pipe)
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`Miserable_Xfce installer

usage: bun installer.ts [flags]        (or: ./init.sh [flags])

flags:
  --settings-only   only deploy dotfiles + xfce settings, no packages
  --demo            fake steps, no system changes (UI preview)
  --no-color        no TUI, plain log lines (ssh / pipes / debugging)
  --help, -h        show this help and exit`)
  process.exit(0)
}

// --demo: fake steps, no system changes - UI preview only
if (process.argv.includes("--demo")) {
  for (const s of steps) {
    s.run = async () => {
      for (let i = 1; i <= 3; i++) {
        pushLog(`[${s.name}] working... item ${i}/3`)
        await new Promise((r) => setTimeout(r, 200))
      }
      pushLog(`[${s.name}] ok`)
      return { note: "demo" }
    }
  }
}

/*============================= UI =========================================*/

const ICONS: Record<StepState, string> = { pending: "○", running: "▸", done: "✓", failed: "✗", skipped: "⊘" }
const COLORS: Record<StepState, string> = {
  pending: C.dim,
  running: C.accent,
  done: C.green,
  failed: C.red,
  skipped: C.yellow,
}
const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]

let renderer: CliRenderer
let installing = false
let finished = false
let spinnerTick = 0
const timers: ReturnType<typeof setInterval>[] = []

const cols = termCols
const rows = termRows

function quit() {
  for (const t of timers) clearInterval(t)
  try { renderer.destroy() } catch { /* already gone */ }
  process.exit(0)
}

/** --no-color: run the same step table without the TUI, log straight to stdout */
async function runInstallPlain(): Promise<void> {
  console.log(`Miserable_Xfce installer  ·  ${sys.name}  ·  ${sys.family} pkgs  ·  ${sys.session}`)
  let failed = 0
  for (const s of steps) {
    s.state = "running"
    pushLog(`--- ${s.name} ---`)
    try {
      const res = await s.run()
      if (res && "note" in res && res.note) {
        s.note = res.note
        s.state = res.note.includes("n/a") || res.note.includes("skip") ? "skipped" : "done"
      } else {
        s.state = "done"
      }
    } catch (e) {
      s.state = "failed"
      s.note = (e as Error).message.slice(0, 60)
      failed++
      pushLog(`step failed: ${s.name}: ${(e as Error).message}`)
    }
    console.log(`${ICONS[s.state]} ${s.name}${s.note ? `  ${s.note}` : ""}`)
  }
  const done = steps.filter((s) => s.state === "done").length
  const skipped = steps.filter((s) => s.state === "skipped").length
  pushLog("")
  pushLog(failed ? `finished WITH ERRORS - ${done} ok, ${failed} failed, ${skipped} skipped` : `all steps complete - ${done} ok, ${skipped} skipped`)
  pushLog(`dotfiles backed up to: ${fileExists(backupRoot) ? backupRoot : "(nothing overwritten)"}`)
  process.exit(failed ? 1 : 0)
}

async function main() {
  await detectSystem()

  if (plainMode) {
    await runInstallPlain()
    return
  }

  renderer = await createCliRenderer({ exitOnCtrlC: false, exitSignals: [] })

  /* ---- welcome ---- */
  const logoBox = new BoxRenderable(renderer, {
    width: 39, height: 10, paddingX: 1, paddingY: 1, backgroundColor: C.bg,
  })
  const logoText = new TextRenderable(renderer, { content: LOGO, fg: parseColor(C.accent) })
  logoBox.add(logoText)

  const sysLine = new TextRenderable(renderer, {
    content: `${sys.name}  ·  ${sys.arch}  ·  ${sys.family} pkgs  ·  ${sys.session}`,
    fg: parseColor(C.dim),
  })

  const menu = new SelectRenderable(renderer, {
    id: "menu",
    width: 44,
    height: 4,
    options: [
      { name: "Start installation", description: "deps -> dotfiles -> xfce settings" },
      { name: "Exit", description: "quit without changes" },
    ],
    backgroundColor: parseColor(C.panel),
    selectedBackgroundColor: parseColor(C.accent),
    selectedTextColor: parseColor(C.bg),
    textColor: parseColor(C.fg),
    descriptionColor: parseColor(C.dim),
  })

  const hint = new TextRenderable(renderer, {
    content: "up/down move  ·  enter select  ·  installation makes changes only after you confirm",
    fg: parseColor(C.dim),
  })

  const welcome = new BoxRenderable(renderer, {
    id: "welcome", width: "100%", height: "100%", flexDirection: "column",
    paddingX: 2, gap: 1, backgroundColor: C.bg,
  })
  welcome.add(logoBox)
  welcome.add(sysLine)
  welcome.add(menu)
  welcome.add(hint)
  renderer.root.add(welcome)

  /* ---- progress ---- */
  const buildProgress = () => {
    const stepW = Math.min(52, Math.max(32, Math.floor(cols() * 0.4)))
    const header = new BoxRenderable(renderer, { width: "100%", height: 3, flexDirection: "column", paddingX: 2, backgroundColor: C.panelAlt })
    const headerText = new TextRenderable(renderer, { content: "Miserable_Xfce install  ·  starting…", fg: parseColor(C.fg) })
    header.add(headerText)

    const stepsBox = new BoxRenderable(renderer, { width: stepW, height: Math.max(6, rows() - 6), flexDirection: "column", paddingX: 1, paddingY: 1, border: true, title: "steps", titleColor: parseColor(C.accent), backgroundColor: C.panel })
    const stepTexts: TextRenderable[] = steps.map((s) => {
      const t2 = new TextRenderable(renderer, { content: `${ICONS[s.state]} ${s.name}`, fg: parseColor(COLORS[s.state]) })
      stepsBox.add(t2)
      return t2
    })

    const logBox = new BoxRenderable(renderer, { flexGrow: 1, height: Math.max(6, rows() - 6), flexDirection: "column", paddingX: 1, paddingY: 1, border: true, title: "logs", titleColor: parseColor(C.accent), backgroundColor: C.panel })
    const logs = new TextRenderable(renderer, { content: "", fg: parseColor(C.fg) })
    logBox.add(logs)
    logsText = logs

    const body = new BoxRenderable(renderer, { width: "100%", flexGrow: 1, flexDirection: "row", gap: 1, paddingX: 1 })
    body.add(stepsBox)
    body.add(logBox)

    const footer = new BoxRenderable(renderer, { width: "100%", height: 1, paddingX: 2, backgroundColor: C.panelAlt })
    const footerText = new TextRenderable(renderer, { content: "", fg: parseColor(C.dim) })
    footer.add(footerText)

    const screen = new BoxRenderable(renderer, { id: "progress", width: "100%", height: "100%", flexDirection: "column", backgroundColor: C.bg, visible: false })
    screen.add(header)
    screen.add(body)
    screen.add(footer)
    renderer.root.add(screen)

    return { screen, headerText, stepTexts, footerText, logs }
  }

  const prog = buildProgress()
  logViewLines = Math.max(4, rows() - 9)

  const refreshStepTexts = () => {
    prog.stepTexts.forEach((t2, i) => {
      const s = steps[i]
      const spin = s.state === "running" ? SPINNER[spinnerTick % SPINNER.length] + " " : ""
      t2.content = `${spin}${ICONS[s.state]} ${s.name}${s.note ? `  ${s.note}` : ""}`
      t2.fg = parseColor(COLORS[s.state])
    })
  }

  const resize = () => {
    const h = Math.max(6, rows() - 6)
    logViewLines = Math.max(4, rows() - 9)
    scheduleLogRender()
  }
  process.stdout.on("resize", resize)

  /* ---- run ---- */
  const runInstall = async () => {
    installing = true
    welcome.visible = false
    prog.screen.visible = true
    menu.visible = false

    const t0 = Date.now()
    const elapsed = () => ((Date.now() - t0) / 1000).toFixed(1)

    timers.push(
      setInterval(() => {
        spinnerTick++
        const running = steps.find((s) => s.state === "running")
        const idx = steps.indexOf(running!) + 1
        prog.headerText.content = `Miserable_Xfce install  ·  step ${idx}/${steps.length}${running ? `  ${running.name}` : ""}  ·  ${elapsed()}s`
        refreshStepTexts()
      }, 120),
    )

    let failed = 0

    for (const s of steps) {
      s.state = "running"
      refreshStepTexts()
      prog.headerText.content = `Miserable_Xfce install  ·  ${s.name}`
      pushLog(`--- ${s.name} ---`)
      try {
        const res = await s.run()
        if (res && "note" in res && res.note) {
          s.note = res.note
          s.state = res.note.includes("n/a") || res.note.includes("skip") ? "skipped" : "done"
        } else {
          s.state = "done"
        }
      } catch (e) {
        s.state = "failed"
        s.note = (e as Error).message.slice(0, 60)
        failed++
        pushLog(`step failed: ${s.name}: ${(e as Error).message}`)
      }
      refreshStepTexts()
    }

    for (const t of timers) clearInterval(t)
    timers.length = 0
    installing = false
    finished = true

    const done = steps.filter((s) => s.state === "done").length
    const skipped = steps.filter((s) => s.state === "skipped").length
    prog.headerText.content = failed
      ? `install finished with errors  ·  ${done} ok, ${failed} failed, ${skipped} skipped`
      : `install complete  ·  ${done} ok, ${skipped} skipped`
    prog.headerText.fg = parseColor(failed ? C.red : C.green)
    pushLog("")
    pushLog(failed ? "finished WITH ERRORS - see failed steps above" : "all steps complete")
    pushLog(`dotfiles backed up to: ${fileExists(backupRoot) ? backupRoot : "(nothing overwritten)"}`)
    pushLog("next: log out, pick Xfce at the login screen, log back in")
    prog.footerText.content = "enter/q quit  ·  re-run ./init.sh --settings-only to re-apply xfce settings after login"
    refreshStepTexts()
    scheduleLogRender()
  }

  menu.on(SelectRenderableEvents.ITEM_SELECTED, (_index: number, option: { name: string }) => {
    if (option.name === "Exit") quit()
    else void runInstall()
  })
  menu.focus()

  renderer.keyInput.on("keypress", (key: KeyEvent) => {
    if (installing) {
      if (key.ctrl && key.name === "c") pushLog("ctrl+c ignored until the install finishes")
      return
    }
    if (finished && (key.name === "q" || key.name === "return" || key.name === "escape")) quit()
    else if (!finished && (key.name === "q" || key.name === "escape")) quit()
  })

  scheduleLogRender()
}

main().catch((e) => {
  try { renderer?.destroy() } catch { /* noop */ }
  console.error("installer crashed:", e)
  process.exit(1)
})
