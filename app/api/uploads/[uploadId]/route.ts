import { NextResponse } from "next/server";
import { getUploadIntent } from "@/lib/upload-intents";

type RouteContext = {
  params: Promise<{
    uploadId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { uploadId } = await context.params;
    const intent = await getUploadIntent(uploadId);
    if (!intent) {
      return NextResponse.json({ error: "Upload intent not found." }, { status: 404 });
    }

    return NextResponse.json(intent);
  } catch (error) {
    console.error("Get upload status error:", error);
    return NextResponse.json(
      { error: "Unable to get upload status." },
      { status: 500 }
    );
  }
}
