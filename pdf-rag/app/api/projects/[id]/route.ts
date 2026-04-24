import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, documents } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

// GET /api/projects/[id] — get project details + its documents
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyToken(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Fetch the project (ensure it belongs to this user)
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, user.uid)));

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Fetch documents for this project
  const projectDocuments = await db
    .select()
    .from(documents)
    .where(eq(documents.projectId, id))
    .orderBy(desc(documents.createdAt));

  return NextResponse.json({
    ...project,
    documents: projectDocuments,
  });
}
