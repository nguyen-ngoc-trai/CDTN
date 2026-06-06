import joblib
import numpy as np

# Thay đường dẫn đúng file .pkl của bạn
model = joblib.load(r"D:\CDTN\fraud_api\ml_models\random_forest_fraud.pkl")

# Kiểm tra cấu trúc
print("Kiểu:", type(model))

# Nếu là dict
if isinstance(model, dict):
    print("Keys:", model.keys())
    clf = model["model"]
else:
    clf = model

# Kiểm tra feature names
if hasattr(clf, "feature_names_in_"):
    print("Feature names:", clf.feature_names_in_)
else:
    print("Không có feature_names_in_")

# Test predict với 1 dòng gian lận thật
X_test = np.array([[-1.3598, -0.0728, 2.5363, 1.3782, -0.3383,
                     0.4624, 0.2396, 0.0987, 0.3638, 0.0908,
                    -0.5516, -0.6178, -0.9914, -0.3112, 1.4682,
                    -0.4704, 0.2080, 0.0258, 0.4040, 0.2514,
                    -0.0183, 0.2778, -0.1105, 0.0669, 0.1285,
                    -0.1891, 0.1336, -0.0210, 0, 149.62]])  # V1-V28 + Time + Amount

proba = clf.predict_proba(X_test)
print("Xác suất [legit, fraud]:", proba)