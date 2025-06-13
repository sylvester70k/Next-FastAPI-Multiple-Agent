'use client';

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { signIn } from "next-auth/react";
import { useSession } from "next-auth/react";
import Image from "next/image";

interface CodeProps {
  code: string;
}

const Verify = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(false);
  const [isContinue, setIsContinue] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [token, setToken] = useState("");
  const [id, setId] = useState("");

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get("token");
      if (!token) {
        return;
      }
      setIsLoading(true);
      try {
        const response = await fetch(`/api/auth/verify?token=${token}`);
        const data = await response.json();
        if (data.error) {
          toast.error(data.error);
        } else {
          setIsVerified(true);
          setId(data.id);
          setToken(data.token);
        }
      } catch (error) {
        console.log(error);
        if (error instanceof Error && error.message === "Access forbidden - your token is expired") {
          toast.error("Access forbidden - your token is expired");
        } else {
          toast.error("An unexpected error occurred");
        }
      } finally {
        setIsLoading(false);
      }
    }
    verifyEmail();
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CodeProps>();

  const onSubmit = async (code: CodeProps) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/auth/verify`, {
        method: "POST",
        body: JSON.stringify({ code: code.code, id: id }),
      });

      if (res.status === 200) {
        const result = await signIn("token", {
          token: token,
          redirect: false,
        });
        if (result?.error) {
          toast.error("Access forbidden - your token is expired");
          return;
        }
        router.push("/");
      } else {
        const data = await res.json();
        toast.error(data.message || "Verification failed");
      }
    } catch (error) {
      if (error instanceof Error && error.message === "Access forbidden - your token is expired") {
        toast.error("Access forbidden - your token is expired");
      } else {
        toast.error("An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const continueWithoutCode = async () => {
    setIsContinue(true);
    const result = await signIn("token", {
      token: token,
      redirect: false,
    });
    if (result?.error) {
      toast.error("Access forbidden - your token is expired");
      return;
    }
    setIsContinue(false);
    router.push("/");
  };

  const { data: session } = useSession();

  useEffect(() => {
    if (session) {
      router.push("/echat");
    }
  }, [session]);

  return (
    <>
      {isVerified ? (
        <div className="flex flex-col items-center justify-center min-h-screen text-buttonFont">
          <div className="flex items-end border-none outline-none focus:outline-none py-0 !mb-5 px-[120px]">
            <Image
              src="/image/logo-chat.png"
              alt="logo"
              className="h-16 w-auto"
              width={300}
              height={300}
            />
          </div>

          {/* form */}
          <div className="w-full max-w-sm p-6 space-y-4">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col items-start space-y-6"
            >
              <div className="w-full space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  type="text"
                  {...register("code", {
                    required: "Code is required",
                    pattern: {
                      value: /^[A-Za-z0-9]{6}$/,
                      message: "Code must be exactly 6 characters and contain only numbers and letters"
                    }
                  })}
                  className="w-full"
                />
                {errors.code && (
                  <p className="text-sm text-red-500">
                    {errors.code.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                variant="default"
                className="w-full h-10"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    Check Code...
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  </span>
                ) : (
                  "Check Code"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full h-10"
                disabled={isLoading}
                onClick={continueWithoutCode}
              >
                {isContinue ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  </span>
                ) : (
                  "Continue without Code"
                )}
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h2 className="text-xl font-semibold mb-10 text-[#E2E2E2]">
            {isLoading ? "Verifying email..." : "Verify your email to continue."}
          </h2>
          <Button
            type="button"
            variant="default"
            onClick={() => router.push("/signin")}
            className="h-10"
            disabled={isLoading}
          >
            Back to Login
          </Button>
        </div>
      )}
    </>
  );
};

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl mb-4 text-gray-600">Loading...</h1>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
        </div>
      </div>
    }>
      <Verify />
    </Suspense>
  );
}
