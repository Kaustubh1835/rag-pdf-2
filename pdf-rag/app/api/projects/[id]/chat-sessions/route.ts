import { NextResponse } from "next/server";
import { db } from "@/db";
import { chatSessions, messages } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  
  try {
    const sessions = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.projectId, projectId))
      .orderBy(desc(chatSessions.createdAt));

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Fetch sessions error:", error);
    return NextResponse.json({ error: "Failed to fetch chat sessions" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const { title } = await request.json();

  try {
    const [newSession] = await db
      .insert(chatSessions)
      .values({
        projectId,
        title: title || "New Conversation",
      })
      .returning();

    return NextResponse.json(newSession);
  } catch (error) {
    console.error("Create session error:", error);
    return NextResponse.json({ error: "Failed to create chat session" }, { status: 500 });
  }
}
