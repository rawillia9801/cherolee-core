import { NextResponse } from "next/server";

const CORE_ENDPOINT =
  process.env.CORE_CHAT_ENDPOINT ||
  "https://yourdomain.com/api/ai/chat";

const SALESIQ_SECRET = process.env.SALESIQ_WEBHOOK_SECRET;

export async function HEAD() {
  return new Response("ok", { status: 200 });
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("x-salesiq-signature");

    if (!authHeader || authHeader !== SALESIQ_SECRET) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = await req.json();

    const visitorMessage =
      payload?.message ||
      payload?.text ||
      payload?.visitor?.message ||
      "";

    const visitorId =
      payload?.visitor?.id ||
      payload?.session_id ||
      "website";

    const coreRes = await fetch(CORE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: "salesiq",
        external_user_id: visitorId,
        message: visitorMessage,
      }),
    });

    const coreData = await coreRes.json();

    const reply = coreData?.reply || "I'm here to help.";

    return NextResponse.json({
      action: "reply",
      replies: [
        {
          type: "text",
          text: reply,
        },
      ],
    });
  } catch (err) {
    console.error("SalesIQ webhook error", err);

    return NextResponse.json({
      action: "reply",
      replies: [
        {
          type: "text",
          text: "Something went wrong. Please try again.",
        },
      ],
    });
  }
}