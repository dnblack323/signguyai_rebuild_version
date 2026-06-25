from fastapi import APIRouter, Depends, HTTPException, status

try:
    from ..core_runtime import get_database, get_tenant_id
    from ..models.customers import CustomerPayload
    from ..repositories.customers import CustomerRepository
except ImportError:
    from core_runtime import get_database, get_tenant_id
    from models.customers import CustomerPayload
    from repositories.customers import CustomerRepository

router = APIRouter(prefix="/customers", tags=["Customers"])


def repository() -> CustomerRepository:
    return CustomerRepository(get_database())


@router.get("")
async def list_customers(tenant_id: str = Depends(get_tenant_id)):
    repo = repository()
    await repo.ensure_indexes()
    return await repo.list(tenant_id)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_customer(payload: CustomerPayload, tenant_id: str = Depends(get_tenant_id)):
    repo = repository()
    await repo.ensure_indexes()
    return await repo.create(tenant_id, payload.model_dump(exclude_none=True))


@router.get("/{customer_id}")
async def get_customer(customer_id: str, tenant_id: str = Depends(get_tenant_id)):
    customer = await repository().get(tenant_id, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.put("/{customer_id}")
async def replace_customer(customer_id: str, payload: CustomerPayload, tenant_id: str = Depends(get_tenant_id)):
    customer = await repository().replace(tenant_id, customer_id, payload.model_dump(exclude_none=True))
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer
