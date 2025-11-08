# guhack2025

A full-stack web application with a **Next.js frontend** and **Python FastAPI backend**.

## Project Structure

```
guhack2025/
├── backend/          # FastAPI backend
│   ├── main.py       # FastAPI application
│   ├── requirements.txt
│   └── README.md
└── frontend/         # Next.js frontend
    ├── app/          # Next.js app directory
    ├── package.json
    └── README.md
```

## Prerequisites

- Python 3.8 or higher
- Node.js 18 or higher
- npm or yarn

## Quick Start

### Backend Setup (FastAPI)

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create and activate a virtual environment:
```bash
python3 -m venv venv  # On Windows: python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the backend server:
```bash
python main.py
```

The API will be available at `http://localhost:8000`

- API Documentation (Swagger): `http://localhost:8000/docs`
- Alternative API Docs (ReDoc): `http://localhost:8000/redoc`

### Frontend Setup (Next.js)

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## API Endpoints

- `GET /` - Welcome message
- `GET /api/health` - Health check
- `GET /api/items` - Get all items
- `GET /api/items/{item_id}` - Get item by ID
- `POST /api/items` - Create a new item

## Development

### Backend Development

The backend uses FastAPI with:
- Automatic API documentation
- CORS middleware configured for frontend integration
- Pydantic models for data validation
- Uvicorn as the ASGI server

### Frontend Development

The frontend uses Next.js with:
- TypeScript for type safety
- Tailwind CSS for styling
- App Router for routing
- API integration with the FastAPI backend

## Building for Production

### Backend

The backend can be run in production using:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend

Build the frontend for production:
```bash
cd frontend
npm run build
npm start
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
