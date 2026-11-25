import type { en } from "./en";

/** The languages the app speaks. */
export type Language = "en" | "hi";

type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };

/** Every string table has English's keys, in any wording: a key Hindi lacks is a type error. */
export type Messages = Widen<typeof en>;
