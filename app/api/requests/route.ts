import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { connectRedis } from "@/lib/redis";

export const runtime = "nodejs";

type HelpRequest = {
  id: number;
  student_name: string;
  message: string;
  created_at: string;
};

export async function GET() {
  // Redis is a cache only. PostgreSQL remains the source of truth.
  try {
    const redis = await connectRedis();
    const cached = await redis.get("help:latest");

    if (cached) {
      try {
        const requests = JSON.parse(cached) as HelpRequest[];
        return NextResponse.json({
          success: true,
          source: "Redis",
          requests,
        });
      } catch {
        // Discard malformed cache data and rebuild it from PostgreSQL.
        await redis.del("help:latest").catch(() => undefined);
      }
    }
  } catch (error) {
    console.error("Redis cache read unavailable; using PostgreSQL:", error);
  }

  try {
    const result = await pool.query(
      `SELECT id, student_name, message, created_at
       FROM help_requests
       ORDER BY created_at DESC, id DESC
       LIMIT 10`
    );

    const requests = result.rows as HelpRequest[];

    // A cache write failure must not prevent requests being returned.
    try {
      const redis = await connectRedis();
      await redis.set("help:latest", JSON.stringify(requests), { EX: 60 });
    } catch (error) {
      console.error("Could not populate Redis cache:", error);
    }

    return NextResponse.json({
      success: true,
      source: "PostgreSQL",
      requests,
    });
  } catch (error) {
    console.error("PostgreSQL request-list error:", error);
    return NextResponse.json(
      { success: false, error: "Could not load help requests." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const data = body as { student_name?: unknown; message?: unknown };
  const studentName =
    typeof data.student_name === "string" ? data.student_name.trim() : "";
  const message =
    typeof data.message === "string" ? data.message.trim() : "";

  if (!studentName || !message) {
    return NextResponse.json(
      {
        success: false,
        error: "student_name and message are required",
      },
      { status: 400 }
    );
  }

  if (studentName.length > 50 || message.length > 200) {
    return NextResponse.json(
      {
        success: false,
        error: "Student name must be at most 50 characters and message at most 200 characters.",
      },
      { status: 400 }
    );
  }

  try {
    // Parameterized SQL prevents user input from being executed as SQL.
    const result = await pool.query(
      `INSERT INTO help_requests (student_name, message)
       VALUES ($1, $2)
       RETURNING id`,
      [studentName, message]
    );

    // Invalidate the cached latest list after a successful database insert.
    try {
      const redis = await connectRedis();
      await redis.del("help:latest");
    } catch (error) {
      // PostgreSQL insert has succeeded; keep the response successful.
      // The list API will fall back to PostgreSQL if Redis is unavailable.
      console.error("Could not invalidate Redis latest-request cache:", error);
    }

    return NextResponse.json(
      { success: true, id: result.rows[0].id as number },
      { status: 201 }
    );
  } catch (error) {
    console.error("PostgreSQL insert error:", error);
    return NextResponse.json(
      { success: false, error: "Could not save the help request." },
      { status: 500 }
    );
  }
}
