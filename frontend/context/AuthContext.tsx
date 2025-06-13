'use client'
import { createContext, useContext, useEffect, useState, useRef } from "react";
import { AuthContextType, User } from "@/lib/interface";
import { signOut, useSession } from "next-auth/react";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [verifyCode, setVerifyCode] = useState<string | null>("");
  const [user, setUser] = useState<User | null>(null);
  const [requestPlanId, setRequestPlanId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { data: session } = useSession();

  const fetchUserData = async () => {
    try {
      const res = await fetch(`/api/user/profile`);
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setRequestPlanId(data.user.requestPlanId);
      } else {
        signOut();
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
      signOut();
    }
  }

  useEffect(() => {
    if (session?.user && !user) {
      fetchUserData();
    }
  }, [session]);

  return (
    <AuthContext.Provider
      value={{
        verifyCode,
        setVerifyCode,
        user,
        setUser,
        isLoading,
        setIsLoading,
        requestPlanId,
        setRequestPlanId
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
