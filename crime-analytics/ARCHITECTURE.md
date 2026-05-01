# Crime Analytics — Arhitectura & Procesele Aplicatiei

## Cuprins
1. [Prezentare generala](#1-prezentare-generala)
2. [Diagrama arhitecturala](#2-diagrama-arhitecturala)
3. [Servicii backend](#3-servicii-backend)
   - [Gateway](#31-gateway--port-8000)
   - [Data Service](#32-data-service--port-8001)
   - [Analytics Service](#33-analytics-service--port-8002)
   - [ML Service](#34-ml-service--port-8003)
   - [Map Service](#35-map-service--port-8004)
   - [ETL Service](#36-etl-service--port-8005)
4. [Baza de date](#4-baza-de-date)
5. [Frontend](#5-frontend)
6. [Procese principale](#6-procese-principale)
   - [ETL Pipeline](#61-etl-pipeline)
   - [Antrenare model ML](#62-antrenare-model-ml)
   - [Predictie crima](#63-predictie-crima)
   - [Generare harta](#64-generare-harta)
7. [Contextele React](#7-contextele-react)
8. [Flux de date end-to-end](#8-flux-de-date-end-to-end)
9. [Deployment (Docker)](#9-deployment-docker)

---

## 1. Prezentare generala

**Crime Analytics** este o aplicatie web de analiza spatiala a crimelor din Los Angeles (date LAPD, 2020–prezent).  
Arhitectura este de tip **microservicii** — fiecare responsabilitate logica are propriul serviciu Python (FastAPI), toate comunica printr-un **API Gateway** central, iar frontend-ul React consuma exclusiv gateway-ul.

| Stiva | Tehnologie |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Leaflet, Recharts |
| Backend | Python 3.12+, FastAPI, SQLAlchemy (async) |
| ML | scikit-learn (RandomForest), joblib, pandas |
| Baza de date | PostgreSQL 16 + PostGIS 3.4 |
| Deployment | Docker / Docker Compose |

---

## 2. Diagrama arhitecturala

```
┌─────────────────────────────────────────────────────────┐
│                      BROWSER                            │
│            React SPA  (port 3000)                       │
│  Dashboard | Map | Analytics | Predict                  │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP  axios  VITE_API_URL
                     ▼
┌─────────────────────────────────────────────────────────┐
│              GATEWAY  (port 8000)                       │
│   FastAPI · Rate-limit 100/min · CORS · Logging         │
│   /api/data/*  /api/analytics/*  /api/ml/*              │
│   /api/map/*   /api/etl/*        /health                │
└──┬──────────┬──────────┬──────────┬──────────┬──────────┘
   │          │          │          │          │
   ▼          ▼          ▼          ▼          ▼
:8001      :8002      :8003      :8004      :8005
Data       Analytics    ML        Map        ETL
Service    Service    Service   Service    Service
   │          │          │          │          │
   └──────────┴──────────┴──────────┴──────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │  PostgreSQL + PostGIS│
              │  (port 5432)        │
              │  crime_incidents    │
              └─────────────────────┘
```

---

## 3. Servicii backend

### 3.1 Gateway — port 8000

**Fisier:** [services/gateway/main.py](services/gateway/main.py)

Punct unic de intrare pentru frontend. Nu contine logica de business — doar **proxy** catre serviciile interne.

| Functionalitate | Detaliu |
|---|---|
| Rate limiting | 100 cereri/minut per IP (`slowapi`) |
| CORS | Permite doar `http://localhost:3000` |
| Logging middleware | Logheaza metoda, path, status, durata (ms) |
| Error handling | Returneaza 502 la erori upstream, 500 la erori interne |

**Rute expuse:**

| Prefix | Serviciu tinta |
|---|---|
| `/api/data/*` | Data Service :8001 |
| `/api/analytics/*` | Analytics Service :8002 |
| `/api/ml/*` | ML Service :8003 |
| `/api/map/*` | Map Service :8004 |
| `/api/etl/*` | ETL Service :8005 |
| `/health` | local |

---

### 3.2 Data Service — port 8001

**Fisier:** [services/data-service/main.py](services/data-service/main.py)

Sursa de adevar pentru toate datele brute. Acceseaza direct PostgreSQL prin **SQLAlchemy async**.

**Endpoint-uri principale:**

| Metoda | Cale | Descriere |
|---|---|---|
| GET | `/data/incidents` | Lista incidente cu filtre si paginare |
| GET | `/data/incidents/{dr_no}` | Incident dupa numarul de dosar |
| POST | `/data/incidents/bulk` | Import in masa |
| GET | `/data/areas` | Lista distincta de zone LAPD |
| GET | `/data/crime-types` | Lista tipuri de crime |
| GET | `/data/date-range` | Min/max an din baza de date |
| GET | `/data/stats/by-area` | Numar incidente grupat pe zona |
| GET | `/data/stats/by-time` | Serii temporale (luna / ora / zi saptamana) |
| GET | `/data/stats/by-crime-type` | Top N tipuri de crima |
| GET | `/data/stats/hourly` | Distributie orara (heatmap) |
| GET | `/data/stats/area-time-matrix` | Matrice zona × luna (folosita de ML) |

**Filtre disponibile:** `area_name`, `crm_cd_desc`, `year_from`, `year_to`, `month`, `hour_from`, `hour_to`, `is_weekend`

---

### 3.3 Analytics Service — port 8002

**Fisier:** [services/analytics-service/main.py](services/analytics-service/main.py)

Calcule statistice pure — nu acceseaza baza de date direct, primeste date prin request body.

| Endpoint | Intrare | Iesire |
|---|---|---|
| `POST /analytics/descriptive` | zona, populatie, serii temporale | rata criminalitate, densitate, trend, sezonalitate |
| `POST /analytics/risk-scores` | lista zone cu statistici | scor de risc normalizat 0–100 per zona |
| `POST /analytics/hotspots` | lista coordonate lat/lon | date KDE pentru heatmap |

**Analiza de trend:** regresie liniara pe seria temporala lunara  
**Scor de risc:** combinatie ponderata din rata, densitate si trend  
**Hotspots:** Kernel Density Estimation pe grila configurabila (10–200 celule)

---

### 3.4 ML Service — port 8003

**Fisier:** [services/ml-service/main.py](services/ml-service/main.py)

Antrenare si inferenta model de predictie tip crima.

| Endpoint | Descriere |
|---|---|
| `POST /ml/train` | Antreneaza din datele din DB (1000 randuri) |
| `POST /ml/train-csv` | **Upload CSV** → antreneaza RandomForest cu `class_weight='balanced'` |
| `POST /ml/predict` | Predict tip crima pentru un incident nou |
| `POST /ml/predict-area-risk` | Predict nivel de risc pentru o zona + luna |
| `GET /ml/model-info` | Metadata model salvat (acuratete, feature importances, clase) |

**Modelul default:** RandomForest cu clase balansate  
**Features CSV:** `Hour, AREA, Rpt Dist No, Vict Age, Vict Sex, Vict Descent, Premis Cd, Weapon Used Cd, LAT, LON, Year, Month, Day, IsWeekend, IsNight, Quarter`  
**Target:** `Crm Cd` (cod crima LAPD — ~100 clase)  
**Stocare model:** volum Docker `./services/ml-service/models_store/` (persista intre restart-uri)

---

### 3.5 Map Service — port 8004

**Fisier:** [services/map-service/main.py](services/map-service/main.py)

Genereaza date geospatiale gata de consumat de Leaflet. Orchestreaza apeluri catre Data Service si Analytics Service.

| Endpoint | Descriere |
|---|---|
| `GET /map/geojson/areas` | GeoJSON FeatureCollection cu poligoane zone + risc |
| `GET /map/heatmap` | Date `[lat, lon, intensitate]` pentru `Leaflet.heat` |
| `GET /map/clusters` | Clustere de markere pentru `Leaflet.markercluster` |
| `GET /map/incident-points` | Puncte individuale filtrate dupa bounding box viewport |

**Flux intern `geojson/areas`:**
1. Cere statistici per zona → Data Service `/data/stats/by-area`
2. Calculeaza scoruri de risc → Analytics Service `/analytics/risk-scores`
3. Combina si genereaza GeoJSON cu proprietati `risk_score`, `incident_count`

---

### 3.6 ETL Service — port 8005

**Fisier:** [services/etl-service/main.py](services/etl-service/main.py)

Importa si transforma fisierul raw LAPD (CSV sau XLSX) in baza de date.

| Endpoint | Descriere |
|---|---|
| `GET /etl/status` | Status curent al pipeline-ului (running / completed / failed / skipped) |
| `POST /etl/run-pipeline` | Declanseaza manual pipeline-ul |

**Auto-import la startup:** Daca `AUTO_IMPORT_ENABLED=true` (default) si tabelul `crime_incidents` e gol, pipeline-ul ruleaza automat.  
**Lock:** Un singur pipeline poate rula simultan (mutex `threading.Lock`).

---

## 4. Baza de date

**Motor:** PostgreSQL 16 + PostGIS 3.4  
**Tabel principal:** `crime_incidents`

| Coloana | Tip | Descriere |
|---|---|---|
| `dr_no` | text PK | Numar dosar LAPD |
| `date_occ` | timestamp | Data incidentului |
| `year/month/day/hour` | int | Componente temporale extrase |
| `quarter` | int | Trimestru (1–4) |
| `weekday` | int | Ziua saptamanii (0=luni) |
| `is_weekend` | bool | Sambata / Duminica |
| `is_night` | bool | Ora 22:00–05:59 |
| `area` | int | Cod zona LAPD (1–21) |
| `area_name` | text | Denumire zona |
| `crm_cd` | int | Cod tip crima |
| `crm_cd_desc` | text | Descriere tip crima |
| `vict_age` | int | Varsta victima |
| `vict_sex` | char | Sexul victimei (M/F/X) |
| `lat / lon` | float | Coordonate GPS |
| `lat_bin / lon_bin` | float | Coordonate rotunjite (pentru grupari) |
| `geom` | geometry(Point, 4326) | Punct PostGIS (generat automat) |

**Schema initiala:** [scripts/init-db.sql](scripts/init-db.sql)

---

## 5. Frontend

**Tehnologie:** React 18 + Vite + Tailwind CSS  
**Fisier principal:** [frontend/src/App.jsx](frontend/src/App.jsx)

### Pagini

| Ruta | Componenta | Descriere |
|---|---|---|
| `/` | `Dashboard` | Carduri sumar, grafic timp, top crime, minimap |
| `/map` | `MapPage` | Harta Leaflet interactiva (heatmap, clustere, choropleth) |
| `/analytics` | `Analytics` | Grafice detaliate: temporale, spatiale, tipuri, trend |
| `/predict` | `Predict` | Formular predictie + feature importances + model info |

### Componente cheie

```
src/
├── pages/
│   ├── Dashboard.jsx       — overview general
│   ├── MapPage.jsx         — harta Leaflet
│   ├── Analytics.jsx       — tab-uri grafice avansate
│   └── Predict.jsx         — interfata ML
├── components/
│   ├── map/
│   │   ├── CrimeMap.jsx           — container harta Leaflet
│   │   ├── HeatmapLayer.jsx       — strat heatmap
│   │   ├── ChoroplethLayer.jsx    — strat choropleth zone
│   │   ├── MapFilters.jsx         — filtre specifice harta
│   │   ├── MapLegend.jsx          — legenda
│   │   └── AreaPopup.jsx          — popup click zona
│   ├── analytics/
│   │   ├── TemporalCharts.jsx     — grafice temporale
│   │   ├── SpatialCharts.jsx      — grafice spatiale
│   │   ├── CrimeTypeCharts.jsx    — grafice tipuri crime
│   │   └── TrendCharts.jsx        — grafice trend
│   ├── predict/
│   │   ├── PredictionForm.jsx     — formular input predictie
│   │   ├── PredictionResult.jsx   — afisare rezultat predictie
│   │   ├── FeatureImportanceChart.jsx — importanta features
│   │   └── ModelInfoCard.jsx      — info model curent
│   ├── SummaryCard.jsx            — card KPI
│   ├── TimeSeriesChart.jsx        — grafic linie temporal
│   ├── TopCrimesChart.jsx         — bar chart top crime
│   ├── MiniMap.jsx                — minimap dashboard
│   ├── HourlyHeatmap.jsx          — heatmap ora × zi
│   ├── RiskTable.jsx              — tabel risc zone
│   └── DataImportState.jsx        — banner status ETL
├── context/
│   ├── FilterContext.jsx          — filtre globale (zona, tip crima, ani)
│   ├── EtlStatusContext.jsx       — polling status ETL
│   └── ThemeContext.jsx           — dark/light mode
└── services/
    └── api.js                     — toate apelurile axios catre gateway
```

---

## 6. Procese principale

### 6.1 ETL Pipeline

```
Fisier raw (XLSX/CSV)
        │
        ▼
   read_raw_data()          — citeste fisierul cu pandas
        │
        ▼
   clean_raw_data()         — normalizeaza coloane, elimina null-uri,
        │                     deduplicare dupa DR_NO, extrage
        │                     Year/Month/Day/Hour/Quarter/Weekday
        ▼
   add_features()           — calculeaza lat_bin, lon_bin
        │
        ▼
   TRUNCATE crime_incidents
        │
        ▼
   INSERT in batch-uri de 5000 randuri
        │
        ▼
   UPDATE geom = ST_MakePoint(lon, lat)  — genereaza coloana PostGIS
        │
        ▼
        DONE  →  status: "completed"
```

**Trigger:** automat la startup daca tabelul e gol SAU manual prin `POST /etl/run-pipeline`

---

### 6.2 Antrenare model ML

```
Upload CSV (browser)
        │
        ▼
POST /ml/train-csv
        │
        ▼
   prepare_csv_training_data()
   — valideaza coloane necesare
   — calculeaza IsWeekend, IsNight, Quarter din Year/Month/Day/Hour
   — elimina clase cu < 10 exemple
   — train/test split 80/20
        │
        ▼
   train_models_balanced()
   — RandomForestClassifier(class_weight='balanced', n_estimators=100)
        │
        ▼
   evaluate_models()
   — accuracy, classification_report per clasa
        │
        ▼
   save_best_model()
   — salveaza best_model.joblib
   — salveaza model_metadata.json (acuratete, feature_names, clase)
   — salveaza label_encoders.joblib
        │
        ▼
   Raspuns JSON cu acuratete + metrici per clasa
```

---

### 6.3 Predictie crima

```
Formular frontend (Predict.jsx)
        │  { year, month, day, hour, area, lat, lon, ... }
        ▼
POST /api/ml/predict   (prin Gateway)
        │
        ▼
   _load_model()  — incarca best_model.joblib din disk
        │
        ▼
   _encode_input_csv() sau _encode_input_legacy()
   — construieste DataFrame cu feature-urile corecte
        │
        ▼
   model.predict(X)           — tip crima prezis
   model.predict_proba(X)     — top 5 probabilitati
   get_feature_importance()   — contributia fiecarui feature
        │
        ▼
   Raspuns: { predicted_crime_type, confidence,
              top_probabilities[5], feature_contributions }
```

---

### 6.4 Generare harta

```
CrimeMap.jsx selecteaza modul de vizualizare (heatmap / clustere / choropleth)
        │
        ├── Heatmap ──────────────────────────────────────
        │   GET /api/map/heatmap?filtre
        │   → Map Service → Data Service /data/incidents
        │   → generate_heatmap_data() → [[lat, lon, weight], ...]
        │   → Leaflet.heat.setLatLngs()
        │
        ├── Clustere ─────────────────────────────────────
        │   GET /api/map/clusters?filtre
        │   → Map Service → Data Service /data/incidents
        │   → generate_cluster_data() → GeoJSON points
        │   → Leaflet MarkerCluster
        │
        └── Choropleth (zone colorate dupa risc) ─────────
            GET /api/map/geojson/areas?filtre
            → Map Service
                ├── Data Service /data/stats/by-area
                └── Analytics Service /analytics/risk-scores
            → generate_area_geojson() → GeoJSON FeatureCollection
            → Leaflet GeoJSON cu culori pe scala risc
```

---

## 7. Contextele React

| Context | Fisier | Responsabilitate |
|---|---|---|
| `FilterContext` | [context/FilterContext.jsx](frontend/src/context/FilterContext.jsx) | Tine starea filtrelor globale (zona, tip crima, interval ani). Le incarca din API la mount. Toate paginile citesc din el. |
| `EtlStatusContext` | [context/EtlStatusContext.jsx](frontend/src/context/EtlStatusContext.jsx) | Face polling periodic la `/etl/status`. Afiseaza banner daca datele nu sunt importate. |
| `ThemeContext` | [context/ThemeContext.jsx](frontend/src/context/ThemeContext.jsx) | Comuta dark / light mode. Persista in localStorage. |

---

## 8. Flux de date end-to-end

```
1. IMPORT DATE
   Fisier LAPD (XLSX/CSV) 
   → ETL Service (curatare + feature engineering)
   → PostgreSQL crime_incidents (~700k randuri tipic)

2. VIZUALIZARE DASHBOARD
   Browser → Gateway :8000
   → Data Service: /data/stats/by-area, /data/stats/by-time,
                   /data/stats/by-crime-type, /data/stats/hourly
   → Recharts (grafice), Leaflet MiniMap

3. HARTA INTERACTIVA
   Browser → Gateway → Map Service
   Map Service → Data Service (incidente brute)
   Map Service → Analytics Service (scoruri de risc)
   → Leaflet (heatmap / clustere / choropleth)

4. ANALIZA AVANSATA
   Browser → Gateway → Data Service (statistici agregate)
   → Recharts (grafice temporale, spatiale, trend)

5. PREDICTIE ML
   (Optional) Upload CSV → ML Service (antrenare)
   Browser → Gateway → ML Service /ml/predict
   ML Service → model.joblib local → raspuns predictie
```

---

## 9. Deployment (Docker)

**Fisier:** [docker-compose.yml](docker-compose.yml)

```
docker compose up --build
```

| Serviciu | Port | Dependente |
|---|---|---|
| `db` (PostgreSQL+PostGIS) | 5432 | — |
| `data-service` | 8001 | db (healthy) |
| `etl-service` | 8005 | db (healthy) |
| `analytics-service` | 8002 | data-service |
| `ml-service` | 8003 | data-service |
| `map-service` | 8004 | data-service, analytics-service |
| `gateway` | 8000 | toate serviciile de mai sus |
| `frontend` | 3000 | gateway |

**Volum persistent:** `pgdata` — datele PostgreSQL supravietuiesc restart-urilor  
**Volum model ML:** `./services/ml-service/models_store` — modelul antrenat persista  
**Volum date raw:** `./data/raw` — montat in ETL Service pentru citirea fisierului LAPD

**Variabile de mediu importante:**

| Variabila | Serviciu | Default |
|---|---|---|
| `DATABASE_URL` | data-service, etl-service | `postgresql://crime_user:crime_pass@db:5432/crime_db` |
| `VITE_API_URL` | frontend | `http://localhost:8000/api` |
| `AUTO_IMPORT_ENABLED` | etl-service | `true` |
| `AUTO_IMPORT_WAIT_SECONDS` | etl-service | `60` |
