# generate_test_csv.py — chạy trong thư mục fraud_api
import pandas as pd

df = pd.read_csv("creditcard.csv")

# Lấy 5 giao dịch fraud thật + 5 bình thường
fraud   = df[df["Class"] == 1].head(5)
normal  = df[df["Class"] == 0].head(5)
test_df = pd.concat([fraud, normal])

# Bỏ cột Class (API không nhận), đổi Time → time_seconds
test_df = test_df.drop(columns=["Class"])
test_df.to_csv("test_real.csv", index=False)
print("✅ Đã tạo test_real.csv")
print(test_df[["Time","Amount"]].to_string())