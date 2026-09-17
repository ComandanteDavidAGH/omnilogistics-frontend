import pandas as pd
import numpy as np

# LAB 01: EL SUEÑO (Datos limpios y obvios)
lab1_data = {
    "VEHICLE_ID": ["TRK-001", "TRK-002", "TRK-003"],
    "TRIP_DATE": ["2026-09-01", "2026-09-02", "2026-09-03"],
    "REVENUE": [15000.0, 18000.0, 12000.0],
    "FUEL_COST": [4000.0, 5000.0, 3500.0]
}
pd.DataFrame(lab1_data).to_excel("LAB_01_Clean.xlsx", index=False)

# LAB 02: LA PESADILLA (Excel Mexicano/Latino real, sucio y ambiguo)
lab2_data = {
    "Placas del Tracto": ["TRK-001", "TRK-002", "TRK-003"], # Nombre raro
    "Fecha Salida": ["01/09/2026", "02/09/2026", "03/09/2026"], 
    "Total": [15000.0, 18000.0, 12000.0], # AMBIGUO: ¿Es ingreso o cobro total?
    "Subtotal Facturado": [14000.0, 17000.0, 11000.0], # Otro ingreso posible
    "Gasto Diesel": [4000.0, 5000.0, 3500.0],
    "Costo": [2000.0, 1500.0, 1800.0] # AMBIGUO: ¿Costo de qué?
}
pd.DataFrame(lab2_data).to_excel("LAB_02_Chaotic.xlsx", index=False)

print("✅ Archivos de Laboratorio Generados: LAB_01 y LAB_02")