# live: Pix donations on stream

Viewers send a Pix straight to your own account and their message pops up on
stream. No payment provider and no fees: your phone tells this app when a Pix
lands, and the app matches it to the donation waiting for that amount.

```
viewer ── donation page (:4100) ── QR code for the exact amount
                                         │ pays with their bank app
your bank app ── "Pix recebido" notification on the phone
phone ── forwarder app ── POST :4101/api/notifications ── match ── overlay alert (OBS)
```

Everything runs on this machine; donations and payers are kept in
`live/data/donations.json`, which git ignores.

## Run

1. `cp live/.env.example live/.env` and fill it in. Use a random Pix key
   (chave aleatória): the QR code carries the key, so a CPF, e-mail or phone
   key would be visible to anyone who donates.
2. `pnpm live`. macOS asks whether node may accept incoming connections:
   allow it, or the phone can't reach the app.

| What | Where |
|---|---|
| Donation page | http://localhost:4100 |
| Overlay | http://localhost:4101/overlay (`?voz=1` reads messages aloud) |
| Studio | http://localhost:4101/studio |

The studio lists Pix that found no donation (none waiting for that amount, or
more than one), so you can link them, alert them as anonymous or ignore them.
It also simulates a Pix, to test without money.

## OBS

Add a **Browser** source with the overlay URL, 1920×1080. It is transparent
until a Pix arrives. With `?voz=1`, tick *Control audio via OBS* to hear it.

## The phone

Any app that forwards notifications to a URL works, e.g.
[Notification Forwarder](https://github.com/ItsAzni/NotificationForwarder):

- URL: `http://<this Mac's LAN IP>:4101/api/notifications` (`ipconfig getifaddr en0`;
  reserve the IP in the router so it doesn't change).
- Method `POST`, header `Authorization: Bearer <PHONE_TOKEN>`.
- Only the bank's app (Inter). The body can be any JSON; the app looks for
  the Pix sentence in every text field.
- Samsung: Settings → Battery → Background usage limits → *Never sleeping apps*,
  add the forwarder, or One UI kills it.

Notifications the app understands are listed in `notification.ts`; add a
pattern there for another bank.

## Who can reach what

- `:4100`, the donation page, listens on localhost only. To let viewers in,
  put a tunnel in front of it (not set up yet).
- `:4101` listens on the LAN for the phone, but only
  `/api/notifications` (with the token) answers anyone but this machine.

## Not built yet

- Exposing the donation page to viewers, and `muanlartins.com.br/pix`.
- The donor wall on the site. `GET :4101/api/wall` already returns it: paid
  donations whose donors opted in, minus hidden ones, never the payer's name.
