// node --import ./infra/pix/local/registrar.mjs …: the @aws-sdk packages that index.mjs imports become aws.mjs, in
// memory (they're Lambda's own, not the site's dependencies). Used by index.test.mjs and servidor.mjs.

import { register } from "node:module"

register("./ganchos.mjs", import.meta.url)
