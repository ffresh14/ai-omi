from __future__ import annotations

import base64
import csv
from pathlib import Path
from typing import Any, Dict, List, Optional, TypedDict

import numpy as np


LEAD_ORDER = ["I", "II", "V1", "V2", "V3", "V4", "V5", "V6"]
OUTCOME_KEYS = [
    "control_nomyoperi",
    "control_myoperi",
    "mi_nstemi_nonomi",
    "mi_stemi_nonomi",
    "mi_nstemi_omi_lmca_lad",
    "mi_nstemi_omi_lcx",
    "mi_nstemi_omi_rca",
    "mi_stemi_omi_lmca_lad",
    "mi_stemi_omi_lcx",
    "mi_stemi_omi_rca",
    "lbbb",
]

API_DIR = Path(__file__).resolve().parent
WORKSPACE_DIR = API_DIR.parent
DATA_DIR = WORKSPACE_DIR / "top_ecg_data"
METADATA_PATH = DATA_DIR / "top_metadata.csv"


class SignalHeader(TypedDict):
    dat_file: str
    gain: float
    baseline: float
    lead: str


_metadata_cache: Optional[List[Dict[str, str]]] = None


def _to_int_str(record_id: str) -> str:
    return str(int(record_id))


def load_metadata_rows() -> List[Dict[str, str]]:
    global _metadata_cache
    if _metadata_cache is not None:
        return _metadata_cache

    rows: List[Dict[str, str]] = []
    with METADATA_PATH.open("r", newline="") as file:
        reader = csv.DictReader(file)
        for row in reader:
            rows.append(row)

    _metadata_cache = rows
    return rows


def list_tests(limit: int = 200) -> List[Dict[str, Any]]:
    unique: Dict[str, Dict[str, str]] = {}
    for row in load_metadata_rows():
        record_id = _to_int_str(row["id_record"])
        if record_id not in unique:
            unique[record_id] = row

    tests: List[Dict[str, Any]] = []
    for record_id, row in unique.items():
        tests.append(
            {
                "record_id": record_id,
                "age": int(float(row["age"])) if row.get("age") else None,
                "sex": "M" if row.get("male") == "1" else "F",
                "selected_for_class": row.get("selected_for_class", ""),
                "filename_hr": row.get("filename_hr", ""),
            }
        )

    tests.sort(key=lambda t: int(t["record_id"]))
    return tests[:limit]


def get_test_record(record_id: str) -> Dict[str, str]:
    target = _to_int_str(record_id)
    for row in load_metadata_rows():
        if _to_int_str(row["id_record"]) == target:
            return row
    raise FileNotFoundError(f"Record id {record_id} not found in metadata.")


def get_reference_outcomes(record_id: str) -> Dict[str, float]:
    row = get_test_record(record_id)
    outcomes: Dict[str, float] = {}
    for key in OUTCOME_KEYS:
        raw_value = row.get(key, "")
        if raw_value == "":
            raise ValueError(
                f"Missing outcome column '{key}' for record id {record_id}."
            )
        outcomes[key] = float(raw_value)
    return outcomes


def _parse_gain_and_baseline(token: str) -> tuple[float, float]:
    gain_part = token.split("/")[0]
    if "(" in gain_part and ")" in gain_part:
        gain_text = gain_part.split("(")[0]
        baseline_text = gain_part.split("(")[1].split(")")[0]
        return float(gain_text), float(baseline_text)
    return float(gain_part), 0.0


