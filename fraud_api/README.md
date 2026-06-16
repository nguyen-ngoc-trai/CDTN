# Fraud Detection API – Giai đoạn 2 (Tuần 6–7)

## Kiến trúc hệ thống

```
fraud_api/
├── main.py                    # Entry point FastAPI
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── .env.example               # Sao chép thành .env
├── alembic_migration.py       # Script migration DB
├── ml_models/
│   └── rf_bundle_v2.pkl       # ← Copy file này từ Tuần 5
└── app/
    ├── core/
    │   ├── config.py          # Cấu hình (.env)
    │   ├── database.py        # SQLAlchemy session
    │   └── ml.py              # Model loader + predict_fraud()
    ├── models/
    │   └── transaction.py     # ORM: transactions, predictions
    ├── schemas/
    │   └── transaction.py     # Pydantic request/response
    └── routers/
        ├── predict.py         # POST /predict/single, /predict/batch
        ├── transactions.py    # GET /transactions/
        └── analytics.py       # GET /analytics/dashboard, /timeseries
```

## Cơ sở dữ liệu

| Bảng          | Mô tả                                          |
|---------------|------------------------------------------------|
| `transactions`| Lưu giao dịch (Time, Amount, V1–V28)          |
| `predictions` | Kết quả ML: xác suất, nhãn, mức rủi ro        |

## Cài đặt và chạy

### Cách 1: Docker Compose (khuyến nghị)

```bash
# 1. Sao chép file môi trường
cp .env.example .env

# 2. Copy model từ Tuần 5 vào thư mục ml_models/
cp /đường/dẫn/rf_bundle_v2.pkl ml_models/

# 3. Chạy
docker-compose up --build
```

### Cách 2: Chạy local

```bash
# Tạo và kích hoạt virtual env
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Cài thư viện
pip install -r requirements.txt

# Tạo file .env từ .env.example và điền DATABASE_URL

# Copy model
cp /đường/dẫn/rf_bundle_v2.pkl ml_models/

# Chạy server
uvicorn main:app --reload
```

## API Endpoints

| Method | URL                             | Mô tả                            |
|--------|---------------------------------|----------------------------------|
| POST   | /api/v1/predict/single          | Dự đoán một giao dịch            |
| POST   | /api/v1/predict/batch           | Upload CSV để dự đoán hàng loạt  |
| GET    | /api/v1/transactions/           | Danh sách giao dịch (có filter)  |
| GET    | /api/v1/transactions/{id}       | Chi tiết một giao dịch           |
| GET    | /api/v1/transactions/high-risk/list | Danh sách rủi ro cao         |
| GET    | /api/v1/analytics/dashboard     | Thống kê tổng quan               |
| GET    | /api/v1/analytics/timeseries    | Biểu đồ theo ngày                |
| GET    | /api/v1/analytics/feature-importance | Feature importance          |

Swagger UI: http://localhost:8000/docs

## Mức rủi ro

| risk_level | fraud_probability |
|------------|-------------------|
| SAFE       | < 0.20            |
| LOW        | 0.20 – 0.49       |
| MEDIUM     | 0.50 – 0.79       |
| HIGH       | ≥ 0.80            |
