import pandas as pd
import difflib

class GenesisDataUnderstanding:
    def __init__(self):
        # Modelo Canónico ahora incluye el tipo de dato esperado
        self.canonical_model = {
            "VEHICLE_ID": {"synonyms": ["placa", "unidad", "vehiculo", "tracto", "truck", "camion"], "expected_type": "text"},
            "TRIP_DATE": {"synonyms": ["fecha", "date", "salida", "emision", "dia"], "expected_type": "date"},
            "REVENUE": {"synonyms": ["ingreso", "tarifa", "flete", "facturado", "revenue", "importe"], "expected_type": "numeric"},
            "COST_FUEL": {"synonyms": ["diesel", "combustible", "gasolina", "fuel"], "expected_type": "numeric"}
        }

    def _infer_data_type(self, series: pd.Series) -> str:
        """Infiere si la columna es texto, número o fecha basándose en su contenido."""
        if pd.api.types.is_numeric_dtype(series):
            return "numeric"
        elif pd.api.types.is_datetime64_any_dtype(series) or "fecha" in str(series.name).lower():
            return "date"
        else:
            return "text"

    def analyze_schema(self, excel_path: str):
        df = pd.read_excel(excel_path)
        raw_columns = list(df.columns)
        
        understanding_result = {
            "dataset": {"records": len(df), "columns": len(raw_columns)},
            "fields_mapping": {},
            "ambiguities": []
        }

        for col in raw_columns:
            col_str = str(col).lower().strip()
            actual_type = self._infer_data_type(df[col])
            
            best_match = None
            highest_confidence = 0.0

            for canonical_key, rules in self.canonical_model.items():
                synonyms = rules["synonyms"]
                expected_type = rules["expected_type"]
                
                for syn in synonyms:
                    similitud = difflib.SequenceMatcher(None, col_str, syn).ratio()
                    if syn in col_str:
                        similitud = max(similitud, 0.85)

                    # PENALIZACIÓN CRÍTICA: Si el tipo de dato no coincide, matamos la confianza
                    if expected_type != actual_type:
                        similitud = similitud * 0.1  # Reduce la confianza drásticamente

                    if similitud > highest_confidence:
                        highest_confidence = similitud
                        best_match = canonical_key

            if highest_confidence >= 0.80:
                understanding_result["fields_mapping"][col] = {
                    "canonical": best_match,
                    "confidence": round(highest_confidence, 2),
                    "detected_type": actual_type
                }
            elif highest_confidence >= 0.30:
                understanding_result["ambiguities"].append({
                    "original_column": col,
                    "detected_type": actual_type,
                    "possible_match": best_match,
                    "confidence": round(highest_confidence, 2)
                })
            else:
                understanding_result["ambiguities"].append({
                    "original_column": col,
                    "detected_type": actual_type,
                    "possible_match": "UNKNOWN",
                    "confidence": round(highest_confidence, 2)
                })

        return understanding_result

if __name__ == "__main__":
    motor = GenesisDataUnderstanding()
    print("\n--- TEST: LAB 02 (Caótico) con Data Profiling ---")
    res_caotico = motor.analyze_schema("LAB_02_Chaotic.xlsx")
    
    import json
    print(json.dumps(res_caotico, indent=2, ensure_ascii=False))