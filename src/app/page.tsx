import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    if (session.user.role === "ADMIN" || session.user.role === "HR") {
      redirect("/admin/dashboard");
    } else {
      redirect("/dashboard");
    }
  }

  redirect("/login");
}
