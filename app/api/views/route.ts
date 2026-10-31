import { NextResponse } from "next/server";
import { connectRedis } from "@/lib/redis";

export const runtime = "nodejs";

export async function GET() {
  try {
    const redis = await connectRedis();

    // INCR is atomic; do not replace it with GET followed by SET.
    const views = await redis.incr("help:views");

    return NextResponse.json({ success: true, views });
  } catch (error) {
    console.error("Redis view counter unavailable:", error);
    return NextResponse.json(
      {
        success: false,
        views: null,
        error: "View counter is temporarily unavailable.",
      },
      { status: 503 }
    );
  }
}
