import { useState, useEffect } from "react";
import { useStoreInfo } from "../[storeToken]/context/store-info-context";

export interface AuthUserData {
  name: string;
  email: string;
  phone: string;
  address: string;
}

/**
 * Resolves whether the current visitor is registered (by hitting `/api/user`)
 * and prefills checkout-friendly user data from their default address.
 * Only runs for INDIVIDUAL sellers, not SOCIAL sellers.
 */
export const useAuth = () => {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isRegisteredUser, setIsRegisteredUser] = useState(false);
  const [userData, setUserData] = useState<AuthUserData>({ name: "", email: "", phone: "", address: "" });
  
  const { isSocial, loading: storeLoading } = useStoreInfo();

  useEffect(() => {
    // Wait for store info to load
    if (storeLoading) {
      return;
    }

    // Skip auth check for social sellers
    if (isSocial) {
      setIsCheckingAuth(false);
      setIsRegisteredUser(false);
      return;
    }

    // Only check auth for individual sellers
    const checkUserSession = async () => {
      try {
        const res = await fetch("/user/api/user");
        if (res.ok) {
          const data = await res.json();
          setIsRegisteredUser(true);

          const res2 = await fetch("/user/api/address");
          let formattedAddress = "";
          let contact = "";

          if (res2.ok) {
            const addressData = await res2.json();
            if (Array.isArray(addressData) && addressData.length > 0) {
              const target = addressData.find((addr: any) => addr.isDefault) || addressData[0];
              formattedAddress = `${target.street}, ${target.city}, ${target.state}${target.zip ? ` - ${target.zip}` : ""}`;
              contact = target.contactNumber || "";
            }
          }
          setUserData({ name: data.name || "", email: data.email || "", phone: contact, address: formattedAddress });
        }
      } catch (err) {
        setIsRegisteredUser(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkUserSession();
  }, [isSocial, storeLoading]);

  return { isCheckingAuth, isRegisteredUser, setIsRegisteredUser, userData };
};
