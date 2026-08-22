import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      role: string;
      orgId: string;
      employeeId: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    role: string;
    orgId: string;
    employeeId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    orgId: string;
    employeeId: string | null;
  }
}
