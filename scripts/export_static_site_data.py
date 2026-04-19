#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
API_DIR = ROOT_DIR / "api"
OUTPUT_DIR = ROOT_DIR / "static-data"
PREDICT_DIR = OUTPUT_DIR / "predict"
WAVEFORMS_DIR = OUTPUT_DIR / "waveforms"

sys.path.insert(0, str(API_DIR))

from test_data_service import (  # noqa: E402
    aggregate_outcomes,
    build_input_payload,
    get_reference_outcomes,
    list_tests,
)


def export_static_site_data() -> None:
    tests = list_tests(limit=100000)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    PREDICT_DIR.mkdir(parents=True, exist_ok=True)
    WAVEFORMS_DIR.mkdir(parents=True, exist_ok=True)

    (OUTPUT_DIR / "tests.json").write_text(
        json.dumps(tests, ensure_ascii=False),
        encoding="utf-8",
    )

    for test in tests:
        record_id = str(test["record_id"])

        payload = build_input_payload(record_id)
        waveforms = payload.get("waveforms", [])
        sample_rate = waveforms[0].get("sampleRate", 0) if waveforms else 0
        waveforms_payload = {
            "record_id": record_id,
            "sample_rate": sample_rate,
            "waveforms": waveforms,
        }
        (WAVEFORMS_DIR / f"{record_id}.json").write_text(
            json.dumps(waveforms_payload, ensure_ascii=False),
            encoding="utf-8",
        )

        raw_outcomes = get_reference_outcomes(record_id)
        predict_payload = {
            "record_id": record_id,
            "status": "success",
            "metadata": {
                "age": test.get("age"),
                "sex": test.get("sex"),
                "source": "static-data",
            },
            "raw_outcomes": raw_outcomes,
            "tree_outcomes": aggregate_outcomes(raw_outcomes),
        }
        (PREDICT_DIR / f"{record_id}.json").write_text(
            json.dumps(predict_payload, ensure_ascii=False),
            encoding="utf-8",
        )

    print(f"Exported {len(tests)} tests to {OUTPUT_DIR}")


if __name__ == "__main__":
    export_static_site_data()
