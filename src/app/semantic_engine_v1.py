import pandas as pd
import difflib

class GenesisDataUnderstanding:
    def __init__(self):
        # EL MODELO CANÓNICO EMPRESARIAL
        self.canonical_model = {
            "VEHICLE_ID": ["placa", "unidad", "vehiculo", "tracto", "truck", "camion"],
            "TRIP_DATE": ["fecha", "date", "salida", "emision", "dia"],
            "REVENUE": ["ingreso", "tarifa", "flete", "facturado", "revenue", "importe"],
            "COST_FUEL": ["diesel", "combustible", "gasolina", "fuel"]
        }

    def analyze_schema(self, excel_path: str):
        df = pd.read_excel(excel_path)
        raw_columns = list(df.columns)
        
        understanding_result = {
            "dataset": {"records": len(df), "columns": len(raw_columns)},
            "fields_mapping": {},
            "ambiguities": []
        }

        # 1. EVALUACIÓN SEMÁNTICA POR COLUMNA
        for col in raw_columns:
            col_str = str(col).lower().strip()
            best_match = None
            highest_confidence = 0.0

            # Comparar contra nuestro modelo canónico
            for canonical_key, synonyms in self.canonical_model.items():
                for syn in synonyms:
                    # Calcula similitud (0.0 a 1.0)
                    similitud = difflib.SequenceMatcher(None, col_str, syn).ratio()
                    
                    # Boost si la palabra clave está contenida exactamente
                    if syn in col_str:
                        similitud = max(similitud, 0.85)

                    if similitud > highest_confidence:
                        highest_confidence = similitud
                        best_match = canonical_key

            # 2. DICTAMEN DE CONFIANZA
            if highest_confidence >= 0.85:
                # Alta confianza -> Mapeo directo
                understanding_result["fields_mapping"][col] = {
                    "canonical": best_match,
                    "confidence": round(highest_confidence, 2)
                }
            elif highest_confidence >= 0.50:
                # Media confianza -> Ambigüedad (Requiere validación humana)
                understanding_result["ambiguities"].append({
                    "original_column": col,
                    "possible_match": best_match,
                    "confidence": round(highest_confidence, 2),
                    "reason": f"Similitud parcial detectada."
                })
            else:
                # Baja confianza -> GENESIS no sabe qué es esto
                understanding_result["ambiguities"].append({
                    "original_column": col,
                    "possible_match": "UNKNOWN",
                    "confidence": round(highest_confidence, 2),
                    "reason": "No coincide con el modelo canónico."
                })

        return understanding_result

# MODO LABORATORIO: Probar el motor sin necesidad de servidores
if __name__ == "__main__":
    motor = GenesisDataUnderstanding()
    
    print("\n--- TEST: LAB 01 (Limpio) ---")
    res_limpio = motor.analyze_schema("LAB_01_Clean.xlsx")
    print(res_limpio)
    
    print("\n--- TEST: LAB 02 (Caótico) ---")
    res_caotico = motor.analyze_schema("LAB_02_Chaotic.xlsx")
    print(res_caotico)