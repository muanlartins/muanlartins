// The stream's Pix call: a QR code to the site's /pix, drawn as public/stream/pix-qr.svg (Klein on paper, with its
// quiet zone). Static, so the overlays need no library: run it again only if the address changes.
//
//     node scripts/pix-qr.mjs
import { writeFileSync } from "node:fs"
import qrcode from "qrcode-generator"

const URL = "https://muanlartins.com.br/pix"
const QUIET = 2 // modules of margin; the card around it is paper too

const qr = qrcode(0, "M")
qr.addData(URL)
qr.make()
const n = qr.getModuleCount()
let path = ""
for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) path += `M${c + QUIET} ${r + QUIET}h1v1h-1z`
const size = n + 2 * QUIET
writeFileSync(
  new globalThis.URL("../public/stream/pix-qr.svg", import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><title>${URL}</title>` +
    `<rect width="${size}" height="${size}" fill="#f4f5f7"/><path fill="#002fa7" d="${path}"/></svg>\n`,
)
console.log(`${URL}: ${n}×${n} módulos → public/stream/pix-qr.svg`)
