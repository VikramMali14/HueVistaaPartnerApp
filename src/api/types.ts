/**
 * Response and request shapes. They mirror the backend DTOs (VikramMali14/HueVista) and the
 * website's copies in HueVistaFrontEnd/src/lib/types.ts — what the partner app reads.
 */

/** Must match the backend UserRole enum exactly (auth/model/UserRole.java). */
export type UserRole = "ADMIN" | "DISTRIBUTOR" | "RETAILER" | "PAINTER" | "CUSTOMER";
export type AuthProvider = "LOCAL" | "GOOGLE" | "ACCESS_CODE";

/** GET /api/auth/profile — and `user` inside every AuthResponse. */
export interface UserProfile {
  id: string;
  name: string;
  email?: string | null;
  picture?: string | null;
  provider: AuthProvider;
  role: UserRole;
  emailVerified?: boolean;
  phoneNumber?: string | null;
  phoneVerified?: boolean;
  hasPassword?: boolean;
  /** Still wearing the placeholder name a mobile sign-up is born with. */
  namePending?: boolean;
  welcomePending?: boolean;
  /** A shop's or a painter's customer profile: no sign-in of its own, reached by switching. */
  linkedProfile?: boolean;
  /** A shop or a painter only: whether its customer profile is switched on. */
  customerProfileEnabled?: boolean | null;
  /** What this session can switch to right now. */
  switchTo?: "CUSTOMER" | "SHOP" | "PAINTER" | null;
  /** A painter's: how many shops have them on their commission list (P19 is offered when there is one). */
  commissionShops?: number;
  /** A painter's: whether the HueVistaa team has switched their own books on (P14–P18). */
  workBooksEnabled?: boolean;
  /** The shops this account works at as staff — the HueVistaa Staff app is theirs. */
  staffOf?: { orgId: string; shopName: string }[];
  createdAt?: string;
  updatedAt?: string;
}

/** Every sign-in endpoint answers with this. Tokens are absent when a second step is needed. */
export interface AuthResponse {
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenType?: "Bearer";
  expiresIn?: number;
  user?: UserProfile | null;
  /** Admin accounts: an emailed code is required. The app sends admins to the website. */
  twoFactorRequired?: boolean | null;
  /** A shop on a new phone: finish at POST /api/auth/login/email-code. */
  emailCodeRequired?: boolean | null;
  challengeToken?: string | null;
  /** Where the code went, masked: s***@example.com */
  emailHint?: string | null;
  /** Issued once a shop's emailed code is confirmed; skips the code for 30 days. */
  deviceToken?: string | null;
  deviceTokenExpiresIn?: number | null;
  /** A shop or a painter with its customer profile on. The partner app stays on the business side. */
  chooseProfile?: boolean | null;
  /** A mobile sign-in with `intent: "shop"` for a number with no shop or painter behind it: nothing opened. */
  shopSignupRequired?: boolean | null;
  signupTicket?: string | null;
  personalAccount?: boolean | null;
}

/** POST /api/auth/phone/start. The same answer whether or not the number has an account. */
export interface PhoneCodeSent {
  /** Masked: *********3210 */
  phone: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
}

/** POST /api/auth/verify/phone/send */
export interface VerificationStatus {
  channel: "EMAIL" | "PHONE" | "PHONE_MOVE";
  destination: string;
  expiresInSeconds: number;
  cooldownSeconds: number;
}

/** POST /api/auth/verify/phone/move/confirm: what moved, and this account afterwards. */
export interface PhoneMoveResponse {
  profile: UserProfile;
  accountMoved: boolean;
  projectsMoved: number;
  imagesMoved: number;
  projectAllowanceMoved: number;
  aiCreditsMoved: number;
}

/** The backend's error body (GlobalExceptionHandler). */
export interface ErrorBody {
  status?: number;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Machine-readable hint, e.g. PRICE_LIST_OFF. */
  code?: string;
  reason?: string;
}
