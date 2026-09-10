import Link from "next/link";
import CheckinPage from "../../checkin/CheckinForm";
import { getStayByToken } from "@/lib/data";

export default async function TokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const stay = await getStayByToken(token);
  if (!stay) {
    return (
      <div className="mx-auto max-w-md px-5 py-10">
        <div className="box p-5 text-center">
          <p className="font-bold">Link expired or invalid</p>
          <p className="mt-1 text-sm text-[#6b6f6b]">Ask the front desk for a fresh WhatsApp link.</p>
          <Link href="/" className="btn-ghost mt-4 inline-block">
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }
  return <CheckinPage presetToken={stay.token} presetRoom={stay.roomNumber} />;
}
