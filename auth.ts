import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { encryptImapPassword } from "@/lib/skills/crypto/encrypt-imap-password";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
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

          const user = await prisma.user.upsert({
            where: { email: credentials.email as string },
            update: {},
            create: { email: credentials.email as string },
          });

          await prisma.account.upsert({
            where: {
              provider_providerAccountId: {
                provider: "imap",
                providerAccountId: credentials.email as string,
              },
            },
            update: {
              imapPasswordEncrypted: encrypted,
              imapHost: credentials.imapHost as string,
              imapPort: Number(credentials.imapPort) || 993,
              smtpHost: (credentials.smtpHost as string) || "",
              smtpPort: Number(credentials.smtpPort) || 587,
            },
            create: {
              userId: user.id,
              provider: "imap",
              providerAccountId: credentials.email as string,
              email: credentials.email as string,
              imapUser: credentials.email as string,
              imapPasswordEncrypted: encrypted,
              imapHost: credentials.imapHost as string,
              imapPort: Number(credentials.imapPort) || 993,
              smtpHost: (credentials.smtpHost as string) || "",
              smtpPort: Number(credentials.smtpPort) || 587,
            },
          });

          return { id: user.id, email: user.email, name: user.name };
        } catch {
          // Return null so NextAuth shows the signin page with an error query param
          // rather than crashing to the error page.
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // PrismaAdapter doesn't populate the email column on Account — patch it.
      if (account && user.email && account.type === "oauth") {
        try {
          await prisma.account.updateMany({
            where: { providerAccountId: account.providerAccountId, provider: account.provider },
            data: { email: user.email },
          });
        } catch {
          // Non-fatal — sign-in still proceeds
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
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.userId as string;
      return session;
    },
  },
});
