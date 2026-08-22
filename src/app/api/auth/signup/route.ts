import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signupSchema } from "@/lib/validations/auth";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = signupSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      return NextResponse.json({ errors }, { status: 400 });
    }

    const { employeeId, email, password, role } = result.data;

    // 1. Check if Employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return NextResponse.json(
        { errors: { employeeId: ["Employee record not found. Please contact your HR administrator."] } },
        { status: 400 }
      );
    }

    // 2. Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { employee: { id: employeeId } }],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { errors: { email: ["User with this email or employee ID already exists."] } },
        { status: 400 }
      );
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // 4. Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        orgId: employee.orgId,
      },
    });

    // 5. Update employee to link to this user
    await prisma.employee.update({
      where: { id: employeeId },
      data: { userId: user.id },
    });

    // 6. Generate verification token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    // In a real app, send email here
    console.log(`[Email Mock] Verification link: http://localhost:3000/verify-email?token=${token}&email=${email}`);

    return NextResponse.json(
      { message: "User registered successfully. Please check your email to verify your account." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { errors: { root: ["An unexpected error occurred. Please try again."] } },
      { status: 500 }
    );
  }
}
