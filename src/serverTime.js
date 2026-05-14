export async function getServerNow() {
  try {
    const res = await fetch('/api/server-time');
    if (!res.ok) throw new Error('non-ok response');
    const { now } = await res.json();
    return new Date(now);
  } catch {
    return new Date();
  }
}
