"use client";

import { useEffect, useState } from "react";

interface Item {
  id: number;
  name: string;
  description: string;
}

interface ApiStatus {
  message?: string;
  status?: string;
}

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch API status
        const statusResponse = await fetch(`${API_BASE_URL}/`);
        const statusData = await statusResponse.json();
        setApiStatus(statusData);

        // Fetch items
        const itemsResponse = await fetch(`${API_BASE_URL}/api/items`);
        const itemsData = await itemsResponse.json();
        setItems(itemsData);
        setLoading(false);
      } catch {
        setError("Failed to connect to the API. Make sure the backend is running on port 8000.");
        setLoading(false);
      }
    };

    fetchData();
  }, [API_BASE_URL]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-center mb-4 text-gray-900 dark:text-white">
            GUHack2025
          </h1>
          <p className="text-center text-xl text-gray-600 dark:text-gray-300 mb-12">
            Next.js Frontend + FastAPI Backend
          </p>

          {/* API Status Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">
              API Status
            </h2>
            {loading && (
              <p className="text-gray-600 dark:text-gray-400">Loading...</p>
            )}
            {error && (
              <div className="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-200 px-4 py-3 rounded">
                {error}
              </div>
            )}
            {apiStatus && !error && (
              <div className="space-y-2">
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">Message:</span> {apiStatus.message}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">Status:</span>{" "}
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {apiStatus.status}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Items List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">
              Items from API
            </h2>
            {loading && (
              <p className="text-gray-600 dark:text-gray-400">Loading items...</p>
            )}
            {!loading && !error && items.length > 0 && (
              <div className="grid gap-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                      {item.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {item.description}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                      ID: {item.id}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Start Guide */}
          <div className="mt-8 bg-blue-50 dark:bg-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">
              Quick Start
            </h3>
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <p><strong>Backend:</strong> cd backend && python main.py</p>
              <p><strong>Frontend:</strong> cd frontend && npm run dev</p>
              <p><strong>API Docs:</strong> <a href="http://localhost:8000/docs" className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">http://localhost:8000/docs</a></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
