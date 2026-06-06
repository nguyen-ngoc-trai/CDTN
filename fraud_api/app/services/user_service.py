from sqlalchemy.ext.asyncio import AsyncSession
from app.models.orm import User

async def get_user_by_id(db: AsyncSession, user_id: str):
    return await db.get(User, user_id)
