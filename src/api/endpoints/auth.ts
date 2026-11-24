/**
 * /api/auth/** — signing in and the profile. Backend: auth/controller/{AuthController,
 * PhoneAuthController}.java.
 */
import { api } from "../instance";
import type { AuthResponse, PhoneCodeSent, PhoneMoveResponse, UserProfile, VerificationStatus } from "../types";

const open = { auth: false } as const;

export const authApi = {
  /** The same answer whether or not the number has an account — never implies either. */
  phoneStart: (phone: string) => api.request<PhoneCodeSent>("api/auth/phone/start", { ...open, body: { phone } }),

  /**
   * Always sent with `intent: "shop"`, as the partner website sends it: a number with no shop or
   * painter behind it — nothing at all, or only a personal customer account — opens nothing and
   * answers `shopSignupRequired`. A painter's or a shop's number signs in; a shop on a new phone is
   * asked for its emailed code first (`emailCodeRequired`), unless `deviceToken` says this phone
   * confirmed one lately. A number held unconfirmed by another account answers 409
   * PHONE_ON_UNCONFIRMED_ACCOUNT and leaves the code unspent; sent again with `notMyAccount`, the
   * number comes off that account.
   */
  phoneVerify: (body: { phone: string; code: string; deviceToken?: string; notMyAccount?: boolean }) =>
    api.request<AuthResponse>("api/auth/phone/verify", { ...open, body: { ...body, intent: "shop" } }),

  /** Email and password. A shop on a new phone answers emailCodeRequired; an admin, twoFactorRequired. */
  login: (body: { email: string; password: string; deviceToken?: string }) =>
    api.request<AuthResponse>("api/auth/login", { ...open, body }),

  /** A shop's emailed code. The answer carries the deviceToken to keep. */
  shopEmailCode: (body: { challengeToken: string; code: string }) =>
    api.request<AuthResponse>("api/auth/login/email-code", { ...open, body }),

  shopEmailCodeResend: (challengeToken: string) =>
    api.request<AuthResponse>("api/auth/login/email-code/resend", { ...open, body: { challengeToken } }),

  profile: () => api.request<UserProfile>("api/auth/profile"),

  updateProfile: (body: { name: string }) => api.request<UserProfile>("api/auth/profile", { method: "PATCH", body }),

  /** Confirming the account's mobile number: a code texted to it (or to a new number). */
  sendPhoneCode: (phoneNumber?: string) => api.request<VerificationStatus>("api/auth/verify/phone/send", { body: { phoneNumber } }),

  confirmPhoneCode: (code: string) => api.request<UserProfile>("api/auth/verify/phone/confirm", { body: { code } }),

  /**
   * After sendPhoneCode answered PHONE_ON_CUSTOMER_ACCOUNT: text a code to the number, to move the
   * customer account it signs in to into this account's customer profile.
   */
  sendPhoneMoveCode: (phoneNumber: string) =>
    api.request<VerificationStatus>("api/auth/verify/phone/move/send", { body: { phoneNumber } }),

  /** That code: the account moves in, is closed, and the number is confirmed here. */
  confirmPhoneMove: (code: string) => api.request<PhoneMoveResponse>("api/auth/verify/phone/move/confirm", { body: { code } }),

  /** Revokes every refresh token on the account. */
  logout: () => api.request<unknown>("api/auth/logout", { method: "POST" }),
};
