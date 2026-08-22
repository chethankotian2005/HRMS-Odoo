import { withAuth } from "@/lib/rbac/with-auth";
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// 5MB limit
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export const POST = withAuth(
  "create",
  async () => ({ type: "Document" }), // Or some generic file representation
  async (req, context, user, audit) => {
    try {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: "File exceeds 5MB limit" }, { status: 400 });
      }

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: "Invalid file type. Only JPG, PNG, WEBP, and PDF are allowed." },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      
      // Ensure the upload directory exists
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      await fs.mkdir(uploadDir, { recursive: true });

      // Generate a unique filename
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const filename = `${uniqueSuffix}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
      const filepath = path.join(uploadDir, filename);

      await fs.writeFile(filepath, buffer);

      const publicUrl = `/uploads/${filename}`;

      // Optionally audit log the upload action
      await audit("Document", publicUrl, null, { filename, size: file.size, type: file.type });

      return NextResponse.json({ url: publicUrl });
    } catch (error) {
      console.error("[Upload Error]", error);
      return NextResponse.json({ error: "File upload failed" }, { status: 500 });
    }
  }
);
