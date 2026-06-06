-- ============================================================
-- HỆ THỐNG PHÁT HIỆN GIAN LẬN GIAO DỊCH TÀI CHÍNH
-- Database Schema - PostgreSQL
-- Giai đoạn 2, Tuần 6
-- ============================================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- BẢNG USERS: Quản lý người dùng hệ thống
-- ============================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username        VARCHAR(100) NOT NULL UNIQUE,
    email           VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    role            VARCHAR(20)  NOT NULL DEFAULT 'analyst'
                    CHECK (role IN ('admin', 'analyst', 'viewer')),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- BẢNG MODELS: Quản lý các mô hình ML đã huấn luyện
-- ============================================================
CREATE TABLE models (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) NOT NULL,
    algorithm       VARCHAR(50)  NOT NULL
                    CHECK (algorithm IN ('RandomForest', 'IsolationForest', 'LogisticRegression', 'NeuralNetwork')),
    file_path       VARCHAR(500) NOT NULL,         -- Đường dẫn file .pkl
    feature_names   TEXT[],                         -- Danh sách tên feature
    hyperparameters JSONB,                          -- Tham số mô hình
    -- Metrics đánh giá
    f1_score        NUMERIC(5,4),
    precision_score NUMERIC(5,4),
    recall_score    NUMERIC(5,4),
    roc_auc         NUMERIC(5,4),
    threshold       NUMERIC(5,4) DEFAULT 0.5,       -- Ngưỡng phân loại gian lận
    is_active       BOOLEAN NOT NULL DEFAULT FALSE, -- Chỉ 1 model active tại 1 thời điểm
    trained_at      TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- BẢNG TRANSACTIONS: Lưu trữ giao dịch tài chính
-- (Tương ứng cấu trúc Credit Card Fraud Detection Dataset - Kaggle)
-- ============================================================
CREATE TABLE transactions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    -- Các cột từ dataset (V1-V28 là PCA components ẩn danh)
    time_seconds    INTEGER,                        -- Giây kể từ giao dịch đầu tiên
    amount          NUMERIC(12, 2) NOT NULL,
    v1  NUMERIC(10,6), v2  NUMERIC(10,6), v3  NUMERIC(10,6),
    v4  NUMERIC(10,6), v5  NUMERIC(10,6), v6  NUMERIC(10,6),
    v7  NUMERIC(10,6), v8  NUMERIC(10,6), v9  NUMERIC(10,6),
    v10 NUMERIC(10,6), v11 NUMERIC(10,6), v12 NUMERIC(10,6),
    v13 NUMERIC(10,6), v14 NUMERIC(10,6), v15 NUMERIC(10,6),
    v16 NUMERIC(10,6), v17 NUMERIC(10,6), v18 NUMERIC(10,6),
    v19 NUMERIC(10,6), v20 NUMERIC(10,6), v21 NUMERIC(10,6),
    v22 NUMERIC(10,6), v23 NUMERIC(10,6), v24 NUMERIC(10,6),
    v25 NUMERIC(10,6), v26 NUMERIC(10,6), v27 NUMERIC(10,6),
    v28 NUMERIC(10,6),
    -- Ground truth (nếu biết)
    actual_class    SMALLINT CHECK (actual_class IN (0, 1)),
    -- Metadata
    source          VARCHAR(20) DEFAULT 'upload'
                    CHECK (source IN ('upload', 'api', 'manual')),
    batch_id        UUID,                           -- Nhóm upload theo batch
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- BẢNG PREDICTIONS: Kết quả dự đoán từ mô hình ML
-- ============================================================
CREATE TABLE predictions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id      UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    model_id            UUID NOT NULL REFERENCES models(id),
    -- Kết quả dự đoán
    fraud_probability   NUMERIC(6,5) NOT NULL,      -- Xác suất gian lận [0.0, 1.0]
    is_fraud            BOOLEAN NOT NULL,            -- Kết quả phân loại cuối
    threshold_used      NUMERIC(5,4) NOT NULL,       -- Ngưỡng dùng khi dự đoán
    risk_level          VARCHAR(10) NOT NULL
                        CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    -- Chi tiết kỹ thuật
    feature_importance  JSONB,                       -- Top features ảnh hưởng
    processing_time_ms  INTEGER,                     -- Thời gian xử lý (ms)
    predicted_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- BẢNG ALERTS: Cảnh báo giao dịch nghi ngờ
