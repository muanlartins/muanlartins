// The AWS SDK, in memory, for running the Pix API on a laptop: index.test.mjs and servidor.mjs (the local stand-in).
// registrar.mjs points the four @aws-sdk packages index.mjs imports here. Only what index.mjs uses: DynamoDB's
// Get/Put/Delete/Query/Update with their condition and update expressions, an S3 put, and Lambda's async invoke
// (the function invoking itself for a song), retried twice on a throw as Lambda does. Not in the Lambda's zip.

export const local = (globalThis.__pixLocal ??= {
  itens: new Map(), // "<table>|<key>" → item
  arquivos: new Map(), // S3 key → { corpo, tipo }
  invocar: async () => {}, // set by whoever runs the handler: (payload) => handler(payload)
  rodando: new Set(), // async invocations in flight, so a test can wait for them
  tentativasExtras: 2,
})

/** Waits for every async invocation (and the ones they start). */
export async function esperar() {
  while (local.rodando.size) await Promise.allSettled([...local.rodando])
}

const copia = (x) => (x === undefined ? undefined : structuredClone(x))
const chaveDe = (tabela, key) => `${tabela}|${JSON.stringify(Object.keys(key).sort().map((k) => [k, key[k]]))}`
const chaveDoItem = (item) => (item.pk !== undefined ? { pk: item.pk, sk: item.sk } : { login: item.login })

function falhou() {
  const e = new Error("The conditional request failed")
  e.name = "ConditionalCheckFailedException"
  return e
}

// --- Expressions ------------------------------------------------------------------------------------------

function caminho(texto, nomes) {
  return texto
    .trim()
    .split(".")
    .map((parte) => (parte.startsWith("#") ? nomes[parte] : parte))
}
function pegar(item, partes) {
  let v = item
  for (const p of partes) v = v == null ? undefined : v[p]
  return v
}
function por(item, partes, valor) {
  let v = item
  for (const p of partes.slice(0, -1)) v = v[p] ??= {}
  v[partes.at(-1)] = valor
}
function tirar(item, partes) {
  const pai = pegar(item, partes.slice(0, -1))
  if (pai && typeof pai === "object") delete pai[partes.at(-1)]
}

