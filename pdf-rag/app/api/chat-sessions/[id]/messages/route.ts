import { NextResponse } from "next/server";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;

  try {
    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(asc(messages.createdAt));

    return NextResponse.json(history);
  } catch (error) {
    console.error("Fetch messages error:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const { role, content } = await request.json();

  try {
    const [newMessage] = await db
      .insert(messages)
      .values({
        sessionId,
        role,
        content,
      })
      .returning();

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error("Save message error:", error);
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
  }
}
