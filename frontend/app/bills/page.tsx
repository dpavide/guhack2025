"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function BillsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl">
        {/* Bills Title */}
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">Bills</h1>

        {/* Next Payment Section */}
        <h2 className="text-xl font-semibold text-gray-700 mb-4 text-center">Next payment</h2>

        {/* Payment Information Frame */}
        <Card className="shadow-lg bg-white/70 backdrop-blur-md border-blue-100">
          <CardContent className="pt-6">
            <div className="space-y-6">
              {/* Amount Due and Bill Date - Side by Side */}
              <div className="flex gap-8 justify-between">
                {/* Amount Due */}
                <div>
                  <p className="text-sm text-gray-500 mb-1">Amount due</p>
                  <p className="text-2xl font-bold text-gray-800">GBP 24</p>
                </div>

                {/* Bill Date */}
                <div>
                  <p className="text-sm text-gray-500 mb-1">Bill date</p>
                  <p className="text-lg font-medium text-gray-800">4th June</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <Button className="flex-1" size="lg">
                  Pay now
                </Button>
                <Button variant="outline" className="flex-1" size="lg">
                  View history
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

