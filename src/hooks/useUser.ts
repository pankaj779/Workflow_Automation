import { useState, useEffect, useCallback } from "react";
import { apiConfig } from "@/lib/api-config";

export interface User {
  email: string;
  role: "admin" | "user";
  isAdmin: boolean;
}

export function useUser(): {
  user: User | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
} {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch(`${apiConfig.baseUrl}/me`);
      const data = await res.json();
      setUser({
        email: data.email || "",
        role: data.role || "user",
        isAdmin: Boolean(data.isAdmin),
      });
    } catch {
      setUser({
        email: "",
        role: "user",
        isAdmin: false,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return { user, isLoading, refetch: fetchUser };
}
