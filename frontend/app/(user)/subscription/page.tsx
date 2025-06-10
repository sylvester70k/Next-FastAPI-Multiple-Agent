'use client';

import { useState, useEffect, Suspense } from 'react';
import { ISubscriptionPlan } from '@/lib/interface';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSearchParams } from 'next/navigation';

export default function Page() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SubscriptionPage />
        </Suspense>
    );
}

const SubscriptionPage = () => {
    const [plans, setPlans] = useState<ISubscriptionPlan[]>([]);
    const { user, setUser } = useAuth();
    const [isYearly, setIsYearly] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [requestPlanId, setRequestPlanId] = useState<string | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    useEffect(() => {
        if (success) {
            toast.success("Subscription created successfully");
        }
        if (canceled) {
            fetch('/api/user/subscription/requestCancel').then(res => res.json()).then(data => {
                if (data.success) {
                    setUser(data.user);
                    toast.error("Subscription creation canceled");
                }
            });
        }
    }, [success, canceled]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch plans
                const plansRes = await fetch("/api/user/subscription");
                const plansData = await plansRes.json();
                if (plansData.status) {
                    setPlans(plansData.plans);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                toast.error("Failed to load subscription data");
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        if (user?.requestPlanId) {
            setRequestPlanId(user.requestPlanId);
        }
    }, [user?.requestPlanId]);

    const handleUpgrade = async (planId: string) => {
        setIsLoading(true);
        try {
            const plan = plans.find(p => p._id === planId);
            if (!plan) throw new Error("Plan not found");

            console.log(user?.currentplan);
            if (!user?.currentplan || user.currentplan.type == 'free') {
                const response = await fetch("/api/user/subscription/createCheckoutSession", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ planId })
                });

                const data = await response.json();
                if (data.success) {
                    router.push(data.url);
                } else {
                    throw new Error(data.error || "Failed to create checkout session");
                }
            } else {
                const response = await fetch("/api/user/subscription/upgrade", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ planId })
                });

                const data = await response.json();
                if (data.success) {
                    toast.success("Your Request is being processed, please wait for the confirmation");
                    setUser(data.user);
                } else {
                    throw new Error(data.error || "Failed to upgrade subscription");
                }
            }
        } catch (error) {
            console.error("Error upgrading subscription:", error);
            toast.error(error instanceof Error ? error.message : "Failed to upgrade subscription");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDowngrade = async (planId: string) => {
        setIsLoading(true);
        try {
            const plan = plans.find(p => p._id === planId);
            if (!plan) throw new Error("Plan not found");

            const response = await fetch("/api/user/subscription/downgrade", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planId })
            });

            const data = await response.json();
            if (data.success) {
                toast.success("Your Request is being processed, please wait for the confirmation");
                setUser(data.user);
            } else {
                throw new Error(data.error || "Failed to downgrade subscription");
            }
        } catch (error) {
            console.error("Error downgrading subscription:", error);
            toast.error(error instanceof Error ? error.message : "Failed to downgrade subscription");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelPending = async (planId: string) => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/user/subscription/cancelPending", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planId })
            });

            const data = await response.json();
            if (data.success) {
                setRequestPlanId(null);
                toast.success("Your Request is canceled");
            } else {
                throw new Error(data.error || "Failed to cancel pending subscription");
            }
        } catch (error) {
            console.error("Error canceling pending subscription:", error);
            toast.error(error instanceof Error ? error.message : "Failed to cancel pending subscription");
        } finally {
            setIsLoading(false);
        }
    }


    return (
        <>
            <div
                className={`fixed inset-0 bg-black backdrop-blur-sm transition-opacity duration-500 opacity-100 pointer-events-auto z-20`}
            />
            <div className='fixed w-screen h-screen overflow-auto z-20 top-0 left-0 flex flex-col items-center pb-4'>
                <div className='absolute sm:top-[30px] sm:right-[30px] top-[10px] right-[10px] cursor-pointer' onClick={() => router.push('/echat')}>
                    <X width={28} height={28} className='text-white' />
                </div>
                <h1 className='mt-[84px] sm:mt-[106px] sm:text-[40px] text-[20px] font-bold text-center bg-gradient-to-r from-[#FFFFFF] to-[#FFFFFF99] bg-clip-text text-transparent leading-tight'>
                    Tailored plan for all business size
                </h1>
                <h5 className='text-[12px] sm:text-[16px] text-center text-[#AEB0B9] mt-4 sm:mt-[10px] max-sm:max-w-[308px]'>
                    We're a force of over 100 talents! A dynamic team of skilled individuals <br className="hidden sm:block" /> and tech pioneers, constantly pushing boundaries.
                </h5>
                <YearlyPlanTab isYearly={isYearly} setIsYearly={setIsYearly} />

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6 mt-4 sm:mt-[27px] gap-x-5 gap-y-[26px] w-full sm:w-fit justify-items-center">
                    {plans.filter((plan) => plan.isYearlyPlan === isYearly || plan.type == 'free').map((plan) => (
                        <PlanCard
                            key={plan._id}
                            plan={plan}
                            isYearly={isYearly}
                            currentplan={user?.currentplan || null}
                            planEndDate={user?.planEndDate || null}
                            onUpgrade={handleUpgrade}
                            onDowngrade={handleDowngrade}
                            requestPlanId={requestPlanId}
                            onCancelPending={handleCancelPending}
                            isLoading={isLoading}
                        />
                    ))}
                </div>
            </div>
        </>
    );
}

