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

export type Entitlement = {
  status: "none" | "waitlisted" | "trialing" | "active" | "cancelled" | "unpaid";
  plan: "subscription";
  price_aud_mo: number;
  trial_days: number;
  trial_ends_at: string | null;
  seats: number;
  stripe_live: false;
};

/** In-memory stub store. Not durable. Not production. */
export class MemoryStore {
  tokens = new Map<string, DeviceToken>();
  instincts = new Map<string, Instinct>();
  skills = new Map<string, Skill>();
  scorecards: Scorecard[] = [];
  waitlist: WaitlistEntry[] = [];
  /** email -> entitlement (stub; no Stripe) */
  accounts = new Map<string, Entitlement>();

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

  defaultEntitlement(): Entitlement {
    return {
      status: "none",
      plan: "subscription",
      price_aud_mo: 29,
      trial_days: 7,
      trial_ends_at: null,
      seats: 0,
      stripe_live: false,
    };
  }

  entitlementForEmail(email: string | null | undefined): Entitlement {
    if (!email) return this.defaultEntitlement();
    const key = email.trim().toLowerCase();
    return this.accounts.get(key) ?? this.defaultEntitlement();
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
      });
    }
    return entry;
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

  addScorecard(payload: Omit<Scorecard, "id" | "created_at"> & {
    id?: string;
  }): Scorecard {
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