/** A condition: attribute_exists/attribute_not_exists, = <> < <= > >=, AND, OR, NOT, parentheses. */
function condicao(expr, item, nomes = {}, valores = {}) {
  const tokens = expr.match(/attribute_not_exists|attribute_exists|<>|<=|>=|[()=<>,]|[#:\w.]+/g) ?? []
  let i = 0
  const olhar = () => tokens[i]
  const comer = (t) => {
    if (t && tokens[i] !== t) throw new Error(`esperava ${t} em ${expr}`)
    return tokens[i++]
  }
  const operando = (t) => (t.startsWith(":") ? valores[t] : pegar(item, caminho(t, nomes)))
  function primario() {
    const t = comer()
    if (t === "(") {
      const v = ou()
      comer(")")
      return v
    }
    if (t === "NOT") return !primario()
    if (t === "attribute_exists" || t === "attribute_not_exists") {
      comer("(")
      const alvo = comer()
      const v = item ? pegar(item, caminho(alvo, nomes)) : undefined
      comer(")")
      return t === "attribute_exists" ? v !== undefined : v === undefined
    }
    const a = operando(t)
    const op = comer()
    const b = operando(comer())
    if (a === undefined || b === undefined) return op === "<>" ? a !== b : false
    return { "=": a === b, "<>": a !== b, "<": a < b, "<=": a <= b, ">": a > b, ">=": a >= b }[op]
  }
  function e() {
    let v = primario()
    while (olhar() === "AND") {
      comer()
      v = primario() && v
    }
    return v
  }
  function ou() {
    let v = e()
    while (olhar() === "OR") {
      comer()
      v = e() || v
    }
    return v
  }
  return ou()
}

/** SET a = :v, b.c = :w · ADD n :um · REMOVE x, y.z (values only, no functions: all index.mjs writes). */
function atualizar(item, expr, nomes = {}, valores = {}) {
  const clausulas = expr.split(/\b(SET|ADD|REMOVE)\b/).filter((s) => s.trim())
  for (let i = 0; i < clausulas.length; i += 2) {
    const tipo = clausulas[i]
    const corpo = clausulas[i + 1].split(",").map((s) => s.trim()).filter(Boolean)
    for (const parte of corpo) {
      if (tipo === "SET") {
        const [alvo, valor] = parte.split("=").map((s) => s.trim())
        por(item, caminho(alvo, nomes), copia(valor.startsWith(":") ? valores[valor] : pegar(item, caminho(valor, nomes))))
      } else if (tipo === "ADD") {
        const [alvo, valor] = parte.split(/\s+/)
        const partes = caminho(alvo, nomes)
        por(item, partes, (pegar(item, partes) ?? 0) + valores[valor])
      } else tirar(item, caminho(parte, nomes))
    }
  }
}

// --- The SDK's shapes ---------------------------------------------------------------------------------------

class Comando {
  constructor(input) {
    this.input = input
  }
}
export class GetCommand extends Comando {}
export class PutCommand extends Comando {}
export class DeleteCommand extends Comando {}
export class QueryCommand extends Comando {}
export class UpdateCommand extends Comando {}
export class PutObjectCommand extends Comando {}
export class InvokeCommand extends Comando {}

export class DynamoDBClient {}

const documentos = {
  async send({ constructor: tipo, input: c }) {
    const nomes = c.ExpressionAttributeNames
    const valores = c.ExpressionAttributeValues
    if (tipo === GetCommand) return { Item: copia(local.itens.get(chaveDe(c.TableName, c.Key))) }
    if (tipo === PutCommand) {
      const k = chaveDe(c.TableName, chaveDoItem(c.Item))
      if (c.ConditionExpression && !condicao(c.ConditionExpression, local.itens.get(k), nomes, valores)) throw falhou()
      local.itens.set(k, copia(JSON.parse(JSON.stringify(c.Item))))
      return {}
    }
    if (tipo === DeleteCommand) {
      const k = chaveDe(c.TableName, c.Key)
      if (c.ConditionExpression && !condicao(c.ConditionExpression, local.itens.get(k), nomes, valores)) throw falhou()
      local.itens.delete(k)
      return {}
    }
    if (tipo === UpdateCommand) {
      const k = chaveDe(c.TableName, c.Key)
      const antes = local.itens.get(k)
      if (c.ConditionExpression && !condicao(c.ConditionExpression, antes, nomes, valores)) throw falhou()
      const item = copia(antes) ?? { ...c.Key }
      atualizar(item, c.UpdateExpression, nomes, valores)
      local.itens.set(k, item)
      return { Attributes: copia(item) }
    }
    if (tipo === QueryCommand) {
      const prefixo = `${c.TableName}|`
      const itens = [...local.itens.entries()]
        .filter(([k]) => k.startsWith(prefixo))
        .map(([, v]) => v)
        .filter((v) => condicao(c.KeyConditionExpression, v, nomes, valores))
        .sort((a, b) => (a.sk < b.sk ? -1 : a.sk > b.sk ? 1 : 0))
      if (c.ScanIndexForward === false) itens.reverse()
      return { Items: copia(c.Limit ? itens.slice(0, c.Limit) : itens) }
    }
    throw new Error(`comando desconhecido: ${tipo.name}`)
  },
}
export const DynamoDBDocumentClient = { from: () => documentos }

export class S3Client {
  async send({ input: c }) {
    local.arquivos.set(c.Key, { corpo: Buffer.from(c.Body), tipo: c.ContentType })
    return {}
  }
}

/** InvocationType Event: runs later, and runs again (twice at most) when it throws, as Lambda does. */
export class LambdaClient {
  async send({ input: c }) {
    const payload = JSON.parse(Buffer.from(c.Payload).toString())
    const vez = (async () => {
      await new Promise((r) => setImmediate(r))
      for (let tentativa = 0; tentativa <= local.tentativasExtras; tentativa++) {
        try {
          return await local.invocar(payload)
        } catch (e) {
          if (tentativa === local.tentativasExtras) console.error("lambda local: desistiu", e.message)
        }
      }
    })()
    local.rodando.add(vez)
    vez.finally(() => local.rodando.delete(vez))
    return { StatusCode: 202 }
  }
}
