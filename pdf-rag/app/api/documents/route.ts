import { NextResponse } from "next/server";
import { db } from "@/db";
import { documents, projects } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

// POST /api/documents — save a document record to a project
export async function POST(request: Request) {
  const user = await verifyToken(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { projectId, fileName, fileUrl } = body;

  if (!projectId || !fileName || !fileUrl) {
    return NextResponse.json(
      { error: "projectId, fileName, and fileUrl are required" },
      { status: 400 }
    );
  }

  // Verify the project belongs to this user
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, user.uid)));

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const [newDoc] = await db
    .insert(documents)
    .values({
      projectId,
      fileName,
      fileUrl,
    })
    .returning();

  return NextResponse.json(newDoc, { status: 201 });
}
