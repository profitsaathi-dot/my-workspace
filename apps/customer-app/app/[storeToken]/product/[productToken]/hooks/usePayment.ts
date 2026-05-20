import { useState } from "react";
import { useRouter,useParams } from "next/navigation";
import { toast } from "@workspace/ui";
import { Product, Offer } from "../types";
import { useStoreInfo } from "../../../context/store-info-context";

interface PaymentProps {
  product: Product | null;
  qty: number;
  total: number;
  finalPrice: number;
  formData: { name: string; email: string; phone: string; address: string; comments: string; };
  appliedOffer: Offer | null;
  dynamicPriceToken?: string; // Optional dynamic price token
}

export const usePayment = () => {
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const router = useRouter();
     const { storeToken } = useParams<{ storeToken: string }>();
     const token = Array.isArray(storeToken) ? storeToken[0] : storeToken;
     const { info: storeInfo } = useStoreInfo();

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (document.getElementById("razorpay-script")) return resolve(true);
      const script = document.createElement("script");
      script.id = "razorpay-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const createOrder = async (props: PaymentProps) => {
    if (!props.product) throw new Error("Product missing");
    const payload = {
      customerName: props.formData.name,
      customerEmail: props.formData.email,
      phoneNumber: props.formData.phone,
      address: props.formData.address,
      productId: props.product.id,
      quantity: props.qty,
      unitPrice: props.finalPrice,
      totalAmount: props.total,
      offerId: props.appliedOffer?.offerId || null,
      offerApplied: !!props.appliedOffer,
      purchaseType: "DIRECT",
      comments: props.formData.comments || "-",
      dynamicPriceToken: props.dynamicPriceToken || null, // Include dynamic price token
    };

    const res = await fetch("/user/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Order creation failed");
    return await res.json();
  };

  // Offline (UPI QR / bank transfer) flow: just create the order and hand the
  // orderId back so the UI can render the QR or bank details and collect a
  // payment-proof screenshot. No Razorpay round-trip.
  const startOfflinePayment = async (props: PaymentProps) => {
    if (!props.product) return null;
    if (!props.formData.name || !props.formData.phone || !props.formData.address) {
      toast.error("Please fill name, phone and address");
      return null;
    }
    if (!/^[6-9]\d{9}$/.test(props.formData.phone)) {
      toast.error("Enter valid Indian phone number");
      return null;
    }
    try {
      setIsPaymentLoading(true);
      const orderData = await createOrder(props);
      return orderData;
    } catch (err) {
      console.error(err);
      toast.error("Order creation failed");
      return null;
    } finally {
      setIsPaymentLoading(false);
    }
  };

  const finishOfflinePayment = (orderId: string) => {
    router.push(`/${token}/order-success?orderId=${orderId}`);
  };

  const startRazorpayPayment = async (props: PaymentProps) => {
    if (!props.product) return;
    
    // Basic validation — name, phone and address are required; email is optional.
    if (!props.formData.name || !props.formData.phone || !props.formData.address) {
      toast.error("Please fill name, phone and address");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(props.formData.phone)) {
      toast.error("Enter valid Indian phone number");
      return;
    }

    try {
      setIsPaymentLoading(true);
      const orderData = await createOrder(props);

      const res = await fetch("/user/api/payment/razorpay-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: props.total, orderId: orderData.orderId }),
      });

      const razorOrder = await res.json();
      const loaded = await loadRazorpayScript();
      
      if (!loaded) {
        toast.error("Razorpay failed to load");
        setIsPaymentLoading(false);
        return;
      }

      // Razorpay rejects descriptions over ~255 chars and the seller name is
      // shown in the header — keep both within safe lengths.
      const safeStoreName = (storeInfo?.storeName?.trim() || "ProfitSaathi Stores").slice(0, 64);
      const safeDescription = (props.product.name || "").slice(0, 240);

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: razorOrder.amount,
        currency: "INR",
        order_id: razorOrder.id,
        name: safeStoreName,
        description: safeDescription,
        prefill: {
          name: props.formData.name,
          ...(props.formData.email ? { email: props.formData.email } : {}),
          contact: props.formData.phone,
        },
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch("/user/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                orderId: orderData.orderId,
                amount: props.total,
              }),
            });

            if (!verifyRes.ok) throw new Error("Verification failed");
            router.push(`/${token}/order-success?orderId=${orderData.orderId}`);
          } catch (err) {
            console.error("Verification error", err);
            toast.error("Payment succeeded but verification failed");
          }
        },
        modal: {
          ondismiss: async () => {
            await fetch("/user/api/payment/failure", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: orderData.orderId,
                reason: "USER_CLOSED",
                amount: props.total,
              }),
            });
            toast("Payment cancelled");
            setIsPaymentLoading(false);
          },
        },
        theme: {
          color:
            (typeof window !== "undefined" &&
              getComputedStyle(document.documentElement).getPropertyValue("--accent").trim()) ||
            "#10b981",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      toast.error("Payment initiation failed");
      setIsPaymentLoading(false);
    }
  };

  return {
    startRazorpayPayment,
    startOfflinePayment,
    finishOfflinePayment,
    isPaymentLoading,
  };
};