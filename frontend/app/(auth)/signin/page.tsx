'use client'

import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";  
import { useEffect, useState } from "react";
import { LoginProps } from "@/lib/interface";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signIn, useSession } from "next-auth/react";
import FormInput from "@/components/echat/FormInput";
import FormBtn from "@/components/echat/FormBtn";
import ShadowBtn from "@/components/echat/ShadowBtn";
import { validateEmail, validatePassword } from "@/lib/utils";
import EmailIcon from "@/assets/email";
import RockIcon from "@/assets/rock";
import Loading from "@/assets/loading";
// import { useRecaptcha } from "@/app/hooks/useRecaptcha";
// import Cookies from "js-cookie";

const SignIn = () => {
  const [isLoading, setIsLoading] = useState({
    google: false,
    form: false,
  });
  const [formState, setFormState] = useState({
    email: "",
    password: "",
    error: "",
  });
  const router = useRouter();
  // const { executeRecaptcha } = useRecaptcha();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState({ ...formState, [e.target.name]: e.target.value });
  };

  const googleSignIn = async () => {
    try {
      setIsLoading(prev => ({ ...prev, google: true }));
      // Execute reCAPTCHA before Google sign in
      // const recaptchaToken = await executeRecaptcha('google_signin');
      
      // Cookies.set("recaptchaToken", recaptchaToken);
      const result = await signIn("google", {
        redirect: false,
        callbackUrl: "/echat",
      });
      setIsLoading(prev => ({ ...prev, google: false }));
      if (result?.error) {
        toast.error(result.error || "Sign in unsuccessful, please check your credentials.");
        return;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An unexpected error occurred.");
      console.log("error", error);
    }
  }

  const emailSignIn = async (data: LoginProps) => {
    if (!validateEmail(data.email)) {
      setFormState({ ...formState, error: "Invalid email address" });
      return;
    }
    if (!validatePassword(data.password)) {
      setFormState({ ...formState, error: "Invalid password" });
      return;
    }
    setIsLoading((prev) => ({ ...prev, form: true }));
    try {
      try {
        // Execute reCAPTCHA
        // const recaptchaToken = await executeRecaptcha('signin');
        
        const result = await signIn("credentials", {
          email: data.email,
          password: data.password,
          // recaptchaToken,
          redirect: false,
        });
        if (result?.error) {
          console.log("result", result.error);
          setFormState({ ...formState, error: "Incorrect email address or password" });
          return;
        } else {
          router.push("/echat");
        }
      } catch (error) {
        console.log("error", error);
        setFormState({ ...formState, error: "Incorrect email address or password" });
        return;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An unexpected error occurred.");
    } finally {
      setIsLoading((prev) => ({ ...prev, form: false }));
    }
  }

  const { data: session } = useSession();

  useEffect(() => {
    if (session) {
      router.push("/echat");
    }
  }, [session]);

  return (
    <div className="relative h-screen w-screen flex flex-col items-center justify-center bg-[#0B0B0D]">
      <div className="flex flex-col items-center justify-center shadow-signin bg-box-bg border-box-border border rounded-2xl px-6 py-7 max-w-full w-[438px] relative">
        {/* logo */}
        <Image src="/image/login/pixels.png" alt="logo" className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[380px] h-auto" width={380} height={380} />
        <button
          className="flex items-end bg-transparent border-none outline-none focus:outline-none py-0"
          onClick={() => router.push("/")}
        >
          <Image
            src="/image/login/logo.png"
            alt="logo"
            width={300}
            height={300}
            className="h-[60px] w-auto"
          />
        </button>
        <div className="mt-6 text-white text-xl font-bold">Get Started</div>
        <div className="mt-4 text-box-fontSub text-sm">Decentralized SuperAI Ecosystem</div>
        <div
          className="w-full flex flex-col items-center gap-4 mt-8"
        >
          {
            formState.error && (
              <div className="text-red-500 text-sm p-3 border-[#FF5A5A99] border rounded-md bg-[#FF5A5A1F] w-full">
                {formState.error}
              </div>
            )
          }
          <FormInput
            placeholder="Email Address"
            type="email"
            name="email"
            value={formState.email}
            onChange={handleChange}
            icon={<EmailIcon />}
            className="shadow-input"
          />
          <FormInput
            placeholder="Password"
            type="password"
            name="password"
            value={formState.password}
            onChange={handleChange}
            icon={<RockIcon />}
            className="shadow-input"
          />
        </div>
        <FormBtn
          value="Sign In"
          className="mt-6 shadow-btn-signin backdrop-blur-signin bg-btn-signin text-[#0A0A0A] h-[39px] rounded-md"
          onClick={() => emailSignIn(formState)}
          loading={isLoading.form}
          loadingText="Signing in..."
          loadingIcon={<Loading />}
        />
        <Link href="/signup" className="text-box-placeholder text-sm mt-6 underline hover:text-box-placeholder">Forgot Password?</Link>
        <div className="flex items-center w-full mt-7">
          <Separator className="flex-1 bg-[#808080]" />
          <span className="mx-4 text-[#808080] text-xs whitespace-nowrap">OR</span>
          <Separator className="flex-1 bg-[#808080]" />
        </div>
        <ShadowBtn
          className="w-full mt-6 rounded-md"
          mainClassName="border-[#2C2B30] border bg-[#292929] rounded-md shadow-btn-google text-white flex items-center justify-center gap-2"
          onClick={googleSignIn}
          disabled={isLoading.google}
        >
          {isLoading.google ? <Loading /> : <Image src="/image/google.png" alt="google" className="w-6 h-6" width={24} height={24} />}
          <span>{isLoading.google ? "Signing in with Google..." : "Sign In with Google"}</span>
        </ShadowBtn>
        <div className="flex items-center justify-center mt-4 gap-[2px]">
          <span className="text-box-fontSub text-sm">Don&apos;t have an account?</span>
          <Link href="/signup" className="text-box-placeholder text-sm underline hover:text-box-placeholder">Sign Up</Link>
        </div>
      </div>
      <Image src="/image/login/login-left.png" alt="logo" className="absolute bottom-0 left-0 w-[453px] h-auto max-xl:hidden" width={1000} height={1000} />
      <Image src="/image/login/login-right.png" alt="logo" className="absolute bottom-0 right-0 w-[453px] h-auto max-xl:hidden" width={1000} height={1000} />
    </div>
  );
};

export default SignIn;
