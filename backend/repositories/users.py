from datetime import timedelta

try:
    from ..shared.dates import utc_now
    from ..shared.ids import new_id
    from ..shared.indexes import ensure_collection_indexes
except ImportError:
    from shared.dates import utc_now
    from shared.ids import new_id
    from shared.indexes import ensure_collection_indexes


MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15
RESET_TOKEN_EXPIRY_MINUTES = 60


class UserRepository:
    collection_name = "users"

    def __init__(self, database):
        self.database = database
        self.collection = database[self.collection_name]
        self.login_attempts = database["login_attempts"]
        self.reset_tokens = database["password_reset_tokens"]

    async def ensure_indexes(self):
        await ensure_collection_indexes(self.collection, self.collection_name)
        await ensure_collection_indexes(self.login_attempts, "login_attempts")
        await ensure_collection_indexes(self.reset_tokens, "password_reset_tokens")

    async def find_by_email(self, email: str) -> dict | None:
        document = await self.collection.find_one({"email": email.lower().strip()})
        return self._public(document) if document else None

    async def get(self, user_id: str) -> dict | None:
        document = await self.collection.find_one({"id": user_id})
        return self._public(document) if document else None

    async def create(self, *, tenant_id: str, email: str, password_hash: str, full_name: str, role: str) -> dict:
        now = utc_now()
        document = {
            "id": new_id(),
            "tenant_id": tenant_id,
            "email": email.lower().strip(),
            "password_hash": password_hash,
            "full_name": full_name,
            "role": role,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
            "version": 1,
        }
        await self.collection.insert_one(document.copy())
        return self._public(document)

    async def update_password(self, user_id: str, password_hash: str) -> None:
        await self.collection.update_one(
            {"id": user_id},
            {"$set": {"password_hash": password_hash, "updated_at": utc_now()}, "$inc": {"version": 1}},
        )

    async def is_locked_out(self, email: str) -> bool:
        cutoff = utc_now() - timedelta(minutes=LOCKOUT_MINUTES)
        count = await self.login_attempts.count_documents(
            {"email": email.lower().strip(), "created_at": {"$gte": cutoff}}
        )
        return count >= MAX_FAILED_ATTEMPTS

    async def record_failed_attempt(self, email: str) -> None:
        await self.login_attempts.insert_one({"email": email.lower().strip(), "created_at": utc_now()})

    async def clear_failed_attempts(self, email: str) -> None:
        await self.login_attempts.delete_many({"email": email.lower().strip()})

    async def create_reset_token(self, user_id: str, token_hash: str) -> None:
        now = utc_now()
        await self.reset_tokens.update_many({"user_id": user_id, "used": False}, {"$set": {"used": True}})
        await self.reset_tokens.insert_one(
            {
                "user_id": user_id,
                "token_hash": token_hash,
                "used": False,
                "created_at": now,
                "expires_at": now + timedelta(minutes=RESET_TOKEN_EXPIRY_MINUTES),
            }
        )

    async def find_reset_token(self, token_hash: str) -> dict | None:
        return await self.reset_tokens.find_one({"token_hash": token_hash})

    async def mark_reset_token_used(self, token_hash: str) -> None:
        await self.reset_tokens.update_one({"token_hash": token_hash}, {"$set": {"used": True}})

    def _public(self, document: dict) -> dict:
        return {key: value for key, value in document.items() if key != "_id"}
