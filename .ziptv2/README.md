# Branch `ziptv2`

Fork di [iptv-org/epg](https://github.com/iptv-org/epg) usato dal backbone EPG di
ZipTv2 (`ToRvaLDz/ziptv2`, `infra/epg/`). Il branch è **upstream master + i nostri
commit**; tutto il resto viene da upstream. `ziptv2` è l'ultima versione
**approvata**; `ziptv2-next` è il candidato in prova.

## Aggiornamento: candidato testato + promozione via PR (ziptv2#590)

Il workflow `ziptv2 image` gira ogni notte alle 01:00 UTC, a ogni push su
`ziptv2` e a mano (`workflow_dispatch`, `force` ripropone un candidato già
rifiutato):

1. **Riferimento upstream**: upstream non ha tag, si usa l'ultimo commit di
   master più vecchio di 7 giorni (`COOLDOWN_DAYS`), così i fix urgenti hanno
   tempo di arrivare.
2. **Candidato**: rebase di `ziptv2` su quel commit, pushato su `ziptv2-next`.
   Conflitto → issue «Rebase di ziptv2 su upstream in conflitto» con i file
   coinvolti (una sola aperta, i run successivi commentano lì).
3. **Test**: jest dei siti patchati + **grab di prova** di 1 giorno sui canali
   curati di ziptv2 (`infra/epg/channels.xml`), lanciato con l'immagine di
   produzione e con la candidata sullo stesso runner. `epg_coverage.py`
   boccia il candidato se perde canali con programmi (`MAX_CHANNEL_LOSS`,
   default 0) o se i programmi calano oltre `MAX_PROGRAMME_LOSS_PCT` (default 2%).
   Log e guide finiscono nell'artifact `grab-di-prova`.
4. **Immagine**: push del solo tag di revision
   `ghcr.io/torvaldz/ziptv2-epg:ziptv2-<upstream>-<nostro>` (niente build se è già
   su ghcr). Le label `io.ziptv2.candidate` / `io.ziptv2.base` /
   `io.ziptv2.upstream` portano gli SHA completi.
5. **PR in ziptv2** (branch `epg-candidate/<tag>`): aggiorna l'immagine in
   `infra/epg/docker-compose.yml` e riporta l'esito del grab. Una PR nuova chiude
   quelle dei candidati precedenti.
6. **Merge** = promozione; il redeploy su Margie resta manuale. Al run successivo
   `ziptv2` avanza al candidato promosso (solo se nel frattempo non sono arrivati
   commit nuovi su `ziptv2`: in quel caso li porterà il prossimo candidato) e
   l'alias `:ziptv2` passa alla stessa immagine.
7. **Rifiuto** = chiudere la PR: la stessa revision non viene riproposta, la
   prossima arriva quando upstream (o `ziptv2`) avanza.

Il job non fa nulla se il candidato coincide con la produzione o se la sua PR
esiste già.

**Segreto** `ZIPTV2_TOKEN`: fine-grained PAT su `ToRvaLDz/ziptv2` con Contents e
Pull requests in scrittura (lettura del compose e dei canali, apertura delle PR).

## Patch

Un commit per sito, con test jest nel `*.test.js` del sito. Quando un fix viene
accettato upstream, il rebase lo assorbe e il nostro commit sparisce. Per
cambiarne una: commit su `ziptv2` (il push avvia subito un candidato).

I workflow upstream (`check`, `docker-publish`, `format`, `update`) sono
disabilitati su questo fork.

| Sito | Cosa | Perché |
|---|---|---|
| `guidatv.sky.it` | immagine 16:9 (`background`/`scene`) invece della cover verticale; titolo = nome serie, episodio in `<sub-title>` | backdrop della schermata Live (ziptv2#340) |
