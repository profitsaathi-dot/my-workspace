"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export function useUserNumbers() {
  const { token } = useParams<{ token: string }>();
  const [numbers, setNumbers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    
    const fetchNumbers = async () => {
      try {
        const res = await fetch(`/user/api/user/numbers`);
        const data = await res.json();
        
        // expected: ["9876543210", "9123456780"]
        setNumbers(data || []);
      } catch (err) {
        console.error("Failed to fetch numbers", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNumbers();
  }, [token]);

  return { numbers, loading };
}