import type { Adapter } from "next-auth/adapters";
import { supabase } from "./supabase";

function now() {
  return new Date().toISOString();
}

/** Custom NextAuth adapter backed by Supabase JS client (service role). */
export function SupabaseAdapter(): Adapter {
  return {
    async createUser(user) {
      const row = {
        id: crypto.randomUUID(),
        name: user.name ?? null,
        email: user.email,
        emailVerified: user.emailVerified?.toISOString() ?? null,
        image: user.image ?? null,
        createdAt: now(),
        updatedAt: now(),
      };
      const { data, error } = await supabase
        .from("User")
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return {
        ...data,
        emailVerified: data.emailVerified ? new Date(data.emailVerified) : null,
      };
    },

    async getUser(id) {
      const { data } = await supabase
        .from("User")
        .select()
        .eq("id", id)
        .single();
      if (!data) return null;
      return {
        ...data,
        emailVerified: data.emailVerified ? new Date(data.emailVerified) : null,
      };
    },

    async getUserByEmail(email) {
      const { data } = await supabase
        .from("User")
        .select()
        .eq("email", email)
        .single();
      if (!data) return null;
      return {
        ...data,
        emailVerified: data.emailVerified ? new Date(data.emailVerified) : null,
      };
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const { data } = await supabase
        .from("Account")
        .select("*, User(*)")
        .eq("provider", provider)
        .eq("providerAccountId", providerAccountId)
        .single();
      if (!data?.User) return null;
      const u = data.User as Record<string, unknown>;
      return {
        ...u,
        emailVerified: u.emailVerified
          ? new Date(u.emailVerified as string)
          : null,
      } as never;
    },

    async updateUser(user) {
      const { data, error } = await supabase
        .from("User")
        .update({
          name: user.name,
          image: user.image,
          emailVerified: user.emailVerified?.toISOString(),
          updatedAt: now(),
        })
        .eq("id", user.id!)
        .select()
        .single();
      if (error) throw error;
      return {
        ...data,
        emailVerified: data.emailVerified ? new Date(data.emailVerified) : null,
      };
    },

    async linkAccount(account) {
      const row = {
        id: crypto.randomUUID(),
        userId: account.userId,
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        access_token: account.access_token ?? null,
        refresh_token: account.refresh_token ?? null,
        expires_at: account.expires_at ?? null,
        token_type: account.token_type ?? null,
        scope: account.scope ?? null,
        id_token: account.id_token ?? null,
        session_state: account.session_state ?? null,
        color: "#6366F1",
        isActive: true,
        createdAt: now(),
        updatedAt: now(),
      };
      const { error } = await supabase.from("Account").insert(row);
      if (error) throw error;
    },

    // JWT strategy — session methods not needed
    async createSession(session) {
      return session as never;
    },
    async getSessionAndUser() {
      return null;
    },
    async updateSession(session) {
      return session as never;
    },
    async deleteSession() {},
  };
}
