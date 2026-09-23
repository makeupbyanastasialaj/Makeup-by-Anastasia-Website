import { randomBytes, randomInt } from "crypto";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I

/** Opaque unique id used as a Table Storage RowKey. */
export function newId(): string {
  return randomBytes(16).toString("hex");
}

/** Short, human-friendly public booking reference in the form AL-XXXXXX. */
export function newPublicId(): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `AL-${s}`;
}
