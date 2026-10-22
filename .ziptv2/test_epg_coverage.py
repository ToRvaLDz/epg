"""Test del confronto di copertura fra la guida di produzione e quella candidata."""

import os
import tempfile
import unittest

from epg_coverage import compare, count_programmes, render_report


def guide(programmes):
    """XMLTV minimo: {channel_id: numero di programmi}."""
    rows = ['<?xml version="1.0" encoding="UTF-8"?>', "<tv>"]
    for channel, n in programmes.items():
        rows.append(f'<channel id="{channel}"><display-name>{channel}</display-name></channel>')
        for i in range(n):
            rows.append(
                f'<programme start="2026102200{i:02d}00 +0000" stop="2026102200{i:02d}30 +0000" '
                f'channel="{channel}"><title>P{i}</title></programme>'
            )
    rows.append("</tv>")
    return "\n".join(rows)


class CountProgrammesTest(unittest.TestCase):
    def write(self, text):
        fd, path = tempfile.mkstemp(suffix=".xml")
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(text)
        self.addCleanup(os.remove, path)
        return path

    def test_conta_i_programmi_per_canale(self):
        path = self.write(guide({"Rai1.it@SD": 3, "Rai2.it@SD": 0, "BBCOne.uk@HD": 1}))
        self.assertEqual(count_programmes(path), {"Rai1.it@SD": 3, "BBCOne.uk@HD": 1})

    def test_file_mancante_vale_guida_vuota(self):
        self.assertEqual(count_programmes("/non/esiste/guide.xml"), {})


class CompareTest(unittest.TestCase):
    def test_copertura_uguale_passa(self):
        result = compare({"A": 10, "B": 5}, {"A": 10, "B": 5})
        self.assertTrue(result.ok)
        self.assertEqual(result.lost, [])

    def test_canale_perso_boccia(self):
        result = compare({"A": 10, "B": 5}, {"A": 10})
        self.assertFalse(result.ok)
        self.assertEqual(result.lost, ["B"])

    def test_canale_guadagnato_non_compensa_quello_perso(self):
        result = compare({"A": 10, "B": 5}, {"A": 10, "C": 50})
        self.assertFalse(result.ok)
        self.assertEqual(result.gained, ["C"])

    def test_calo_di_programmi_oltre_la_soglia_boccia(self):
        result = compare({"A": 100}, {"A": 90}, max_programme_loss_pct=2)
        self.assertFalse(result.ok)

    def test_calo_di_programmi_entro_la_soglia_passa(self):
        result = compare({"A": 100}, {"A": 99}, max_programme_loss_pct=2)
        self.assertTrue(result.ok)

    def test_tolleranza_sui_canali_persi(self):
        result = compare({"A": 10, "B": 5}, {"A": 10}, max_channel_loss=1, max_programme_loss_pct=50)
        self.assertTrue(result.ok)

    def test_produzione_vuota_boccia(self):
        # Il grab di produzione non ha portato nulla: non c'è un termine di
        # confronto, quindi il candidato non si promuove alla cieca.
        result = compare({}, {"A": 10})
        self.assertFalse(result.ok)

    def test_candidato_vuoto_boccia(self):
        result = compare({"A": 10}, {})
        self.assertFalse(result.ok)


class RenderReportTest(unittest.TestCase):
    def test_il_report_riporta_esito_e_numeri(self):
        result = compare({"A": 10, "B": 5}, {"A": 9})
        report = render_report(result, prod_label="prod", candidate_label="cand")
        self.assertIn("bocciato", report)
        self.assertIn("| Canali con programmi | 2 | 1 |", report)
        self.assertIn("| Programmi | 15 | 9 |", report)
        self.assertIn("`B`", report)

    def test_report_promosso(self):
        report = render_report(compare({"A": 1}, {"A": 1}), prod_label="p", candidate_label="c")
        self.assertIn("promosso", report)


if __name__ == "__main__":
    unittest.main()
