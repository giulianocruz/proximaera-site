"""Testes offline para relatório privado de downloads; sem acessar logs reais."""
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "ops" / "retro-download-report.py"
spec = importlib.util.spec_from_file_location("retro_download_report", SCRIPT)
report = importlib.util.module_from_spec(spec)
spec.loader.exec_module(report)

MANIFEST = {
    "version": "0.3.21", "channel": "beta",
    "files": {
        "android": {"name": "ProximaEraRetro-v0.3.21-debug.apk", "size_bytes": 4261704},
        "windows": {"name": "ProximaEraRetro-Windows-Portable-v0.3.21.zip", "size_bytes": 121020402}
    }
}
A = "ProximaEraRetro-v0.3.21-debug.apk"
W = "ProximaEraRetro-Windows-Portable-v0.3.21.zip"


def nginx(method, route, status, size):
    # IP/referer são dados no input de teste, mas NUNCA retornam no relatório.
    return (f'192.0.2.123 - - [13/Nov/2026:17:30:00 +0000] '
            f'"{method} {route} HTTP/1.1" {status} {size} '
            '"https://exemplo.test/?email=privado@exemplo.test" "Browser-X"')


class RetroDownloadReportTest(unittest.TestCase):
    def setUp(self):
        self.expected = report.latest_files(MANIFEST)

    def test_complete_android_windows_and_partial(self):
        lines = [
            nginx("GET", "/downloads/"+A+"?src=catalogo", 200, 4261704),
            nginx("GET", "/downloads/"+W, 200, 121020402),
            nginx("GET", "/downloads/"+W, 206, 1048576),
            nginx("GET", "/downloads/"+A, 200, 1000),
            nginx("HEAD", "/downloads/"+A, 200, 4261704),
            nginx("GET", "/assets/site.css", 200, 1234),
            nginx("GET", "/downloads/missing.txt", 200, 100)
        ]
        output = report.scan("\n".join(lines), self.expected)
        self.assertEqual(output["http_requests_parsed"], 7)
        self.assertEqual(output["binary_gets_observed"], 4)
        self.assertEqual(output["counts"]["android/complete_response_probable"], 1)
        self.assertEqual(output["counts"]["windows/complete_response_probable"], 1)
        self.assertEqual(output["counts"]["windows/partial_range"], 1)
        self.assertEqual(output["counts"]["android/incomplete_or_interrupted"], 1)
        serialized = json.dumps(output)
        self.assertNotIn("192.0.2.123", serialized)
        self.assertNotIn("privado@exemplo.test", serialized)
        self.assertNotIn("Browser-X", serialized)

    def test_old_version_separate_unknown_and_query_stripped(self):
        text = nginx("GET", "/downloads/ProximaEraRetro-v0.3.20-debug.apk?src=teste", 200, 4261704)
        output = report.scan(text, self.expected)
        self.assertEqual(output["counts"]["android/older_or_unknown_http_200"], 1)
        self.assertNotIn("android/complete_response_probable", output["counts"])

    def test_manifest_must_have_expected_safe_files_and_sizes(self):
        expected = report.latest_files(MANIFEST)
        self.assertEqual(expected[A], ("android", 4261704))
        bad = {"files": {"android":{"name":"../../bad.apk","size_bytes":4261704},
                         "windows":MANIFEST["files"]["windows"]}}
        with self.assertRaises(ValueError):
            report.latest_files(bad)
        bad2 = {"files": {"android":{"name":A,"size_bytes":0},
                          "windows":MANIFEST["files"]["windows"]}}
        with self.assertRaises(ValueError):
            report.latest_files(bad2)

    def test_no_log_data_means_no_claims(self):
        empty = report.scan("",self.expected)
        self.assertEqual(empty["http_requests_parsed"],0)
        self.assertEqual(empty["binary_gets_observed"],0)
        self.assertEqual(empty["counts"],{})


if __name__ == "__main__":
    unittest.main()
