// The profile API: each viewer's things on the site, under their Twitch login. The routes and the table's fields are in
// rotas.mjs; this file only gives them DynamoDB. Deployed by CI (.github/workflows/deploy.yml) into the function
// infra/site.yml creates; the code there is the first version, kept only as what answered before CI's deploy.

import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { BatchGetCommand, DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb"
import { usuario } from "./comum/twitch.mjs"
import { rotas } from "./rotas.mjs"

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}), { marshallOptions: { removeUndefinedValues: true } })
const T = process.env.TABLE

const banco = {
  async ler(login) {
    return (await db.send(new GetCommand({ TableName: T, Key: { login } }))).Item ?? null
  },
  async varios(logins) {
    const r = await db.send(new BatchGetCommand({ RequestItems: { [T]: { Keys: logins.map((login) => ({ login })) } } }))
    return r.Responses?.[T] || []
  },
  // Each field on its own, so saving the fan never erases the loadout and the other way round.
  async definir(login, campos) {
    const nomes = Object.keys(campos)
    await db.send(
      new UpdateCommand({
        TableName: T,
        Key: { login },
        UpdateExpression: "SET " + nomes.map((_, n) => `#c${n} = :v${n}`).join(", "),
        ExpressionAttributeNames: Object.fromEntries(nomes.map((nome, n) => [`#c${n}`, nome])),
        ExpressionAttributeValues: Object.fromEntries(nomes.map((nome, n) => [`:v${n}`, campos[nome]])),
      }),
    )
  },
  async remover(login, nomes) {
    await db.send(
      new UpdateCommand({
        TableName: T,
        Key: { login },
        ConditionExpression: "attribute_exists(login)",
        UpdateExpression: "REMOVE " + nomes.map((_, n) => `#c${n}`).join(", "),
        ExpressionAttributeNames: Object.fromEntries(nomes.map((nome, n) => [`#c${n}`, nome])),
      }),
    ).catch((e) => {
      if (e.name !== "ConditionalCheckFailedException") throw e
    })
  },
}

export const handler = rotas({ banco, usuario, chave: process.env.CHAVE })