const YearlyPlanTab = ({ isYearly, setIsYearly }: { isYearly: boolean, setIsYearly: (isYearly: boolean) => void }) => {
    return (
        <div className='rounded-[56px] border border-[#FFFFFF1F] p-[6px] gap-2 bg-[#FFFFFF1F] mt-[10px] sm:mt-[18px] flex items-center text-[12px] sm:text-[16px]'>
            <div
                className={
                    `rounded-[56px] py-2 px-3 gap-2 text-white cursor-pointer border whitespace-nowrap
                    ${isYearly ? "border-[#FFFFFF1F] bg-[#FFFFFF52]" : "border-transparent"}`
                }
                onClick={() => setIsYearly(true)}
            >
                Bill yearly <span className='bg-[#020202] rounded-[20px] border border-[#FFFFFF1F] px-[11px] py-[1px]'>+ Bonus 10%</span>
            </div>
            <div
                className={`rounded-[56px] py-2 px-3 gap-2 text-white cursor-pointer border whitespace-nowrap
                    ${!isYearly ? "border-[#FFFFFF1F] bg-[#FFFFFF52]" : "border-transparent"}`}
                onClick={() => setIsYearly(false)}
            >
                Monthly Plan
            </div>
        </div>
    );
}

const PlanCard = ({
    plan,
    isYearly,
    currentplan,
    planEndDate,
    onUpgrade,
    onDowngrade,
    onCancelPending,
    isLoading,
    requestPlanId
}: {
    plan: ISubscriptionPlan,
    isYearly: boolean,
    currentplan: ISubscriptionPlan | null,
    planEndDate: Date | null,
    onUpgrade: (planId: string) => void,
    onDowngrade: (planId: string) => void,
    onCancelPending: (planId: string) => void,
    isLoading: boolean,
    requestPlanId: string | null
}) => {
    const isCurrentPlan = (currentplan?._id === plan._id && (plan.type == 'free' || (planEndDate && new Date(planEndDate).getTime() >= new Date().getTime()))) || (!currentplan && plan.price === 0);
    const canUpgrade = currentplan && plan.price > currentplan.price || (!currentplan && plan.price > 0);
    const canDowngrade = currentplan && plan.price < currentplan.price;
    const isRequestPlan = requestPlanId === plan._id;

    return (
        <div className='bg-[rgba(255,255,255,0.12)] p-[1px] bg-no-repeat rounded-[20px] bg-[linear-gradient(-195deg,rgba(255,255,255,0.7)_0%,rgba(255,255,255,0)_20%)] w-full sm:w-[440px] max-sm:max-w-[330px]'>
            <div className="bg-[#020202] rounded-[20px] p-3 sm:p-6 h-full relative border border-[#FFFFFF1F] flex flex-col">
                {/* Pending Badge */}
                {
                    isRequestPlan && (
                        <div className='absolute top-5 right-6 bg-[#020202] text-[#AEB0B9] text-[14px] font-medium rounded-full px-3 py-[2px] border border-[#FFFFFF26]'>
                            Pending...
                        </div>
                    )
                }
                {/* Plan name */}
                <div className="absolute inset-0 bg-radial-white pointer-events-none rounded-[18px]"></div>
                <div className="text-[16px] font-medium text-white">{plan.name}</div>

                {/* Price section */}
                <div className="flex items-baseline gap-1 mt-3 sm:mt-8">
                    <span className="text-[36px] sm:text-[48px] font-semibold text-[#AEB0B9]">
                        <span className='text-[#FFFFFF]'>$</span>
                        {plan.isYearlyPlan ? (plan.price / 12).toFixed(2) : plan.price}
                    </span>
                    <span className="text-[14px] sm:text-[16px] text-[#AEB0B9]">/ month</span>
                </div>

                <div className="mt-3 border-dashed border-[#FFFFFF33] h-[1px] w-full" />
                <div className='my-2 text-[14px] sm:text-[16px] text-[#AEB0B9]'>
                    Totalling to ${plan.isYearlyPlan ? plan.price : (plan.price * 12).toFixed(2)} yearly
                </div>
                <div className="my-2 border-dashed border-[#FFFFFF33] h-[1px] w-full" />

                <button
                    className={`w-full mt-3 sm:mt-7 py-2 rounded-full text-base sm:text-[16px] font-medium border h-11 hover:outline-none hover:border-transparent
                        ${isCurrentPlan
                            ? 'bg-[#FFFFFF14] text-white border-[#ffffff30]'
                            : 'bg-gradient-to-b from-[#FFFFFF] to-[#898989] text-black hover:opacity-90'
                        }`}
                    onClick={() => {
                        if (isCurrentPlan) return;
                        else if (isRequestPlan) onCancelPending(plan._id);
                        else if (canDowngrade) onDowngrade(plan._id);
                        else onUpgrade(plan._id);
                    }}
                    disabled={isLoading || isCurrentPlan}
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    ) : isCurrentPlan ? (
                        'Current Plan'
                    ) : isRequestPlan ? (
                        'Cancel Pending'
                    ) : canDowngrade ? (
                        'Downgrade Plan'
                    ) : (
                        'Upgrade Plan'
                    )}
                </button>

                <div className="mt-4 sm:mt-6 rounded-[12px] border border-[#F2F2F51F] py-4 sm:py-5 px-3 sm:px-4 bg-[url('/image/plan-bg.png')] bg-center h-fit">
                    <div className="text-[14px] text-[#7A7A82] mb-3">{plan.name} Plan includes:</div>
                    <div className='flex flex-col gap-2'>
                        {plan.features.map((feature) => (
                            <div className='flex items-start gap-2'>
                                <div className='!w-[14px] !h-[15px] mt-1'>
                                    <svg width="14" height="15" viewBox="0 0 14 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <rect x="0.75" y="1.25" width="12.5" height="12.5" rx="6.25" stroke="white" strokeWidth="1.5" />
                                        <path d="M4 7L4.98223 8.51112C5.31881 9.02894 6.03965 9.12089 6.49544 8.70417L10 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                                    </svg>
                                </div>
                                <div className='w-[calc(100%-14px)] text-[14px] text-white'>{feature}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};