import pymysql
import json

DB_HOST = "localhost"
DB_PORT = 3306
DB_USER = "root"
DB_PASS = "root123"
DB_NAME = "international_office2"

def run():
    conn = pymysql.connect(
        host=DB_HOST, port=DB_PORT,
        user=DB_USER, password=DB_PASS,
        database=DB_NAME, charset="utf8mb4"
    )
    cursor = conn.cursor()
    cursor.execute("SELECT Mou_id, University_id, Status, Other_documents FROM mou WHERE Is_deleted = 0")
    rows = cursor.fetchall()
    print("MOU ID | University ID | Status | Other Documents")
    print("-" * 60)
    for r in rows:
        print(f"{r[0]} | {r[1]} | {r[2]} | {r[3]}")
    cursor.close()
    conn.close()

if __name__ == "__main__":
    run()
