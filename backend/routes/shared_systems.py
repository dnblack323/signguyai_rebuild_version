from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status

try:
    from ..core_runtime import get_database, get_tenant_id
    from ..models.base import utc_now
    from ..models.shared_systems import AIGeneratePayload, CommunityPostPayload, CommunityReplyPayload, NotePayload
    from ..repositories.shared_records import SharedRecordRepository
except ImportError:
    from core_runtime import get_database, get_tenant_id
    from models.base import utc_now
    from models.shared_systems import AIGeneratePayload, CommunityPostPayload, CommunityReplyPayload, NotePayload
    from repositories.shared_records import SharedRecordRepository

router = APIRouter(tags=["Shared Systems"])


AI_TOOLS = [
    {"id": "text_to_image", "name": "AI Image Concept Creator", "category": "Design", "intensity": "High", "description": "Create AI-generated concept images from text direction."},
    {"id": "idea_brainstormer", "name": "Idea Brainstormer", "category": "Branding", "intensity": "Low", "description": "Generate names, slogans, campaign ideas, and creative concepts."},
    {"id": "permit_research", "name": "Sign Permit Research", "category": "Business", "intensity": "Medium", "description": "Draft permit research guidance from city, sign type, and zoning context."},
    {"id": "photo_enhancer", "name": "Photo Enhancer Analyzer", "category": "Design", "intensity": "Medium", "description": "Assess print readiness, scaling risks, and enhancement needs."},
    {"id": "image_vectorizer", "name": "Vectorization Analyzer", "category": "Design", "intensity": "Medium", "description": "Review vectorization difficulty, cleanup needs, and production advice."},
    {"id": "font_identifier", "name": "Font Identifier", "category": "Design", "intensity": "Medium", "description": "Analyze text artwork and suggest likely fonts and alternatives."},
    {"id": "ai_sign_designer", "name": "AI Sign Designer", "category": "Design", "intensity": "High", "description": "Create sign concept guidance and visual concept direction."},
    {"id": "ai_banner_designer", "name": "AI Banner Designer", "category": "Design", "intensity": "High", "description": "Create banner layout guidance and concept direction."},
    {"id": "mockup_creator", "name": "Mockup Creator", "category": "Design", "intensity": "High", "description": "Generate realistic mockup scene direction for signs, wraps, and displays."},
    {"id": "vehicle_wrap_mockup", "name": "Vehicle Wrap Mockup Generator", "category": "Wraps", "intensity": "High", "description": "Generate vehicle wrap mockup direction by vehicle type and angle."},
    {"id": "logo_creator", "name": "Logo Creator", "category": "Branding", "intensity": "High", "description": "Generate original logo concept directions from brand inputs."},
    {"id": "branding_kit_generator", "name": "Branding Kit Generator", "category": "Branding", "intensity": "Medium", "description": "Create brand-system guidance with colors, typography, voice, and usage rules."},
    {"id": "business_copywriter", "name": "Business Copywriter", "category": "Marketing", "intensity": "Medium", "description": "Write service, homepage, ad, and marketing copy."},
    {"id": "document_composer", "name": "Document Composer", "category": "Documents", "intensity": "Medium", "description": "Draft proposals, scopes of work, payment letters, and project briefs."},
    {"id": "pricing_intelligence", "name": "Pricing Intelligence Assistant", "category": "Pricing", "intensity": "Medium", "description": "Review pricing scenarios and recommend margin, markup, and positioning improvements."},
    {"id": "blog_creator", "name": "Blog Article Creator", "category": "Marketing", "intensity": "Medium", "description": "Generate articles, titles, meta descriptions, CTAs, and image ideas."},
    {"id": "completed_job_post", "name": "Completed Job Post Creator", "category": "Marketing", "intensity": "Medium", "description": "Turn completed-job details into social captions, hashtags, and post tips."},
    {"id": "social_pack_generator", "name": "Social Media Pack Generator", "category": "Marketing", "intensity": "Medium", "description": "Produce batches of social content ideas and post suggestions."},
    {"id": "content_calendar", "name": "Content Calendar Creator", "category": "Marketing", "intensity": "Medium", "description": "Build a content calendar with themes, timing, and ideas."},
    {"id": "campaign_builder", "name": "Campaign Builder", "category": "Marketing", "intensity": "Medium", "description": "Design a campaign strategy with audience, content, channels, and metrics."},
    {"id": "wrap_cost_calculator", "name": "Vehicle Wrap Cost Calculator", "category": "Wraps", "intensity": "Medium", "description": "Create AI-assisted wrap pricing breakdowns and quote ranges."},
    {"id": "email_templates", "name": "Email Templates Generator", "category": "Communication", "intensity": "Medium", "description": "Generate reusable quote, invoice, approval, update, and follow-up email templates."},
    {"id": "review_responder", "name": "Review Responder", "category": "Communication", "intensity": "Low", "description": "Draft professional responses to customer reviews."},
    {"id": "assistant_chat", "name": "AI Business Assistant", "category": "Assistant", "intensity": "Medium", "description": "Answer sign-shop business questions and summarize operational context."},
]


def community_repo() -> SharedRecordRepository:
    return SharedRecordRepository(get_database(), "community_posts", "COMM")


def notes_repo() -> SharedRecordRepository:
    return SharedRecordRepository(get_database(), "shared_notes", "NOTE")


