import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Credentials from "next-auth/providers/credentials";
import { SupabaseAdapter } from "@/lib/supabase-auth-adapter";
import { supabase } from "@/lib/supabase";
import { encryptImapPassword } from "@/lib/skills/crypto/encrypt-imap-password";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: SupabaseAdapter(),
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
    MicrosoftEntraID({
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      issuer: "https://login.microsoftonline.com/common/v2.0",
      authorization: {
        params: {
          scope:
            "openid email profile offline_access Mail.ReadWrite Mail.Send User.Read",
        },
      },
    }),
    Credentials({
      name: "IMAP",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        imapHost: { label: "IMAP Host", type: "text" },
        imapPort: { label: "IMAP Port", type: "number" },
        smtpHost: { label: "SMTP Host", type: "text" },
        smtpPort: { label: "SMTP Port", type: "number" },
      },
      async authorize(credentials) {
        try {
          if (
            !credentials?.email ||
            !credentials?.password ||
            !credentials?.imapHost
          ) {
            return null;
          }
          const { verifyImapConnection } = await import("@/lib/sync/imap");
          const isValid = await verifyImapConnection({
            host: credentials.imapHost as string,
            port: Number(credentials.imapPort) || 993,
            user: credentials.email as string,
            password: credentials.password as string,
          });
          if (!isValid) return null;

          const encrypted = JSON.stringify(
            encryptImapPassword(credentials.password as string),
          );

          // Upsert user
          const { data: existingUser } = await supabase
            .from("User")
            .select()
            .eq("email", credentials.email as string)
            .single();

          let userId: string;
          if (existingUser) {
            userId = existingUser.id as string;
          } else {
            const id = crypto.randomUUID();
            const now = new Date().toISOString();
            await supabase.from("User").insert({
              id,
              email: credentials.email,
              createdAt: now,
              updatedAt: now,
            });
            userId = id;
          }

          // Upsert IMAP account
          const now = new Date().toISOString();
          const { data: existingAccount } = await supabase
            .from("Account")
            .select()
            .eq("provider", "imap")
            .eq("providerAccountId", credentials.email as string)
            .single();

          if (existingAccount) {
            await supabase
              .from("Account")
              .update({
                imapPasswordEncrypted: encrypted,
                imapHost: credentials.imapHost,
                imapPort: Number(credentials.imapPort) || 993,
                smtpHost: (credentials.smtpHost as string) || "",
                smtpPort: Number(credentials.smtpPort) || 587,
                updatedAt: now,
              })
              .eq("id", existingAccount.id);
          } else {
            await supabase.from("Account").insert({
              id: crypto.randomUUID(),
              userId,
              type: "credentials",
              provider: "imap",
              providerAccountId: credentials.email as string,
              email: credentials.email as string,
              imapUser: credentials.email as string,
              imapPasswordEncrypted: encrypted,
              imapHost: credentials.imapHost as string,
              imapPort: Number(credentials.imapPort) || 993,
              smtpHost: (credentials.smtpHost as string) || "",
              smtpPort: Number(credentials.smtpPort) || 587,
              color: "#6366F1",
              isActive: true,
              createdAt: now,
              updatedAt: now,
            });
          }

          return { id: userId, email: credentials.email as string };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account && user.email && account.type === "oauth") {
        try {
          await supabase
            .from("Account")
            .update({ email: user.email, updatedAt: new Date().toISOString() })
            .eq("provider", account.provider)
            .eq("providerAccountId", account.providerAccountId);
        } catch {
          /* non-fatal */
        }
      }
      return true;
    },
    async jwt({ token, account, user }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.provider = account.provider;
      }
      if (user) token.userId = user.id;
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.userId as string;
      return session;
    },
  },
});
