/**
 * OTP service — wraps Spring's `/api/v1/otp/*` endpoints.
 *
 * Spring expects `{ request: <AES-encrypted JSON> }` (the same `AESRequest`
 * envelope the products endpoint uses). On success a Kafka message is
 * published to `email-topic` and the existing notification_service consumer
 * dispatches the templated email.
 */
import type { NextRequest } from "next/server";
import { apiClient } from "@/src/lib/http/client";
import { apiRoutes } from "@/src/config/api-routes";

export interface ApiResponseOtp {
  success: boolean;
  message: string;
}

export const otpService = {
  /** Body must already be AES-encrypted by the caller. */
  sendEmail(req: NextRequest, encrypted: string): Promise<ApiResponseOtp> {
    return apiClient.post<ApiResponseOtp>(
      apiRoutes.otp.sendEmail,
      { request: encrypted },
      { authFromRequest: req }
    );
  },

  verifyEmail(req: NextRequest, encrypted: string): Promise<ApiResponseOtp> {
    return apiClient.post<ApiResponseOtp>(
      apiRoutes.otp.verifyEmail,
      { request: encrypted },
      { authFromRequest: req }
    );
  },
};
