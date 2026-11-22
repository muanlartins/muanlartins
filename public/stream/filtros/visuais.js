// The looks on him: a model's hair (and the scalp under it) on his head and its clothes on his shoulders, his face
// and hands drawn back over them (filtros.html's look machinery: `buildAgent`, `placeTorso`, the hair around it
// erased with the camera's background). Each look is fitted with its filter (headless, on a live's clip); Luan
// fine-tunes any with ?ajuste and pastes the numbers back here.
//
// An entry per filter id. When the id is a filter with a folder of its own (an agent with abilities), the look
// joins it; otherwise it's a filter of its own in the dock (give it `nome`, `jogo` and, for the dropdown's
// picture, `rosto`). The model goes in public/stream/privado/ (gitignored: never committed or published),
// compressed with
//   npx -y @gltf-transform/cli optimize in.glb out.glb --compress meshopt --texture-compress webp --palette false
// It needs a skeleton with the bones the machinery reads (Head, Neck, L_Eyeball/R_Eyeball, L_Brows/R_Brows or
// L_Brow_Mid_01/R_Brow_Mid_01, L_Shoulder/R_Shoulder; numbered names like Neck_12 are read too), a hair material
// with "Hair" in its name and a body material with "Body" in it (or `body`).
//
//   url       the model, e.g. "privado/<id>.glb" (?<id>=<url> in the page's address overrides it, for trying one)
//   body      a RegExp for the body's material when it isn't named Body
//   extra     a RegExp for more materials to put on the torso whole (something worn on the back)
//   behind    true when locks fall beside the face: his face and hands are drawn back over the hair too
//   forehead  where the model's skin starts above the brows, in metres (0.035 by default)
//   trim      where his own face stops above the brows, as a part of the brows-to-chin height (none: all of it)
//   hairDown  how far below the eyes the hair is kept, in metres (long hair would hang over his whole body)
//   gorro     where the Santa hat sits on this hair: [up, size] from its place on his own head
//
// A model without that skeleton (any model: a low-poly one with a simple rig of its own, a hat, a static mesh) is
// placed by numbers instead, with modo: "fixo": a piece on his head and one on his shoulders, each made of the parts
// of the model it names, its size, place and turn set by hand. Skinned meshes are taken in the pose the file has.
//
//   <id>: {
//     modo: "fixo", url: "privado/<id>.glb", nome: "…", jogo: "…",
//     cabeca: { partes: /Hair|Hat/, tamanho: 24, posicao: [0, 4, -3], rotacao: [0, 0, 0] },
//     ombros: { partes: /Shirt|Collar/, tamanho: 1.5, posicao: [0, -0.5, 0], rotacao: [0, 0, 0] },
//   },
//
//   cabeca        the piece on his head, turning with it (left out: none)
//   ombros        the piece on his shoulders, sized from the distance between them, its top under his chin (it
//                 squashes as he looks down, like the agents' clothes; left out: none)
//     partes      a RegExp over the parts' names (a mesh's, its nodes' above it, its material's): only those (all of
//                 them by default). One model can make both pieces, each from its own parts
//     tamanho     the piece's longest side: on the head in cm (24 by default); on the shoulders in his shoulders'
//                 widths, 1 being the distance between them (1.5)
//     posicao     [x, y, z], where the piece's centre goes, x to the picture's right, y up, z towards the camera: on
//                 the head in cm from the face's centre (his eyes are 2.6 up, 2.4 forward and 6.3 apart, the top of
//                 his head about 10 up; [0, 4, -3] by default); on the shoulders in his shoulders' widths from the
//                 middle between them ([0, -0.5, 0])
//     rotacao     [x, y, z] in degrees, about the piece's centre: none for a model made facing forwards (glTF's +z),
//                 [0, 180, 0] for one facing away, [0, -90, 0] for one facing +x
//     escala      [x, y, z], a stretch on top of tamanho (a short jacket made longer: [1, 1.3, 1]; [1, 1, 1])
//     url         another file for this piece (a hat from one model, a coat from another)
//     oclusor     (cabeca) false for a piece in front of his face (glasses, a mask): the invisible head that hides a
//                 piece's back when he turns would hide it
//   pose          a skinned model in a pose of its own animations', "Idle" or ["Idle", seconds] (arms down, not a T)
//   cores         colours the game paints from its code, by material's name: { Hair: "#db2c00" }
//   apagar        false leaves his own hair as it is (by default it's painted over round the head piece, as the agents')
//   rostoPorCima  his face drawn back over the pieces: true over the shoulders' (the default, as the agents'), "tudo"
//                 over the head's too (a piece that comes down beside his face), false never (one that covers it)
//   maosPorCima   his hands, the same way
//   trim, gorro   as above (the hat on the head piece's box: [up, size])
//
// Fitting one: filtros.html?modo=<id>&ajuste in a browser with the camera (localhost:8126) shows a panel with each
// piece's numbers, live on him: its size, place and turn, the parts it takes (and the names of the model's), his
// hair, face and hands, the hat's place; and the keyboard (arrows move the piece, PgUp/PgDn forwards and back, + −
// its size, [ ] turn it, Shift 5×). Start with modo, url and cabeca: {} or ombros: {}, fit it, then "Copiar" copies
// the finished entry: paste it here in place of the one it started from.
//
// Check it on his face with the headless test and a live's camera clip (README.md beside this file, "Check it").
// (Phoenix's, Sova's and Sage's are still in filtros.html's AGENTS; an entry here with the same id takes their place.)
// Celeste 64's Madeline and Badeline (EXOK's public repository, Content/Models; non-commercial fan use, not made or
// endorsed by the Celeste team): her fringe and crown on his head, in her idle pose (the rest left out: her chibi
// jacket can't fit him). The hair is white in the file: `cores` paints it as the game does; the long hair and the jacket
// are drawn by the Celeste filter after the game's art, which also turns Madeline's colour with the dashes.
const CELESTE64 = {
  modo: "fixo",
  pose: "Idle",
  rostoPorCima: false,
  cabeca: { partes: /Hair/, tamanho: 21, posicao: [0, 8.8, -2] },
}
export const VISUAIS = {
  celeste: { ...CELESTE64, url: "privado/celeste/player.glb", cores: { Hair: "#db2c00" } },
  badeline: { ...CELESTE64, url: "privado/celeste/badeline.glb", cores: { Hair: "#9b3fb5" } },
}
