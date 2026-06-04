import pymysql

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
    cursor.execute("DESCRIBE erp_users")
    print("Columns:")
    for col in cursor.fetchall():
        print(col)
    
    cursor.execute("SELECT * FROM erp_users LIMIT 5")
    print("\nSample Rows:")
    for row in cursor.fetchall():
        print(row)
        
    cursor.close()
    conn.close()

if __name__ == "__main__":
    run()
