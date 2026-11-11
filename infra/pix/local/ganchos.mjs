// The resolve hook registrar.mjs installs: every @aws-sdk package index.mjs imports resolves to aws.mjs.

const FALSO = new URL("./aws.mjs", import.meta.url).href
const PACOTES = new Set(["@aws-sdk/client-dynamodb", "@aws-sdk/lib-dynamodb", "@aws-sdk/client-s3", "@aws-sdk/client-lambda"])

export async function resolve(especificador, contexto, proximo) {
  if (PACOTES.has(especificador)) return { url: FALSO, shortCircuit: true }
  return proximo(especificador, contexto)
}
