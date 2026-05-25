export async function POST(request) {
  // Resend/email provider was removed — this endpoint is intentionally a stub.
  return new Response(JSON.stringify({ message: 'OTP sending disabled on this deployment.' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET(request) {
  return new Response(JSON.stringify({ message: 'OTP endpoint (disabled).' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
