import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "mba_admin";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET is missing or too short.");
  }
  return new TextEncoder().encode(secret);
}

// ─── Passwords ──────────────────────────────────────────────────────────────
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

// ─── TOTP 2FA ─────────────────────────────────────────────────────────────────
export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}
export function verifyTotp(token: string, secret: string): boolean {
  if (!secret || !token) return false;
  try {
    return authenticator.verify({ token: token.replace(/\s/g, ""), secret });
  } catch {
    return false;
  }
}
export async function totpQrDataUrl(secret: string, account: string, issuer: string): Promise<string> {
  return QRCode.toDataURL(authenticator.keyuri(account, issuer, secret));
}

// ─── Session tokens ───────────────────────────────────────────────────────────
export async function signSession(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload.role === "admin";
  } catch {
    return false;
  }
}
