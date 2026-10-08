# Branch `ziptv2`

Fork di [iptv-org/epg](https://github.com/iptv-org/epg) usato dal backbone EPG di
ZipTv2 (`ToRvaLDz/ziptv2`, `infra/epg/`). Il branch è **upstream master + i nostri
commit**; tutto il resto viene da upstream.

- **Immagine**: `ghcr.io/torvaldz/epg:ziptv2` (+ tag `ziptv2-<upstream>-<nostro>`),
  costruita da `.ziptv2/Dockerfile` dal workflow `ziptv2 image`: ogni notte alle
  01:00 UTC, a ogni push su `ziptv2`, o a mano (`workflow_dispatch`).
- **Rebase**: il workflow ribasa il branch su upstream solo nel job (non lo pusha).
  Se va in conflitto o i test dei siti patchati falliscono, il job fallisce e resta
  l'ultima immagine buona. Ogni tanto riallinea a mano:
  `git fetch upstream && git rebase upstream/master && git push --force-with-lease`.
- **Patch**: un commit per sito, con test jest nel `*.test.js` del sito. Quando un
  fix viene accettato upstream, il rebase lo assorbe e il nostro commit sparisce.
- I workflow upstream (`check`, `docker-publish`, `format`, `update`) sono
  disabilitati su questo fork.

Patch attuali:

| Sito | Cosa | Perché |
|---|---|---|
| `guidatv.sky.it` | immagine 16:9 (`background`/`scene`) invece della cover verticale; titolo = nome serie, episodio in `<sub-title>` | backdrop della schermata Live (ziptv2#340) |
