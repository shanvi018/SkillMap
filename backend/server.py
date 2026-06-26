from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, Body, UploadFile, File
from fastapi.responses import Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta
import uuid
import bcrypt
import jwt
import logging
import secrets
import csv
import io
import re
import requests

# ---------- Config ----------
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


# ---------- Emergent Object Storage ----------
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_NAME = "skillmap"
_storage_key: Optional[str] = None


def init_storage() -> Optional[str]:
    global _storage_key
    if _storage_key:
        return _storage_key
    emergent_key = os.environ.get("EMERGENT_LLM_KEY")
    if not emergent_key:
        logging.warning("EMERGENT_LLM_KEY not set; object storage disabled")
        return None
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": emergent_key}, timeout=30)
        resp.raise_for_status()
        _storage_key = resp.json()["storage_key"]
        return _storage_key
    except Exception as e:
        logging.error(f"Storage init failed: {e}")
        return None


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(status_code=503, detail="Storage unavailable")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str) -> tuple:
    key = init_storage()
    if not key:
        raise HTTPException(status_code=503, detail="Storage unavailable")
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60,
    )
    if resp.status_code == 404:
        raise HTTPException(status_code=404, detail="Object not found")
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ---------- Username slug ----------
def slugify(name: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", (name or "").lower()).strip("-")
    return s[:32] or "user"


# ---------- DB ----------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ---------- Models ----------
LevelType = Literal["Beginner", "Intermediate", "Advanced", "Expert"]
StatusType = Literal["Learning", "Mastered", "Paused"]
CategoryType = Literal["Frontend", "Backend", "DevOps", "Design", "Data Science", "Mobile", "Other"]


class RegisterReq(BaseModel):
    name: str
    email: EmailStr
    password: str
    course: Optional[str] = ""
    branch: Optional[str] = ""
    year: Optional[str] = ""


class LoginReq(BaseModel):
    email: EmailStr
    password: str


class SkillIn(BaseModel):
    name: str
    category: CategoryType
    proficiency: int = Field(ge=0, le=100)
    level: Optional[LevelType] = None
    status: StatusType = "Learning"
    notes: Optional[str] = ""
    resources: List[str] = []


class SkillUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[CategoryType] = None
    proficiency: Optional[int] = Field(default=None, ge=0, le=100)
    level: Optional[LevelType] = None
    status: Optional[StatusType] = None
    notes: Optional[str] = None
    resources: Optional[List[str]] = None


class GoalIn(BaseModel):
    skillId: str
    targetLevel: LevelType
    targetProficiency: int = Field(ge=0, le=100)
    deadline: str  # ISO date
    title: Optional[str] = ""


class GoalUpdate(BaseModel):
    targetLevel: Optional[LevelType] = None
    targetProficiency: Optional[int] = Field(default=None, ge=0, le=100)
    deadline: Optional[str] = None
    title: Optional[str] = None
    completed: Optional[bool] = None


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    course: Optional[str] = None
    branch: Optional[str] = None
    year: Optional[str] = None
    bio: Optional[str] = None
    avatar: Optional[str] = None
    darkMode: Optional[bool] = None
    username: Optional[str] = None
    publicProfile: Optional[bool] = None


class BulkDeleteReq(BaseModel):
    ids: List[str]


# ---------- Helpers ----------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS),
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def proficiency_to_level(p: int) -> str:
    if p >= 85:
        return "Expert"
    if p >= 65:
        return "Advanced"
    if p >= 35:
        return "Intermediate"
    return "Beginner"


def public_user(u: dict) -> dict:
    return {
        "id": u["id"],
        "name": u.get("name", ""),
        "email": u.get("email", ""),
        "course": u.get("course", ""),
        "branch": u.get("branch", ""),
        "year": u.get("year", ""),
        "bio": u.get("bio", ""),
        "avatar": u.get("avatar", ""),
        "darkMode": u.get("darkMode", False),
        "username": u.get("username", ""),
        "publicProfile": u.get("publicProfile", True),
        "createdAt": u.get("createdAt"),
    }


async def ensure_unique_username(base: str, exclude_id: Optional[str] = None) -> str:
    cand = base
    suffix = 0
    while True:
        q = {"username": cand}
        if exclude_id:
            q["id"] = {"$ne": exclude_id}
        existing = await db.users.find_one(q)
        if not existing:
            return cand
        suffix += 1
        cand = f"{base}-{suffix}"


def clean_doc(d: dict) -> dict:
    if not d:
        return d
    d.pop("_id", None)
    return d


async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth[7:]
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return clean_doc(user)


async def seed_demo_skills(user_id: str):
    demos = [
        {"name": "React", "category": "Frontend", "proficiency": 70, "status": "Learning",
         "notes": "Hooks, context, suspense"},
        {"name": "Python", "category": "Backend", "proficiency": 80, "status": "Learning",
         "notes": "FastAPI, async, pydantic"},
        {"name": "Docker", "category": "DevOps", "proficiency": 45, "status": "Learning",
         "notes": "Containers and compose"},
        {"name": "Figma", "category": "Design", "proficiency": 55, "status": "Learning",
         "notes": "Wireframes and prototyping"},
        {"name": "Pandas", "category": "Data Science", "proficiency": 30, "status": "Paused",
         "notes": "Dataframes & cleaning"},
    ]
    now = datetime.now(timezone.utc).isoformat()
    docs = []
    for d in demos:
        sid = str(uuid.uuid4())
        docs.append({
            "id": sid,
            "userId": user_id,
            "name": d["name"],
            "category": d["category"],
            "proficiency": d["proficiency"],
            "level": proficiency_to_level(d["proficiency"]),
            "status": d["status"],
            "notes": d["notes"],
            "resources": [],
            "createdAt": now,
            "updatedAt": now,
        })
    if docs:
        await db.skills.insert_many(docs)
        # history entries
        await db.skill_history.insert_many([
            {"id": str(uuid.uuid4()), "skillId": s["id"], "userId": user_id,
             "proficiency": s["proficiency"], "recordedAt": now}
            for s in docs
        ])


# ---------- Auth Routes ----------
@api_router.post("/auth/register")
async def register(req: RegisterReq):
    email = req.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    uid = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    username = await ensure_unique_username(slugify(req.name))
    user_doc = {
        "id": uid,
        "name": req.name,
        "email": email,
        "passwordHash": hash_password(req.password),
        "course": req.course or "",
        "branch": req.branch or "",
        "year": req.year or "",
        "bio": "",
        "avatar": "",
        "username": username,
        "publicProfile": True,
        "darkMode": False,
        "createdAt": now,
    }
    await db.users.insert_one(user_doc)
    await seed_demo_skills(uid)
    token = create_token(uid, email)
    return {"token": token, "user": public_user(user_doc)}


@api_router.post("/auth/login")
async def login(req: LoginReq):
    email = req.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user.get("passwordHash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user = clean_doc(user)
    token = create_token(user["id"], user["email"])
    return {"token": token, "user": public_user(user)}


@api_router.post("/auth/guest")
async def guest_login():
    uid = str(uuid.uuid4())
    email = f"guest_{uid[:8]}@skillmap.demo"
    now = datetime.now(timezone.utc).isoformat()
    username = await ensure_unique_username(f"guest-{uid[:6]}")
    user_doc = {
        "id": uid,
        "name": "Guest Explorer",
        "email": email,
        "passwordHash": hash_password(uuid.uuid4().hex),
        "course": "Computer Science",
        "branch": "Software Engineering",
        "year": "3rd Year",
        "bio": "Exploring SkillMap as a guest",
        "avatar": "",
        "username": username,
        "publicProfile": True,
        "darkMode": False,
        "createdAt": now,
        "isGuest": True,
    }
    await db.users.insert_one(user_doc)
    await seed_demo_skills(uid)
    token = create_token(uid, email)
    return {"token": token, "user": public_user(user_doc)}


@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return public_user(user)


# ---------- Skills Routes ----------
@api_router.get("/skills")
async def list_skills(user: dict = Depends(get_current_user)):
    cursor = db.skills.find({"userId": user["id"]}, {"_id": 0})
    return await cursor.to_list(2000)


@api_router.post("/skills")
async def create_skill(skill: SkillIn, user: dict = Depends(get_current_user)):
    sid = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    level = skill.level or proficiency_to_level(skill.proficiency)
    doc = {
        "id": sid,
        "userId": user["id"],
        "name": skill.name,
        "category": skill.category,
        "proficiency": skill.proficiency,
        "level": level,
        "status": skill.status,
        "notes": skill.notes or "",
        "resources": skill.resources or [],
        "createdAt": now,
        "updatedAt": now,
    }
    await db.skills.insert_one(doc)
    await db.skill_history.insert_one({
        "id": str(uuid.uuid4()), "skillId": sid, "userId": user["id"],
        "proficiency": skill.proficiency, "recordedAt": now,
    })
    await db.activity.insert_one({
        "id": str(uuid.uuid4()), "userId": user["id"], "type": "created",
        "skillId": sid, "skillName": skill.name, "at": now,
    })
    return clean_doc(doc)


@api_router.put("/skills/{skill_id}")
async def update_skill(skill_id: str, payload: SkillUpdate, user: dict = Depends(get_current_user)):
    existing = await db.skills.find_one({"id": skill_id, "userId": user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Skill not found")
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if "proficiency" in updates and "level" not in updates:
        updates["level"] = proficiency_to_level(updates["proficiency"])
    now = datetime.now(timezone.utc).isoformat()
    updates["updatedAt"] = now
    await db.skills.update_one({"id": skill_id}, {"$set": updates})
    if "proficiency" in updates and updates["proficiency"] != existing.get("proficiency"):
        await db.skill_history.insert_one({
            "id": str(uuid.uuid4()), "skillId": skill_id, "userId": user["id"],
            "proficiency": updates["proficiency"], "recordedAt": now,
        })
        await db.activity.insert_one({
            "id": str(uuid.uuid4()), "userId": user["id"], "type": "updated",
            "skillId": skill_id, "skillName": existing["name"],
            "from": existing.get("proficiency", 0), "to": updates["proficiency"], "at": now,
        })
    updated = await db.skills.find_one({"id": skill_id}, {"_id": 0})
    return updated


@api_router.delete("/skills/bulk")
async def bulk_delete_skills(req: BulkDeleteReq, user: dict = Depends(get_current_user)):
    res = await db.skills.delete_many({"id": {"$in": req.ids}, "userId": user["id"]})
    await db.skill_history.delete_many({"skillId": {"$in": req.ids}, "userId": user["id"]})
    await db.goals.delete_many({"skillId": {"$in": req.ids}, "userId": user["id"]})
    return {"deleted": res.deleted_count}


@api_router.delete("/skills/{skill_id}")
async def delete_skill(skill_id: str, user: dict = Depends(get_current_user)):
    res = await db.skills.delete_one({"id": skill_id, "userId": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Skill not found")
    await db.skill_history.delete_many({"skillId": skill_id, "userId": user["id"]})
    await db.goals.delete_many({"skillId": skill_id, "userId": user["id"]})
    return {"deleted": 1}


@api_router.get("/skills/{skill_id}/history")
async def skill_history(skill_id: str, user: dict = Depends(get_current_user)):
    cursor = db.skill_history.find(
        {"skillId": skill_id, "userId": user["id"]}, {"_id": 0}
    ).sort("recordedAt", 1)
    return await cursor.to_list(1000)


# ---------- Goals Routes ----------
def compute_goal_status(goal: dict, skill: Optional[dict]) -> str:
    if goal.get("completed"):
        return "Completed"
    if not skill:
        return "At Risk"
    if skill.get("proficiency", 0) >= goal["targetProficiency"]:
        return "Completed"
    deadline = goal.get("deadline")
    try:
        dl = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
    except Exception:
        return "On Track"
    now = datetime.now(timezone.utc)
    if dl < now:
        return "Overdue"
    days_left = (dl - now).days
    needed = goal["targetProficiency"] - skill.get("proficiency", 0)
    if days_left < 14 and needed > 30:
        return "At Risk"
    return "On Track"


@api_router.get("/goals")
async def list_goals(user: dict = Depends(get_current_user)):
    goals = await db.goals.find({"userId": user["id"]}, {"_id": 0}).to_list(1000)
    skills = await db.skills.find({"userId": user["id"]}, {"_id": 0}).to_list(2000)
    skill_map = {s["id"]: s for s in skills}
    for g in goals:
        skill = skill_map.get(g["skillId"])
        g["status"] = compute_goal_status(g, skill)
        g["skillName"] = skill["name"] if skill else "Unknown"
        g["currentProficiency"] = skill["proficiency"] if skill else 0
    return goals


@api_router.post("/goals")
async def create_goal(goal: GoalIn, user: dict = Depends(get_current_user)):
    gid = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": gid,
        "userId": user["id"],
        "skillId": goal.skillId,
        "title": goal.title or "",
        "targetLevel": goal.targetLevel,
        "targetProficiency": goal.targetProficiency,
        "deadline": goal.deadline,
        "completed": False,
        "createdAt": now,
    }
    await db.goals.insert_one(doc)
    return clean_doc(doc)


@api_router.put("/goals/{goal_id}")
async def update_goal(goal_id: str, payload: GoalUpdate, user: dict = Depends(get_current_user)):
    existing = await db.goals.find_one({"id": goal_id, "userId": user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Goal not found")
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    await db.goals.update_one({"id": goal_id}, {"$set": updates})
    return await db.goals.find_one({"id": goal_id}, {"_id": 0})


@api_router.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str, user: dict = Depends(get_current_user)):
    await db.goals.delete_one({"id": goal_id, "userId": user["id"]})
    return {"deleted": 1}


# ---------- Profile ----------
@api_router.get("/profile")
async def get_profile(user: dict = Depends(get_current_user)):
    return public_user(user)


@api_router.put("/profile")
async def update_profile(payload: ProfileUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if "username" in updates:
        raw = slugify(updates["username"])
        if not raw or len(raw) < 3:
            raise HTTPException(status_code=400, detail="Username must be 3+ characters (letters/numbers/hyphens)")
        # If unchanged, skip uniqueness check
        if raw != user.get("username"):
            taken = await db.users.find_one({"username": raw, "id": {"$ne": user["id"]}})
            if taken:
                raise HTTPException(status_code=400, detail="Username already taken")
            updates["username"] = raw
        else:
            updates.pop("username")
    if updates:
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
    refreshed = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return public_user(refreshed)


@api_router.get("/public/profile/{username}")
async def public_profile(username: str):
    user = await db.users.find_one({"username": username}, {"_id": 0})
    if not user or not user.get("publicProfile", True):
        raise HTTPException(status_code=404, detail="Profile not found")
    skills = await db.skills.find({"userId": user["id"]}, {"_id": 0}).to_list(2000)
    # Aggregations for public stats
    total = len(skills)
    mastered = sum(1 for s in skills if s.get("level") == "Expert")
    avg = round(sum(s.get("proficiency", 0) for s in skills) / total, 1) if total else 0
    activity = await db.activity.find({"userId": user["id"]}, {"_id": 0, "at": 1}).to_list(5000)
    streak = compute_streak([a["at"] for a in activity])
    return {
        "user": {
            "name": user.get("name", ""),
            "username": user.get("username", ""),
            "course": user.get("course", ""),
            "branch": user.get("branch", ""),
            "year": user.get("year", ""),
            "bio": user.get("bio", ""),
            "avatar": user.get("avatar", ""),
        },
        "stats": {"total": total, "mastered": mastered, "avgProficiency": avg, "streak": streak},
        "skills": [
            {
                "name": s.get("name", ""),
                "category": s.get("category", ""),
                "proficiency": s.get("proficiency", 0),
                "level": s.get("level", ""),
                "status": s.get("status", ""),
            }
            for s in skills
        ],
    }


# ---------- Avatar Upload / Serve (object storage) ----------
@api_router.post("/upload/avatar")
async def upload_avatar(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    data = await file.read()
    if len(data) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be under 2MB")
    ext = (file.filename or "img").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "png"
    if ext not in {"png", "jpg", "jpeg", "gif", "webp"}:
        ext = "png"
    path = f"{APP_NAME}/avatars/{user['id']}/{uuid.uuid4()}.{ext}"
    result = put_object(path, data, file.content_type or "image/png")
    avatar_url = f"/api/avatar/{user['id']}?v={uuid.uuid4().hex[:8]}"
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"avatarPath": result["path"], "avatar": avatar_url}},
    )
    return {"avatar": avatar_url, "path": result["path"]}


@api_router.get("/avatar/{user_id}")
async def serve_avatar(user_id: str):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "avatarPath": 1})
    if not user or not user.get("avatarPath"):
        raise HTTPException(status_code=404, detail="No avatar")
    data, content_type = get_object(user["avatarPath"])
    return Response(content=data, media_type=content_type)


@api_router.delete("/profile")
async def delete_account(user: dict = Depends(get_current_user)):
    uid = user["id"]
    await db.users.delete_one({"id": uid})
    await db.skills.delete_many({"userId": uid})
    await db.goals.delete_many({"userId": uid})
    await db.skill_history.delete_many({"userId": uid})
    await db.activity.delete_many({"userId": uid})
    return {"deleted": 1}


# ---------- Stats ----------
@api_router.get("/stats")
async def get_stats(user: dict = Depends(get_current_user)):
    skills = await db.skills.find({"userId": user["id"]}, {"_id": 0}).to_list(2000)
    total = len(skills)
    mastered = sum(1 for s in skills if s.get("level") == "Expert")
    avg = round(sum(s.get("proficiency", 0) for s in skills) / total, 1) if total else 0
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    added_this_week = sum(1 for s in skills if s.get("createdAt", "") >= week_ago)
    activity = await db.activity.find(
        {"userId": user["id"]}, {"_id": 0}
    ).sort("at", -1).to_list(5)
    return {
        "total": total,
        "mastered": mastered,
        "avgProficiency": avg,
        "addedThisWeek": added_this_week,
        "recentActivity": activity,
        "goalPercent": min(100, int(avg)) if total else 0,
    }


# ---------- Gamification ----------
ACHIEVEMENTS = [
    {"id": "first_step", "name": "First Step", "desc": "Add your first skill", "icon": "Sparkles"},
    {"id": "five_skills", "name": "Skill Collector", "desc": "Track 5 skills", "icon": "Library"},
    {"id": "ten_skills", "name": "Polymath", "desc": "Track 10 skills", "icon": "Brain"},
    {"id": "first_expert", "name": "Mastery", "desc": "Reach Expert level", "icon": "Trophy"},
    {"id": "three_experts", "name": "Triple Threat", "desc": "Master 3 skills", "icon": "Award"},
    {"id": "first_goal", "name": "Goal Setter", "desc": "Create your first goal", "icon": "Target"},
    {"id": "goal_done", "name": "Finisher", "desc": "Complete a goal", "icon": "CheckCircle2"},
    {"id": "streak_3", "name": "Warming Up", "desc": "3-day update streak", "icon": "Flame"},
    {"id": "streak_7", "name": "Week Warrior", "desc": "7-day update streak", "icon": "Zap"},
    {"id": "all_categories", "name": "Renaissance", "desc": "Skill in 5+ categories", "icon": "Globe"},
]


def compute_streak(activity_dates: List[str]) -> int:
    if not activity_dates:
        return 0
    days = sorted(set(a[:10] for a in activity_dates), reverse=True)
    today = datetime.now(timezone.utc).date().isoformat()
    yesterday = (datetime.now(timezone.utc).date() - timedelta(days=1)).isoformat()
    if days[0] != today and days[0] != yesterday:
        return 0
    streak = 1
    prev = datetime.fromisoformat(days[0]).date()
    for d in days[1:]:
        cur = datetime.fromisoformat(d).date()
        if (prev - cur).days == 1:
            streak += 1
            prev = cur
        else:
            break
    return streak


@api_router.get("/gamification")
async def gamification(user: dict = Depends(get_current_user)):
    skills = await db.skills.find({"userId": user["id"]}, {"_id": 0}).to_list(2000)
    goals = await db.goals.find({"userId": user["id"]}, {"_id": 0}).to_list(1000)
    activity = await db.activity.find({"userId": user["id"]}, {"_id": 0, "at": 1}).to_list(5000)
    streak = compute_streak([a["at"] for a in activity])
    experts = sum(1 for s in skills if s.get("level") == "Expert")
    categories = len(set(s.get("category") for s in skills))
    completed_goals = sum(1 for g in goals if g.get("completed"))

    flags = {
        "first_step": len(skills) >= 1,
        "five_skills": len(skills) >= 5,
        "ten_skills": len(skills) >= 10,
        "first_expert": experts >= 1,
        "three_experts": experts >= 3,
        "first_goal": len(goals) >= 1,
        "goal_done": completed_goals >= 1,
        "streak_3": streak >= 3,
        "streak_7": streak >= 7,
        "all_categories": categories >= 5,
    }
    unlocked = [{**a, "unlocked": flags.get(a["id"], False)} for a in ACHIEVEMENTS]
    return {
        "streak": streak,
        "totalUnlocked": sum(1 for a in unlocked if a["unlocked"]),
        "totalAchievements": len(ACHIEVEMENTS),
        "achievements": unlocked,
    }


# ---------- Password Reset ----------
class ForgotReq(BaseModel):
    email: EmailStr


class ResetReq(BaseModel):
    token: str
    password: str


@api_router.post("/auth/forgot-password")
async def forgot_password(req: ForgotReq):
    email = req.email.lower()
    user = await db.users.find_one({"email": email})
    # Always return success to avoid email enumeration
    if user:
        token = secrets.token_urlsafe(32)
        expires = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        await db.password_reset_tokens.insert_one({
            "id": str(uuid.uuid4()),
            "token": token,
            "userId": user["id"],
            "expiresAt": expires,
            "used": False,
        })
        logger.info(f"Password reset link for {email}: /reset-password?token={token}")
        return {"ok": True, "resetToken": token}  # exposed for demo (no email service)
    return {"ok": True}


@api_router.post("/auth/reset-password")
async def reset_password(req: ResetReq):
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    rec = await db.password_reset_tokens.find_one({"token": req.token, "used": False})
    if not rec:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    expires = datetime.fromisoformat(rec["expiresAt"])
    if expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token expired")
    await db.users.update_one({"id": rec["userId"]}, {"$set": {"passwordHash": hash_password(req.password)}})
    await db.password_reset_tokens.update_one({"token": req.token}, {"$set": {"used": True}})
    return {"ok": True}


# ---------- CSV Import / Export ----------
@api_router.get("/skills/export")
async def export_skills(user: dict = Depends(get_current_user)):
    skills = await db.skills.find({"userId": user["id"]}, {"_id": 0}).to_list(2000)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["name", "category", "proficiency", "level", "status", "notes", "resources"])
    for s in skills:
        w.writerow([
            s.get("name", ""), s.get("category", ""), s.get("proficiency", 0),
            s.get("level", ""), s.get("status", ""), s.get("notes", ""),
            "|".join(s.get("resources", [])),
        ])
    from fastapi.responses import Response
    return Response(content=buf.getvalue(), media_type="text/csv",
                    headers={"Content-Disposition": "attachment; filename=skillmap-skills.csv"})


class CSVImportReq(BaseModel):
    csv: str


@api_router.post("/skills/import")
async def import_skills(req: CSVImportReq, user: dict = Depends(get_current_user)):
    reader = csv.DictReader(io.StringIO(req.csv))
    now = datetime.now(timezone.utc).isoformat()
    docs = []
    for row in reader:
        try:
            prof = int(float(row.get("proficiency", 0) or 0))
        except Exception:
            prof = 0
        prof = max(0, min(100, prof))
        cat = row.get("category", "Other")
        if cat not in ["Frontend", "Backend", "DevOps", "Design", "Data Science", "Mobile", "Other"]:
            cat = "Other"
        status = row.get("status", "Learning")
        if status not in ["Learning", "Mastered", "Paused"]:
            status = "Learning"
        name = (row.get("name") or "").strip()
        if not name:
            continue
        docs.append({
            "id": str(uuid.uuid4()),
            "userId": user["id"],
            "name": name,
            "category": cat,
            "proficiency": prof,
            "level": proficiency_to_level(prof),
            "status": status,
            "notes": row.get("notes", ""),
            "resources": [r for r in (row.get("resources", "") or "").split("|") if r],
            "createdAt": now,
            "updatedAt": now,
        })
    if docs:
        await db.skills.insert_many(docs)
        await db.skill_history.insert_many([
            {"id": str(uuid.uuid4()), "skillId": d["id"], "userId": user["id"],
             "proficiency": d["proficiency"], "recordedAt": now}
            for d in docs
        ])
    return {"imported": len(docs)}


# ---------- Heatmap ----------
@api_router.get("/heatmap")
async def heatmap(user: dict = Depends(get_current_user)):
    since = (datetime.now(timezone.utc) - timedelta(days=365)).isoformat()
    cursor = db.activity.find(
        {"userId": user["id"], "at": {"$gte": since}}, {"_id": 0, "at": 1}
    )
    items = await cursor.to_list(5000)
    buckets = {}
    for a in items:
        day = a["at"][:10]
        buckets[day] = buckets.get(day, 0) + 1
    return [{"date": k, "count": v} for k, v in buckets.items()]


@api_router.get("/")
async def root():
    return {"message": "SkillMap API", "status": "ok"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("username", unique=True, sparse=True)
    await db.skills.create_index("userId")
    await db.goals.create_index("userId")
    await db.skill_history.create_index("skillId")
    await db.activity.create_index([("userId", 1), ("at", -1)])
    # Initialize object storage (non-blocking on failure)
    init_storage()
    # Backfill usernames for any legacy users
    async for u in db.users.find({"$or": [{"username": None}, {"username": {"$exists": False}}]}, {"_id": 0, "id": 1, "name": 1}):
        base = slugify(u.get("name", "user"))
        un = await ensure_unique_username(base)
        await db.users.update_one({"id": u["id"]}, {"$set": {"username": un, "publicProfile": True}})


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
