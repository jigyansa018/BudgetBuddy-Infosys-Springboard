import sqlite3

connection = sqlite3.connect("budgetbuddy.db")

cursor = connection.cursor()

cursor.execute("""
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
    ORDER BY name
""")

tables = cursor.fetchall()

print("Tables in BudgetBuddy database:")

for table in tables:
    print("-", table[0])

connection.close()