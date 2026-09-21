#!/usr/bin/env python3
"""Prueba de humo de GENESIS: verifica el backend desplegado de punta a punta y imprime un reporte
que puedes pegar tal cual. No necesita instalar nada (solo Python 3.8+). NUNCA imprime tu clave.

Uso:
  python smoke_test.py --url https://TU-BACKEND.onrender.com --key gk_TU_CLAVE --origin https://TU-FRONTEND.vercel.app

Usa el archivo archivo_prueba_genesis.xlsx (ponlo en la misma carpeta o indica --file).
"""
import argparse, json, os, sys, time, uuid
import urllib.request, urllib.error

EXPECTED_TYPES = {"DUPLICADO_EXACTO", "MARGEN_NEGATIVO", "VIAJE_SIN_INGRESO", "REGISTRO_SIN_VIAJE",
                  "RENDIMIENTO_COMBUSTIBLE", "OUTLIER_INGRESO"}
RESULTS = []


def record(ok, step, detail=""):
    RESULTS.append(ok)
    print(f"{'OK    ' if ok else 'FALLA '} {step}" + (f"  -> {detail}" if detail else ""))


def multipart(fields, files):
    b = uuid.uuid4().hex
    body = b""
    for k, v in fields.items():
        body += f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode()
    for k, (name, content, ctype) in files.items():
        body += (f'--{b}\r\nContent-Disposition: form-data; name="{k}"; filename="{name}"\r\n'
                 f'Content-Type: {ctype}\r\n\r\n').encode() + content + b"\r\n"
    return body + f"--{b}--\r\n".encode(), f"multipart/form-data; boundary={b}"


