from api_models import InputModel
from api_models import ResponseModel, AIModel
from configure_prediction import configure_prediction
from preprocess_input_data import preprocess_input_data
from control_data import control_data
from api_models import AIModel


def predict_with_ai_model(input: InputModel, model: AIModel) -> ResponseModel:
    
    if input.age is not None and input.age < 18:
        return ResponseModel(status="no_analysis", analysisResult="Patient age must be 18 or older.")
    
    try:
        control_data(input)
    except ValueError as e:
        return ResponseModel(status="error", analysisResult=str(e))
    
    try:
        preprocessed_data = preprocess_input_data(input)
        prediction_config = configure_prediction(input, preprocessed_data)

        output = model.predict(prediction_config)

        response = ResponseModel(status="success", analysisResult=output)

    except Exception as e:
        response = ResponseModel(
            status="error",
            analysisResult=str(e)
        )

    return response

if __name__ == "__main__":
    from api_models import wf_I, wf_II, wf_V1, wf_V2, wf_V3, wf_V4, wf_V5, wf_V6
    # Example usage

    ai_model = AIModel()
    ai_model.load_model()

    
    example_input = InputModel(
        examId="12345",
        sex="F",
        age=62,
        medication="",
        symptom="",
        language="EN",
        waveforms=[wf_I, wf_II, wf_V1, wf_V2, wf_V3, wf_V4, wf_V5, wf_V6])
    result = predict_with_ai_model(example_input, ai_model)
    print(result)