def ai_response_repo() -> SharedRecordRepository:
    return SharedRecordRepository(get_database(), "ai_responses", "AI")


@router.get("/community/posts")
async def list_community_posts(
    tenant_id: str = Depends(get_tenant_id),
    search: str = "",
    category: str = "",
    status_filter: str = Query(default="", alias="status"),
):
    repo = community_repo()
    await repo.ensure_indexes()
    filters = {}
    if category:
        filters["category"] = category
    if status_filter:
        filters["status"] = status_filter
    posts = await repo.list(tenant_id, filters)
    if search:
        needle = search.lower()
        posts = [post for post in posts if needle in f"{post.get('title', '')} {post.get('body', '')}".lower()]
    return {"posts": posts, "total": len(posts)}


@router.post("/community/posts", status_code=status.HTTP_201_CREATED)
async def create_community_post(payload: CommunityPostPayload, tenant_id: str = Depends(get_tenant_id)):
    repo = community_repo()
    await repo.ensure_indexes()
    return await repo.create(tenant_id, payload.model_dump(exclude_none=True))


@router.put("/community/posts/{post_id}")
async def update_community_post(post_id: str, patch: dict, tenant_id: str = Depends(get_tenant_id)):
    updated = await community_repo().update(tenant_id, post_id, patch)
    if not updated:
        raise HTTPException(status_code=404, detail="Community post not found")
    return updated


@router.post("/community/posts/{post_id}/reply")
async def reply_to_community_post(post_id: str, payload: CommunityReplyPayload, tenant_id: str = Depends(get_tenant_id)):
    repo = community_repo()
    post = await repo.get(tenant_id, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Community post not found")
    reply = payload.model_dump(exclude_none=True)
    reply["id"] = reply.get("id") or f"REPLY-{str(uuid4())[:8].upper()}"
    replies = [*post.get("replies", []), reply]
    return await repo.update(tenant_id, post_id, {"replies": replies, "is_answered": any(row.get("is_official") for row in replies)})


@router.post("/community/posts/{post_id}/upvote")
async def upvote_community_post(post_id: str, user_id: str = "preview-user", tenant_id: str = Depends(get_tenant_id)):
    repo = community_repo()
    post = await repo.get(tenant_id, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Community post not found")
    upvoted_by = set(post.get("upvoted_by", []))
    if user_id in upvoted_by:
        upvoted_by.remove(user_id)
        upvoted = False
    else:
        upvoted_by.add(user_id)
        upvoted = True
    updated = await repo.update(tenant_id, post_id, {"upvoted_by": list(upvoted_by), "upvotes": len(upvoted_by)})
    return {"upvotes": updated["upvotes"], "upvoted": upvoted}


@router.get("/community/stats")
async def community_stats(tenant_id: str = Depends(get_tenant_id)):
    posts = await community_repo().list(tenant_id)
    return {
        "total_posts": len(posts),
        "answered": sum(1 for post in posts if post.get("is_answered")),
        "open": sum(1 for post in posts if post.get("status") == "open"),
        "bug_reports": sum(1 for post in posts if post.get("category") == "bug_report"),
        "feature_requests": sum(1 for post in posts if post.get("category") == "feature_request"),
    }


@router.get("/notes")
async def list_notes(tenant_id: str = Depends(get_tenant_id), scope: str = "", status_filter: str = Query(default="", alias="status")):
    repo = notes_repo()
    await repo.ensure_indexes()
    filters = {}
    if scope:
        filters["scope"] = scope
    if status_filter:
        filters["status"] = status_filter
    return await repo.list(tenant_id, filters)


@router.post("/notes", status_code=status.HTTP_201_CREATED)
async def create_note(payload: NotePayload, tenant_id: str = Depends(get_tenant_id)):
    repo = notes_repo()
    await repo.ensure_indexes()
    return await repo.create(tenant_id, payload.model_dump(exclude_none=True))


@router.put("/notes/{note_id}")
async def update_note(note_id: str, patch: dict, tenant_id: str = Depends(get_tenant_id)):
    updated = await notes_repo().update(tenant_id, note_id, patch)
    if not updated:
        raise HTTPException(status_code=404, detail="Note not found")
    return updated


@router.get("/ai/tools")
async def list_ai_tools():
    return {"tools": AI_TOOLS, "total": len(AI_TOOLS)}


@router.post("/ai/generate")
async def generate_ai_response(payload: AIGeneratePayload, tenant_id: str = Depends(get_tenant_id)):
    tool = next((row for row in AI_TOOLS if row["id"] == payload.tool_id), None)
    if not tool:
        raise HTTPException(status_code=404, detail="AI tool not found")
    input_summary = ", ".join(f"{key}: {value}" for key, value in payload.input_data.items() if value)
    output = (
        f"Preview response for {tool['name']}.\n\n"
        f"Purpose: {tool['description']}\n\n"
        f"Input reviewed: {input_summary or 'No input provided'}\n\n"
        "Next implementation step: connect this tool to the production AI provider, add credit/cost tracking, "
        "and persist the final response against the linked customer/order/workspace record."
    )
    repo = ai_response_repo()
    await repo.ensure_indexes()
    record = await repo.create(tenant_id, {
        "tool": payload.tool_id,
        "tool_name": tool["name"],
        "input_data": payload.input_data,
        "output": output,
        "customer_id": payload.customer_id,
        "order_id": payload.order_id,
        "source_module": payload.source_module,
        "created_at": utc_now(),
    })
    return record
