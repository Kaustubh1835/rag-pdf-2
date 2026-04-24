import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

// GET /api/projects — list all projects for the authenticated user
export async function GET(request: Request) {
  const user = await verifyToken(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, user.uid))
    .orderBy(desc(projects.createdAt));

  return NextResponse.json(userProjects);
}

// POST /api/projects — create a new project
export async function POST(request: Request) {
  const user = await verifyToken(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Project name is required" },
      { status: 400 }
    );
  }

  const [newProject] = await db
    .insert(projects)
    .values({
      name: name.trim(),
      userId: user.uid,
    })
    .returning();

  return NextResponse.json(newProject, { status: 201 });
}
