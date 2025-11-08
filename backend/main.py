from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

app = FastAPI(title="GUHack2025 API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Item(BaseModel):
    id: int
    name: str
    description: str

# In-memory storage for demo
items = [
    {"id": 1, "name": "Item 1", "description": "First item"},
    {"id": 2, "name": "Item 2", "description": "Second item"},
]

@app.get("/")
async def root():
    return {"message": "Welcome to GUHack2025 API", "status": "running"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/api/items", response_model=List[Item])
async def get_items():
    return items

@app.get("/api/items/{item_id}")
async def get_item(item_id: int):
    for item in items:
        if item["id"] == item_id:
            return item
    return {"error": "Item not found"}, 404

@app.post("/api/items", response_model=Item)
async def create_item(item: Item):
    items.append(item.dict())
    return item

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
