export type Instinct = {
  id: string;
  updated_at: string;
  [key: string]: unknown;
};

export type Skill = {
  id: string;
  updated_at: string;
  [key: string]: unknown;
};

export type Scorecard = {
  id: string;
  session?: string;
  checks?: unknown;
  band?: string;
  raw?: string;
  created_at: string;
  [key: string]: unknown;
};

export type DeviceToken = {
  token: string;
  expires_at: string;
  created_at: string;
  email?: string | null;
};

export type WaitlistEntry = {
  email: string;
  created_at: string;
  source?: string;
};

export type EntitlementStatus =
  | "none"
  | "waitlisted"
  | "trialing"
  | "active"
  | "cancelled"
  | "unpaid";

export type Entitlement = {
  status: EntitlementStatus;
  plan: "subscription";
  price_aud_mo: number;
  trial_days: number;
  trial_ends_at: string | null;
  seats: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_live: boolean;
  updated_at: string | null;
};

/** In-memory stub store. Not durable. Not production. */
export class MemoryStore {
  tokens = new Map<string, DeviceToken>();
  instincts = new Map<string, Instinct>();
  skills = new Map<string, Skill>();
  scorecards: Scorecard[] = [];
  waitlist: WaitlistEntry[] = [];
  /** email -> entitlement */
  accounts = new Map<string, Entitlement>();
  /** stripe customer id -> email */
  customersById = new Map<string, string>();
  webhookEvents: Array<{ id: string; type: string; at: string }> = [];

  createDeviceToken(email?: string | null): DeviceToken {
    const token = `dev_${crypto.randomUUID().replace(/-/g, "")}`;
    const created_at = new Date().toISOString();
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    const record: DeviceToken = {
      token,
      created_at,
      expires_at: expires.toISOString(),
      email: email ?? null,
    };
    this.tokens.set(token, record);
    return record;
  }

  revokeToken(token: string | undefined): boolean {
    if (!token) return false;
    return this.tokens.delete(token);
  }

  hasToken(token: string | undefined): boolean {
    if (!token) return false;
    const rec = this.tokens.get(token);
    if (!rec) return false;
    return new Date(rec.expires_at).getTime() > Date.now();
  }

  getToken(token: string | undefined): DeviceToken | undefined {
    if (!token || !this.hasToken(token)) return undefined;
    return this.tokens.get(token);
  }

  defaultEntitlement(stripeLive = false): Entitlement {
    return {
      status: "none",
      plan: "subscription",
      price_aud_mo: 29,
      trial_days: 7,
      trial_ends_at: null,
      seats: 0,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      stripe_live: stripeLive,
      updated_at: null,
    };
  }

  entitlementForEmail(
    email: string | null | undefined,
    stripeLive = false
  ): Entitlement {
    if (!email) return this.defaultEntitlement(stripeLive);
    const key = email.trim().toLowerCase();
    const existing = this.accounts.get(key);
    if (!existing) return this.defaultEntitlement(stripeLive);
    return { ...existing, stripe_live: stripeLive || existing.stripe_live };
  }

  addWaitlist(email: string, source?: string): WaitlistEntry {
    const normalized = email.trim().toLowerCase();
    const existing = this.waitlist.find((e) => e.email === normalized);
    if (existing) return existing;
    const entry: WaitlistEntry = {
      email: normalized,
      created_at: new Date().toISOString(),
      source,
    };
    this.waitlist.push(entry);
    if (!this.accounts.has(normalized)) {
      this.accounts.set(normalized, {
        ...this.defaultEntitlement(),
        status: "waitlisted",
        updated_at: entry.created_at,
      });
    }
    return entry;
  }

  applyEntitlement(input: {
    email?: string | null;
    customer_id?: string | null;
    subscription_id?: string | null;
    status: EntitlementStatus;
    trial_ends_at?: string | null;
    seats?: number;
    stripe_live?: boolean;
  }): Entitlement | null {
    let email = input.email?.trim().toLowerCase() || null;
    if (!email && input.customer_id) {
      email = this.customersById.get(input.customer_id) ?? null;
    }
    if (!email) return null;

    if (input.customer_id) {
      this.customersById.set(input.customer_id, email);
    }

    const prev = this.accounts.get(email) ?? this.defaultEntitlement();
    const next: Entitlement = {
      ...prev,
      status: input.status,
      trial_ends_at:
        input.trial_ends_at === undefined
          ? prev.trial_ends_at
          : input.trial_ends_at,
      seats:
        input.seats ??
        (input.status === "trialing" || input.status === "active" ? 1 : 0),
      stripe_customer_id: input.customer_id ?? prev.stripe_customer_id,
      stripe_subscription_id:
        input.subscription_id ?? prev.stripe_subscription_id,
      stripe_live: input.stripe_live ?? prev.stripe_live,
      updated_at: new Date().toISOString(),
    };
    this.accounts.set(email, next);
    return next;
  }

  rememberWebhook(id: string, type: string): boolean {
    if (this.webhookEvents.some((e) => e.id === id)) return false;
    this.webhookEvents.unshift({
      id,
      type,
      at: new Date().toISOString(),
    });
    if (this.webhookEvents.length > 100) this.webhookEvents.length = 100;
    return true;
  }

  syncVault(body: {
    instincts?: Instinct[];
    skills?: Skill[];
  }): { accepted: string[]; conflicts: string[] } {
    const accepted: string[] = [];
    const conflicts: string[] = [];

    for (const instinct of body.instincts ?? []) {
      if (!instinct?.id) continue;
      const existing = this.instincts.get(instinct.id);
      const incomingUpdated = instinct.updated_at ?? new Date().toISOString();
      if (
        existing &&
        existing.updated_at &&
        new Date(existing.updated_at).getTime() >
          new Date(incomingUpdated).getTime()
      ) {
        conflicts.push(instinct.id);
        continue;
      }
      this.instincts.set(instinct.id, {
        ...instinct,
        updated_at: incomingUpdated,
      });
      accepted.push(instinct.id);
    }

    for (const skill of body.skills ?? []) {
      if (!skill?.id) continue;
      const existing = this.skills.get(skill.id);
      const incomingUpdated = skill.updated_at ?? new Date().toISOString();
      if (
        existing &&
        existing.updated_at &&
        new Date(existing.updated_at).getTime() >
          new Date(incomingUpdated).getTime()
      ) {
        conflicts.push(skill.id);
        continue;
      }
      this.skills.set(skill.id, {
        ...skill,
        updated_at: incomingUpdated,
      });
      accepted.push(skill.id);
    }

    return { accepted, conflicts };
  }

  addScorecard(
    payload: Omit<Scorecard, "id" | "created_at"> & {
      id?: string;
    }
  ): Scorecard {
    const card: Scorecard = {
      ...payload,
      id: payload.id ?? `sc_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
      created_at: new Date().toISOString(),
    };
    this.scorecards.unshift(card);
    return card;
  }
}

export const store = new MemoryStore();
