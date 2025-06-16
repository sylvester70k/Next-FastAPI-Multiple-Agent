'use client'

import React, { useState, useEffect } from 'react';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { Dialog, DialogTitle, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from "sonner";
import { Loader2, CreditCard } from 'lucide-react';

// Load Stripe (make sure to use your publishable key)
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentMethodUpdateProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CardForm: React.FC<{ onSuccess: () => void; onClose: () => void }> = ({ onSuccess, onClose }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [isCardElementReady, setIsCardElementReady] = useState(false);

  useEffect(() => {
    // Create setup intent when component mounts
    const createSetupIntent = async () => {
      try {
        const response = await fetch('/api/stripe/setup-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        if (data.success) {
          setClientSecret(data.clientSecret);
        } else {
          toast(data.error || "Failed to initialize payment method setup", {
            style: { backgroundColor: 'red', color: 'white' }
          });
        }
      } catch (error) {
        console.error('Error creating setup intent:', error);
        toast("Failed to initialize payment method setup", {
          style: { backgroundColor: 'red', color: 'white' }
        });
      }
    };

    createSetupIntent();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret || !isCardElementReady) {
      return;
    }

    setIsLoading(true);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setIsLoading(false);
      return;
    }

    try {
      // Confirm the setup intent
      const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
        }
      });

      if (error) {
        toast(error.message, {
          style: { backgroundColor: 'red', color: 'white' }
        });
      } else if (setupIntent.payment_method) {
        // Update the default payment method
        const response = await fetch('/api/stripe/update-payment-method', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentMethodId: setupIntent.payment_method as string })
        });

        const data = await response.json();
        if (data.success) {
          toast("Payment method updated successfully");
          onSuccess();
          onClose();
        } else {
          toast(data.error || "Failed to update payment method", {
            style: { backgroundColor: 'red', color: 'white' }
          });
        }
      }
    } catch (error) {
      console.error('Error updating payment method:', error);
      toast("Failed to update payment method", {
        style: { backgroundColor: 'red', color: 'white' }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#ffffff',
        '::placeholder': {
          color: '#888888',
        },
        backgroundColor: 'transparent',
      },
      invalid: {
        color: '#ff6b6b',
        iconColor: '#ff6b6b'
      }
    },
    hidePostalCode: false
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-[#FFFFFF05] border border-[#FFFFFF14] rounded-md p-4">
        <label className="block text-sm font-medium text-[#E2E2E2] mb-2">
          Card Information
        </label>
        <div className="bg-[#FFFFFF08] border border-[#FFFFFF20] rounded-md p-3">
          <CardElement 
            options={cardElementOptions} 
            onChange={(e) => setIsCardElementReady(e.complete)}
          />
        </div>
      </div>
      
      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className='text-[#AEB0B9] border border-[#FFFFFF26] rounded-md text-sm font-medium hover:bg-[#FFFFFF14] hover:border-[#FFFFFF40]'
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || isLoading || !isCardElementReady}
          className='bg-gradient-to-b from-[#FAFAFA] to-[#DFDFDF] text-[#000000] rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50'
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Updating...
            </>
          ) : (
            'Update Payment Method'
          )}
        </Button>
      </div>
    </form>
  );
};

const PaymentMethodUpdate: React.FC<PaymentMethodUpdateProps> = ({
  open,
  onClose,
  onSuccess
}) => {
  const elementsOptions: StripeElementsOptions = {
    appearance: {
      theme: 'night',
      variables: {
        colorPrimary: '#ffffff',
        colorBackground: '#020202',
        colorText: '#ffffff',
        colorDanger: '#ff6b6b',
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px'
      }
    }
  };

  return (
    <Dialog
      open={open}
    >
      <DialogContent className='bg-black/80 backdrop-blur-sm bg-[#020202] border border-[#FFFFFF1F] rounded-2xl text-white min-w-[500px]'>
        <DialogTitle className='text-white flex items-center justify-between font-semibold text-lg pb-2'>
          <div className="flex items-center gap-2">
            <CreditCard className="text-white" size={24} />
            Update Payment Method
          </div>
        </DialogTitle>
        
        <div className="text-[#AEB0B9] pb-3">
          <div className="mb-4 text-sm">
            Add a new payment method for your subscription. Your current payment method will be replaced.
          </div>
          
          <Elements stripe={stripePromise} options={elementsOptions}>
            <CardForm onSuccess={onSuccess} onClose={onClose} />
          </Elements>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentMethodUpdate; 