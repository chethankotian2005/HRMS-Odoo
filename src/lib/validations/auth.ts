import * as z from "zod";

export const signupSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one digit")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  role: z.enum(["ADMIN", "HR", "EMPLOYEE"], {
    message: "Please select a valid role (ADMIN, HR, EMPLOYEE)",
  }),
});

export type SignupInput = z.infer<typeof signupSchema>;
