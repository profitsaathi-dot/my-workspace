"use client";

import React, { useState } from "react";
import { User, Mail, Phone, MapPin, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  comments: string;
}

interface Props {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
}

export default function CheckoutForm({ formData, setFormData }: Props) {
  const [showComments, setShowComments] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const inputClass =
    "w-full pl-11 pr-4 py-3 rounded-lg border border-themed bg-[color:var(--input)] text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] transition-all";

  return (
    <div className="space-y-3">
      <div className="relative">
        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <input name="name" value={formData.name} onChange={handleChange} type="text" placeholder="Full Name" className={inputClass} />
      </div>
      <div className="relative">
        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <input name="email" value={formData.email} onChange={handleChange} type="email" placeholder="Email Address" className={inputClass} />
      </div>
      <div className="relative">
        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <input name="phone" value={formData.phone} onChange={handleChange} type="tel" placeholder="Phone Number" className={inputClass} />
      </div>
      <div className="relative">
        <MapPin className="absolute left-4 top-4 text-muted-foreground" size={18} />
        <textarea name="address" value={formData.address} onChange={handleChange} rows={3} placeholder="Delivery Address" className={`${inputClass} resize-none`} />
      </div>

      <button
        type="button"
        onClick={() => setShowComments(!showComments)}
        className="px-2 text-xs font-medium text-[color:var(--accent)] flex items-center gap-1 hover:underline transition-colors"
      >
        <MessageSquare size={14} />
        {showComments ? "Remove instructions" : "Add delivery instructions?"}
      </button>

      <AnimatePresence>
        {showComments && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            <textarea
              name="comments"
              value={formData.comments}
              onChange={handleChange}
              placeholder="E.g. Ring the bell, Leave at the gate..."
              rows={3}
              className="w-full p-4 rounded-lg border border-themed bg-[color:var(--input)] text-foreground placeholder:text-muted-foreground text-sm outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] transition-all resize-none"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
