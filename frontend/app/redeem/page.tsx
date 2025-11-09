"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45 }}
      className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-slate-50 py-10"
    >
      <div className="mx-auto max-w-6xl px-4">
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <Card className="mx-auto max-w-md shadow-sm bg-white/80 backdrop-blur-md border border-indigo-100">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                Redirecting
                <span className="text-sm text-gray-400 font-normal">Splitr Rewards</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
                  className="mx-auto mb-4 w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full"
                  role="status"
                  aria-live="polite"
                />
                <p className="text-gray-700 text-sm">Taking you to the Rewards center…</p>
                <p className="mt-3 text-[11px] text-gray-400">
                  If nothing happens, go to <span className="font-medium text-indigo-600">/rewards</span>.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
