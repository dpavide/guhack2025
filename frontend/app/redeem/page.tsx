"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redeem page - redirects to /rewards
 * This exists for backward compatibility and user convenience
 */
export default function RedeemRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the rewards page
    router.replace("/rewards");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to rewards...</p>
      </div>
    </div>
  );
}
