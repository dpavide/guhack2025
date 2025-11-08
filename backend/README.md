# Backend (FastAPI)

This is the FastAPI backend for the GUHack2025 project.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Server

```bash
python main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, you can access:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints

- `GET /` - Root endpoint with welcome message
- `GET /api/health` - Health check endpoint
- `GET /api/items` - Get all items
- `GET /api/items/{item_id}` - Get a specific item by ID
- `POST /api/items` - Create a new item