-- ============================================================
CREATE TABLE alerts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prediction_id   UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    alert_type      VARCHAR(20) NOT NULL
                    CHECK (alert_type IN ('high_risk', 'critical_risk', 'model_error')),
    message         TEXT NOT NULL,
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    is_resolved     BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_by     UUID REFERENCES users(id),
    resolved_at     TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- INDEXES: Tối ưu truy vấn
-- ============================================================

-- Transactions
CREATE INDEX idx_transactions_user_id   ON transactions(user_id);
CREATE INDEX idx_transactions_created   ON transactions(created_at DESC);
CREATE INDEX idx_transactions_amount    ON transactions(amount);
CREATE INDEX idx_transactions_batch     ON transactions(batch_id);

-- Predictions
CREATE INDEX idx_predictions_txn        ON predictions(transaction_id);
CREATE INDEX idx_predictions_fraud      ON predictions(is_fraud) WHERE is_fraud = TRUE;
CREATE INDEX idx_predictions_risk       ON predictions(risk_level);
CREATE INDEX idx_predictions_time       ON predictions(predicted_at DESC);

-- Alerts
CREATE INDEX idx_alerts_user_unread     ON alerts(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_alerts_created         ON alerts(created_at DESC);

-- ============================================================
-- VIEW: Giao dịch kèm kết quả dự đoán (dùng cho dashboard)
-- ============================================================
CREATE VIEW v_transaction_predictions AS
SELECT
    t.id            AS transaction_id,
    t.amount,
    t.time_seconds,
    t.created_at    AS transaction_time,
    p.fraud_probability,
    p.is_fraud,
    p.risk_level,
    p.predicted_at,
    m.name          AS model_name,
    m.algorithm,
    u.username      AS uploaded_by
FROM transactions t
LEFT JOIN predictions p ON p.transaction_id = t.id
LEFT JOIN models m      ON m.id = p.model_id
LEFT JOIN users u       ON u.id = t.user_id;

-- ============================================================
-- VIEW: Thống kê tổng quan cho dashboard
-- ============================================================
CREATE VIEW v_fraud_stats AS
SELECT
    DATE_TRUNC('day', t.created_at)  AS stat_date,
    COUNT(*)                          AS total_transactions,
    COUNT(*) FILTER (WHERE p.is_fraud = TRUE)  AS fraud_count,
    COUNT(*) FILTER (WHERE p.is_fraud = FALSE) AS legit_count,
    ROUND(
        COUNT(*) FILTER (WHERE p.is_fraud = TRUE)::NUMERIC
        / NULLIF(COUNT(*), 0) * 100, 2
    )                                 AS fraud_rate_pct,
    ROUND(AVG(t.amount)::NUMERIC, 2)  AS avg_amount,
    ROUND(SUM(t.amount) FILTER (WHERE p.is_fraud = TRUE)::NUMERIC, 2) AS total_fraud_amount
FROM transactions t
LEFT JOIN predictions p ON p.transaction_id = t.id
GROUP BY DATE_TRUNC('day', t.created_at)
ORDER BY stat_date DESC;

-- ============================================================
-- DỮ LIỆU MẪU: Tài khoản admin mặc định
-- (Đổi password trước khi deploy!)
-- ============================================================
INSERT INTO users (username, email, hashed_password, role)
VALUES ('admin', 'admin@example.com',
        '$2b$12$placeholder_hash_change_before_deploy',
        'admin');

-- ============================================================
-- FUNCTION: Tự động tạo alert khi xác suất gian lận cao
-- ============================================================
CREATE OR REPLACE FUNCTION create_fraud_alert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.risk_level IN ('high', 'critical') THEN
        INSERT INTO alerts (prediction_id, alert_type, message)
        VALUES (
            NEW.id,
            CASE WHEN NEW.risk_level = 'critical' THEN 'critical_risk' ELSE 'high_risk' END,
            FORMAT('Giao dịch nghi ngờ gian lận: xác suất %.1f%% (mức độ: %s)',
                   NEW.fraud_probability * 100, NEW.risk_level)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_fraud_alert
    AFTER INSERT ON predictions
    FOR EACH ROW EXECUTE FUNCTION create_fraud_alert();