def call(base, method, path, key=None, body=None, ctype=None, headers=None, timeout=150):
    h = dict(headers or {})
    if key:
        h["X-API-Key"] = key
    if ctype:
        h["Content-Type"] = ctype
    req = urllib.request.Request(base + path, data=body, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, dict(r.headers), r.read()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read()
    except Exception as e:  # red, DNS, timeout
        return 0, {}, str(e).encode()


def jload(raw):
    try:
        return json.loads(raw.decode("utf-8"))
    except Exception:
        return {}


def err_text(raw):
    e = jload(raw).get("error") or {}
    return f"{e.get('code')}: {e.get('message')} (soporte {e.get('request_id')})" if e else raw[:200].decode("utf-8", "replace")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", required=True)
    ap.add_argument("--key", required=True)
    ap.add_argument("--origin", default="http://localhost:3000")
    ap.add_argument("--file", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "archivo_prueba_genesis.xlsx"))
    ap.add_argument("--keep", action="store_true", help="no borrar la auditoría de prueba al final")
    a = ap.parse_args()
    base, key = a.url.rstrip("/"), a.key.strip()

    print(f"GENESIS smoke test  ->  {base}\n")

    # 1. Salud (con reintentos: el plan gratuito de Render tarda en despertar)
    st = 0
    for i in range(3):
        st, _, raw = call(base, "GET", "/health", timeout=120)
        if st == 200:
            break
        time.sleep(5)
    ver = jload(raw).get("version", "?")
    record(st == 200, "Servidor responde (/health)", f"estado {st}, versión {ver}")
    if st != 200:
        return finish()
    record(str(ver).startswith("1."), "Es el backend v1.x (no el viejo 0.6.6)", f"versión {ver}")

    # 2. Autenticación obligatoria
    st, _, _ = call(base, "GET", "/api/v1/me")
    record(st == 401, "Sin clave -> rechaza (401)", f"estado {st}")
    st, _, _ = call(base, "GET", "/api/v1/me", key="gk_clave_falsa_123456")
    record(st == 401, "Clave falsa -> rechaza (401)", f"estado {st}")

    # 3. Clave real
    st, _, raw = call(base, "GET", "/api/v1/me", key=key)
    me = jload(raw)
    record(st == 200, "Tu clave entra (/me)", f"cliente '{me.get('name')}'" if st == 200 else err_text(raw))
    if st != 200:
        return finish()

    # 4. CORS desde tu frontend
    st, hd, _ = call(base, "OPTIONS", "/api/v1/me", headers={
        "Origin": a.origin, "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "x-api-key"})
    allow = {k.lower(): v for k, v in hd.items()}.get("access-control-allow-origin")
    record(st in (200, 204) and allow in ("*", a.origin), "CORS permite tu frontend", f"origen {a.origin}, respuesta {st}, allow-origin={allow}")

    # 5. Lectura del archivo de prueba
    if not os.path.exists(a.file):
        record(False, "Archivo de prueba encontrado", a.file)
        return finish()
    content = open(a.file, "rb").read()
    xl = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    body, ct = multipart({}, {"file": ("archivo_prueba_genesis.xlsx", content, xl)})
    st, _, raw = call(base, "POST", "/api/v1/data-understanding", key=key, body=body, ctype=ct)
    ua = jload(raw)
    record(st == 200, "Lee el archivo (data-understanding)", f"{ua.get('sheets_detected')} hojas, {ua.get('total_records')} filas" if st == 200 else err_text(raw))
    if st != 200:
        return finish()
    mapping, pending = {}, []
    for sheet, an in ua["sheets_analysis"].items():
        m = {c: v["canonical"] for c, v in an["fields_mapping"].items()}
        for amb in an["ambiguities"]:
            m[amb["original_column"]] = amb["possible_match"] if amb["requires_decision"] else "UNKNOWN"
            if amb["requires_decision"]:
                pending.append(amb["original_column"])
        mapping[sheet] = m
    record(len(mapping) == 2 and not pending, "Detecta columnas sin pedir confirmaciones", f"pendientes: {pending or 'ninguna'}")

    # 6. Auditoría
    body, ct = multipart({"mapping": json.dumps(mapping)}, {"file": ("archivo_prueba_genesis.xlsx", content, xl)})
    st, _, raw = call(base, "POST", "/api/v1/audits", key=key, body=body, ctype=ct)
    au = jload(raw)
    record(st == 200, "Ejecuta la auditoría", f"estado {au.get('estado')}, id {au.get('id')}" if st == 200 else err_text(raw))
    if st != 200:
        return finish()
    fin = au.get("financials") or {}
    types = {f["tipo"] for f in au.get("findings", [])}
    record(EXPECTED_TYPES <= types, "Encuentra los 6 problemas sembrados", f"faltan: {sorted(EXPECTED_TYPES - types) or 'ninguno'}")
    ing, risk = fin.get("totalIngresos"), fin.get("dineroEnRiesgo")
    record(ing is not None and abs(ing - 134379405) < 5 and risk is not None and abs(risk - 6195943) < 5,
           "Cifras esperadas (ingresos 134.379.405; en riesgo 6.195.943)", f"ingresos={ing}, en riesgo={risk}  (si cambiaste IVA/margen en Reglas, es normal que difieran)")
    audit_id = au.get("id")

    # 7. Idempotencia
    st, _, raw = call(base, "POST", "/api/v1/audits", key=key, body=body, ctype=ct)
    again = jload(raw)
    record(st == 200 and again.get("reutilizado") is True and again.get("id") == audit_id, "Mismo archivo -> reutiliza (no duplica tareas)", f"estado {st}")

    # 8. Historial, exportación, tareas
    st, _, raw = call(base, "GET", "/api/v1/audits?limit=50", key=key)
    ids = [x["id"] for x in jload(raw).get("items", [])]
    record(st == 200 and audit_id in ids, "Aparece en el historial", f"estado {st}")
    st, hd, raw = call(base, "GET", f"/api/v1/audits/{audit_id}/export", key=key)
    record(st == 200 and raw[:2] == b"PK", "Exporta a Excel", f"estado {st}, {len(raw)} bytes")
    st, _, raw = call(base, "GET", f"/api/v1/tasks?audit_id={audit_id}", key=key)
    tasks = jload(raw).get("items", [])
    record(st == 200 and len(tasks) >= 6, "Crea las tareas de acción", f"{len(tasks)} tareas")
    if tasks:
        st, _, raw = call(base, "PATCH", f"/api/v1/tasks/{tasks[0]['id']}", key=key,
                          body=json.dumps({"status": "EN_PROCESO"}).encode(), ctype="application/json")
        record(st == 200 and jload(raw).get("status") == "EN_PROCESO", "Cambia el estado de una tarea", f"estado {st}")

    # 9. Limpieza
    if not a.keep:
        st, _, _ = call(base, "DELETE", f"/api/v1/audits/{audit_id}", key=key)
        record(st == 200, "Elimina la auditoría de prueba", f"estado {st}")
    finish()


def finish():
    ok, total = sum(RESULTS), len(RESULTS)
    print(f"\nRESULTADO: {ok}/{total} pasos correctos" + ("  -> TODO OK" if ok == total else "  -> HAY FALLAS: pega este reporte completo"))
    sys.exit(0 if ok == total else 1)


if __name__ == "__main__":
    main()
