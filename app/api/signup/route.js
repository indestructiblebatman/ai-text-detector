export async function POST(request) {
  // Signup via Resend/email provider removed — respond with guidance.
  return new Response(JSON.stringify({ message: 'Signup via email is disabled. Use Supabase passwordless sign-in.' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET(request) {
  return new Response(JSON.stringify({ message: 'Signup endpoint (disabled).' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
