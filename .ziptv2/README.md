# Branch `ziptv2`

Fork di [iptv-org/epg](https://github.com/iptv-org/epg) usato dal backbone EPG di
ZipTv2 (`ToRvaLDz/ziptv2`, `infra/epg/`). Il branch è **upstream master + i nostri
commit**; tutto il resto viene da upstream. `ziptv2` è l'ultima versione
**approvata**; `ziptv2-next` è il candidato in prova.

## Aggiornamento: candidato testato + promozione automatica (ziptv2#590, ziptv2#660)

Il workflow `ziptv2 image` gira ogni notte alle 01:00 UTC, a ogni push su
`ziptv2` e a mano (`workflow_dispatch`):

1. **Riferimento upstream**: upstream non ha tag, si usa l'ultimo commit di
   master più vecchio di 7 giorni (`COOLDOWN_DAYS`), così i fix urgenti hanno
   tempo di arrivare.
2. **Candidato**: rebase di `ziptv2` su quel commit, pushato su `ziptv2-next`.
   Conflitto → issue «Rebase di ziptv2 su upstream in conflitto» con i file
   coinvolti (una sola aperta, i run successivi commentano lì).
3. **Test**: jest dei siti patchati + **grab di prova** di 1 giorno sui canali
   curati di ziptv2 (`infra/epg/channels.xml`), lanciato con l'immagine di
   produzione (`:ziptv2`) e con la candidata sullo stesso runner.
   `epg_coverage.py` boccia il candidato se perde canali con programmi
   (`MAX_CHANNEL_LOSS`, default 0) o se i programmi calano oltre
   `MAX_PROGRAMME_LOSS_PCT` (default 2%). Log e guide finiscono nell'artifact
   `grab-di-prova`, l'esito nel riepilogo del run.
4. **Promozione automatica** se i test passano: push del tag di revision
   `ghcr.io/torvaldz/ziptv2-epg:ziptv2-<upstream>-<nostro>` (niente build se è già
   su ghcr), l'alias **`:ziptv2` passa alla candidata** e `ziptv2` avanza al
   candidato. Le label `io.ziptv2.candidate` / `io.ziptv2.base` /
   `io.ziptv2.upstream` portano gli SHA completi.
5. **Produzione**: lo stack `ziptv2-epg` su Margie usa `:ziptv2`; il pull
   dell'immagine nuova lo fa il sistema di aggiornamento delle immagini di
   Margie, non questo workflow.

Un candidato bocciato non sposta nulla: la produzione resta sull'ultima
versione buona e il candidato viene riprovato al run successivo. Il job non fa
nulla se il candidato coincide con la produzione.

**Tornare indietro**: `docker buildx imagetools create -t
ghcr.io/torvaldz/ziptv2-epg:ziptv2 ghcr.io/torvaldz/ziptv2-epg:<revision buona>` e
aggiungere la revision scartata alla variabile del repo `EPG_HOLD_TAGS` (tag
separati da spazi), altrimenti il run successivo la ripromuove.

**Segreto** `ZIPTV2_TOKEN`: fine-grained PAT su `ToRvaLDz/ziptv2` con Contents in
lettura (canali curati).

## Patch

Un commit per sito, con test jest nel `*.test.js` del sito. Quando un fix viene
accettato upstream, il rebase lo assorbe e il nostro commit sparisce. Per
cambiarne una: commit su `ziptv2` (il push avvia subito un candidato).

I workflow upstream (`check`, `docker-publish`, `format`, `update`) sono
disabilitati su questo fork.

| Sito | Cosa | Perché |
|---|---|---|
| `guidatv.sky.it` | immagine 16:9 (`background`/`scene`) invece della cover verticale; titolo = nome serie, episodio in `<sub-title>` | backdrop della schermata Live (ziptv2#340) |