def _read_header(hea_path: Path) -> tuple[int, int, List[SignalHeader]]:
    lines = [line.strip() for line in hea_path.read_text().splitlines() if line.strip()]
    if not lines:
        raise ValueError(f"Header file is empty: {hea_path}")

    first = lines[0].split()
    n_sig = int(first[1])
    sample_rate = int(float(first[2]))
    sig_len = int(first[3])

    headers: List[SignalHeader] = []
    for line in lines[1 : 1 + n_sig]:
        parts = line.split()
        if len(parts) < 9:
            continue
        gain, baseline = _parse_gain_and_baseline(parts[2])
        headers.append(
            {
                "dat_file": parts[0],
                "gain": gain,
                "baseline": baseline,
                "lead": parts[-1].upper(),
            }
        )

    if len(headers) != n_sig:
        raise ValueError(
            f"Expected {n_sig} signal lines in {hea_path}, got {len(headers)}"
        )

    return sample_rate, sig_len, headers


def _resolve_record_paths(metadata_row: Dict[str, str]) -> tuple[Path, Path]:
    filename_hr = metadata_row["filename_hr"]
    rel = filename_hr.replace("records500/", "")
    base = DATA_DIR / rel
    return base.with_suffix(".hea"), base.with_suffix(".dat")


def build_input_payload(record_id: str) -> Dict[str, Any]:
    row = get_test_record(record_id)
    hea_path, dat_path = _resolve_record_paths(row)
    sample_rate, sig_len, headers = _read_header(hea_path)

    if not dat_path.exists():
        raise FileNotFoundError(f"Data file missing: {dat_path}")

    raw = np.fromfile(dat_path, dtype="<i2")
    n_sig = len(headers)
    expected = sig_len * n_sig
    if raw.size < expected:
        raise ValueError(
            f"Data file {dat_path} has too few samples ({raw.size} < {expected})"
        )

    signal_matrix = raw[:expected].reshape(sig_len, n_sig)

    lead_map: Dict[str, Dict[str, Any]] = {}
    for idx, header in enumerate(headers):
        lead_map[header["lead"]] = {
            "samples": signal_matrix[:, idx],
            "gain": header["gain"],
        }

    waveforms: List[Dict[str, Any]] = []
    for lead in LEAD_ORDER:
        if lead not in lead_map:
            raise ValueError(f"Lead {lead} missing in record {record_id}")
        digital = lead_map[lead]["samples"].astype("<i2")
        gain = float(lead_map[lead]["gain"])
        lsb_uv = 1000.0 / gain if gain != 0 else 1.0

        waveforms.append(
            {
                "leadId": lead,
                "LSB": lsb_uv,
                "sampleRate": sample_rate,
                "samples": base64.b64encode(digital.tobytes()).decode("ascii"),
            }
        )

    return {
        "examId": _to_int_str(row["id_record"]),
        "sex": "M" if row.get("male") == "1" else "F",
        "age": int(float(row["age"])) if row.get("age") else None,
        "medication": "",
        "symptom": "",
        "language": "EN",
        "waveforms": waveforms,
    }


def aggregate_outcomes(outcomes: Dict[str, float]) -> Dict[str, float]:
    control = outcomes.get("control_nomyoperi", 0.0) + outcomes.get(
        "control_myoperi", 0.0
    )
    nomi = outcomes.get("mi_nstemi_nonomi", 0.0) + outcomes.get("mi_stemi_nonomi", 0.0)
    omi_lm_lad = outcomes.get("mi_nstemi_omi_lmca_lad", 0.0) + outcomes.get(
        "mi_stemi_omi_lmca_lad", 0.0
    )
    omi_lcx = outcomes.get("mi_nstemi_omi_lcx", 0.0) + outcomes.get(
        "mi_stemi_omi_lcx", 0.0
    )
    omi_rca = outcomes.get("mi_nstemi_omi_rca", 0.0) + outcomes.get(
        "mi_stemi_omi_rca", 0.0
    )
    omi = omi_lm_lad + omi_lcx + omi_rca
    mi = nomi + omi

    return {
        "control": control,
        "mi": mi,
        "omi": omi,
        "nomi": nomi,
        "omi_lm_lad": omi_lm_lad,
        "omi_lcx": omi_lcx,
        "omi_rca": omi_rca,
        "lbbb": outcomes.get("lbbb", 0.0),
    }
