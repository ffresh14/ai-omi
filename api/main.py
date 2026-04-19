from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from api_models import ResponseModel
from api_models import InputModel
from api_models import AIModel
from ecg_analyzer import predict_with_ai_model
from test_data_service import (
    aggregate_outcomes,
    build_input_payload,
    get_reference_outcomes,
    get_test_record,
    list_tests,
)


class TestSummary(BaseModel):
    record_id: str
    age: int | None
    sex: str
    selected_for_class: str
    filename_hr: str


class TestPredictionResponse(BaseModel):
    record_id: str
    status: str
    metadata: dict
    raw_outcomes: dict
    tree_outcomes: dict


class TestWaveform(BaseModel):
    leadId: str
    LSB: float
    sampleRate: int
    samples: str


class TestWaveformsResponse(BaseModel):
    record_id: str
    sample_rate: int
    waveforms: list[TestWaveform]


API_Description = (
    "Inofficial API version of https://github.com/stefan-gustafsson-work/omi/tree/main"
)

# Create FastAPI instance
app = FastAPI(title="AnalyzeECGService", description=API_Description)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model at startup
model = AIModel()
model.load_model()


@app.get("/tests", response_model=list[TestSummary])
def get_tests(limit: int = 200) -> list[TestSummary]:
    return [TestSummary(**item) for item in list_tests(limit)]


@app.get("/tests/{record_id}")
def get_test_by_id(record_id: str) -> dict:
    try:
        row = get_test_record(record_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {
        "record_id": str(int(row["id_record"])),
        "age": int(float(row["age"])) if row.get("age") else None,
        "sex": "M" if row.get("male") == "1" else "F",
        "selected_for_class": row.get("selected_for_class", ""),
        "filename_hr": row.get("filename_hr", ""),
    }


@app.get("/tests/{record_id}/waveforms", response_model=TestWaveformsResponse)
def get_test_waveforms(record_id: str) -> TestWaveformsResponse:
    try:
        payload = build_input_payload(record_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    waveforms = [TestWaveform(**item) for item in payload.get("waveforms", [])]
    sample_rate = waveforms[0].sampleRate if waveforms else 0
    return TestWaveformsResponse(
        record_id=str(int(record_id)),
        sample_rate=sample_rate,
        waveforms=waveforms,
    )


@app.post("/tests/{record_id}/predict", response_model=TestPredictionResponse)
def predict_test_by_id(
    record_id: str, use_model: bool = False
) -> TestPredictionResponse:
    try:
        row = get_test_record(record_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    if not use_model:
        raw_outcomes = get_reference_outcomes(record_id)
        return TestPredictionResponse(
            record_id=str(int(record_id)),
            status="success",
            metadata={
                "age": int(float(row["age"])) if row.get("age") else None,
                "sex": "M" if row.get("male") == "1" else "F",
                "source": "top_metadata.csv",
            },
            raw_outcomes=raw_outcomes,
            tree_outcomes=aggregate_outcomes(raw_outcomes),
        )

    payload = build_input_payload(record_id)
    input_model = InputModel(**payload)
    response = predict_with_ai_model(input_model, model)

    if response.status != "success":
        return TestPredictionResponse(
            record_id=str(int(record_id)),
            status=response.status,
            metadata={
                "age": payload["age"],
                "sex": payload["sex"],
            },
            raw_outcomes={},
            tree_outcomes={},
        )

    result_obj = response.analysisResult
    if hasattr(result_obj, "model_dump"):
        raw_outcomes = result_obj.model_dump()
    else:
        raw_outcomes = dict(result_obj)

    return TestPredictionResponse(
        record_id=str(int(record_id)),
        status="success",
        metadata={
            "age": payload["age"],
            "sex": payload["sex"],
        },
        raw_outcomes=raw_outcomes,
        tree_outcomes=aggregate_outcomes(raw_outcomes),
    )


# Analyze POST endpoint
@app.post("/AnalyzeECG", response_model=ResponseModel)
def analyze(input: InputModel) -> ResponseModel:
    response = predict_with_ai_model(input, model)
    return response


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
