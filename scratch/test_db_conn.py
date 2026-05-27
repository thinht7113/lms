import asyncio
import asyncpg
import sys

passwords = ["postgres", "thinh", "123456", "admin", "postgrespassword"]
users = ["postgres", "thinh"]
dbs = ["lms_database", "lms_db"]

async def test_conn():
    for user in users:
        for password in passwords:
            for db in dbs:
                try:
                    conn = await asyncpg.connect(
                        user=user,
                        password=password,
                        database=db,
                        host="localhost",
                        port=5432,
                        timeout=2
                    )
                    print(f"SUCCESS: user={user}, password={password}, database={db}")
                    await conn.close()
                    return
                except Exception as e:
                    print(f"TRY {user}/{password} -> {type(e).__name__}: {str(e)}")
                    pass
    print("ALL COMBINATIONS FAILED")

if __name__ == "__main__":
    asyncio.run(test_conn())
