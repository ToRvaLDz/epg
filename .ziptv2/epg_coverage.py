"""Confronto di copertura fra la guida di produzione e quella del candidato.

Il workflow `ziptv2 image` lancia lo stesso grab di prova (canali curati di
ziptv2, 1 giorno) con l'immagine di produzione e con quella candidata, poi
chiama questo script: il candidato è bocciato se perde canali con programmi o
se il numero di programmi cala oltre la soglia.

Uso:
  python3 epg_coverage.py PROD.xml CANDIDATO.xml [--report report.md]
          [--prod-label ...] [--candidate-label ...]
Soglie da env: MAX_CHANNEL_LOSS (default 0), MAX_PROGRAMME_LOSS_PCT (default 2).
Exit 0 = promosso, 1 = bocciato.
"""

import argparse
import os
import sys
import xml.etree.ElementTree as ET
from collections import Counter
from dataclasses import dataclass, field
from typing import Dict, List

DEFAULT_MAX_CHANNEL_LOSS = 0
DEFAULT_MAX_PROGRAMME_LOSS_PCT = 2.0


@dataclass(frozen=True)
class Result:
    prod: Dict[str, int]
    candidate: Dict[str, int]
    lost: List[str] = field(default_factory=list)
    gained: List[str] = field(default_factory=list)
    reasons: List[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.reasons


def count_programmes(path: str) -> Dict[str, int]:
    """Programmi per canale; un file assente (grab fallito) vale guida vuota."""
    if not os.path.exists(path):
        return {}
    counts: Counter = Counter()
    # iterparse: la guida può pesare decine di MB, niente albero intero in memoria
    for _, elem in ET.iterparse(path, events=("end",)):
        if elem.tag == "programme":
            counts[elem.get("channel", "")] += 1
            elem.clear()
    return dict(counts)


def compare(
    prod: Dict[str, int],
    candidate: Dict[str, int],
    max_channel_loss: int = DEFAULT_MAX_CHANNEL_LOSS,
    max_programme_loss_pct: float = DEFAULT_MAX_PROGRAMME_LOSS_PCT,
) -> Result:
    lost = sorted(set(prod) - set(candidate))
    gained = sorted(set(candidate) - set(prod))
    prod_total = sum(prod.values())
    cand_total = sum(candidate.values())
    reasons = []
    if not prod:
        reasons.append("il grab di produzione non ha portato programmi: manca il termine di confronto")
    if not candidate:
        reasons.append("il grab del candidato non ha portato programmi")
    if len(lost) > max_channel_loss:
        reasons.append(f"{len(lost)} canali persi (tollerati {max_channel_loss})")
    if prod_total and cand_total < prod_total * (1 - max_programme_loss_pct / 100):
        drop = 100 * (prod_total - cand_total) / prod_total
        reasons.append(f"programmi in calo del {drop:.1f}% (tollerato {max_programme_loss_pct:g}%)")
    return Result(prod=prod, candidate=candidate, lost=lost, gained=gained, reasons=reasons)


def render_report(result: Result, prod_label: str, candidate_label: str) -> str:
    verdict = "✅ promosso" if result.ok else "❌ bocciato"
    lines = [
        f"### Grab di prova: {verdict}",
        "",
        f"| | Produzione (`{prod_label}`) | Candidato (`{candidate_label}`) |",
        "|---|---|---|",
        f"| Canali con programmi | {len(result.prod)} | {len(result.candidate)} |",
        f"| Programmi | {sum(result.prod.values())} | {sum(result.candidate.values())} |",
    ]
    if result.reasons:
        lines += ["", "**Motivi:**"] + [f"- {r}" for r in result.reasons]
    if result.lost:
        lines += ["", "**Canali persi:** " + ", ".join(f"`{c}`" for c in result.lost)]
    if result.gained:
        lines += ["", "**Canali guadagnati:** " + ", ".join(f"`{c}`" for c in result.gained)]
    return "\n".join(lines) + "\n"


def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("prod")
    parser.add_argument("candidate")
    parser.add_argument("--report")
    parser.add_argument("--prod-label", default="produzione")
    parser.add_argument("--candidate-label", default="candidato")
    args = parser.parse_args(argv)

    result = compare(
        count_programmes(args.prod),
        count_programmes(args.candidate),
        max_channel_loss=int(os.environ.get("MAX_CHANNEL_LOSS", DEFAULT_MAX_CHANNEL_LOSS)),
        max_programme_loss_pct=float(
            os.environ.get("MAX_PROGRAMME_LOSS_PCT", DEFAULT_MAX_PROGRAMME_LOSS_PCT)
        ),
    )
    report = render_report(result, args.prod_label, args.candidate_label)
    if args.report:
        with open(args.report, "w", encoding="utf-8") as f:
            f.write(report)
    print(report)
    return 0 if result.ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
