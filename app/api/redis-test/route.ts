
import { NextResponse } from "next/server";
import { connectRedis } from "@/lib/redis";

export async function GET() {
  try {
    const client = await connectRedis();

    await client.set("help:test", "Redis Connected");

    const result = await client.get("help:test");

    return NextResponse.json({
      success: true,
      message: result,
      redisHost: "192.168.56.101",
    });
  } catch (error) {
    console.error("Redis connection error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Redis connection failed",
      },
      { status: 500 }
    );
  }
}
