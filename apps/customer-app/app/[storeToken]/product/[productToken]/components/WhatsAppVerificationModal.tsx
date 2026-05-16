import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageSquare, Loader2, CheckCircle2 } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  phone: string;
  status: "idle" | "pending" | "verified";
  setStatus: (s: any) => void;
  onVerified: () => void;
}

const BUSINESS_WA_NUMBER = "12132132131";

export const WhatsAppVerificationModal = ({ isOpen, onClose, phone, status, setStatus, onVerified }: Props) => {
  useEffect(() => {
    if (!isOpen || status === "verified") return;

    const intervalId = setInterval(async () => {
      try {
        const cleanPhone = phone.replace(/\D/g, '');
        const checkPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        const res = await fetch(`http://localhost:8080/auth/status?phone=${checkPhone}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "VERIFIED") {
            setStatus("verified");
            clearInterval(intervalId);
            setTimeout(onVerified, 2000);
          }
        }
      } catch (error) { console.error("Polling check failed", error); }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [isOpen, status, phone]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-card w-full max-w-md rounded-2xl overflow-hidden border border-themed shadow-2xl"
          >
            <div className="bg-[#25D366] p-6 text-center relative">
              <button onClick={onClose} className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-1 transition" aria-label="Close">
                <X size={20} />
              </button>
              <MessageSquare size={44} className="text-white mx-auto mb-3" />
              <h2 className="text-2xl font-semibold text-white tracking-tight">Quick Verification</h2>
            </div>
            <div className="p-6 bg-card text-center">
              {status === "pending" ? (
                <>
                  <button
                    onClick={() => window.open(`https://wa.me/${BUSINESS_WA_NUMBER}?text=Hi`, "_blank")}
                    className="w-full py-3.5 mb-5 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold flex items-center justify-center gap-2 active:translate-y-px transition"
                  >
                    <MessageSquare size={18} /> Open WhatsApp Now
                  </button>
                  <div className="pt-4 border-t border-themed">
                    <Loader2 className="animate-spin text-[#25D366] mx-auto mb-2" size={26} />
                    <p className="text-sm font-medium">Waiting for verification...</p>
                  </div>
                </>
              ) : (
                <div className="py-8">
                  <div className="size-16 mx-auto mb-4 grid place-items-center rounded-full bg-emerald-500/15">
                    <CheckCircle2 size={32} className="text-[#25D366]" />
                  </div>
                  <h3 className="text-xl font-semibold tracking-tight">Verified!</h3>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
