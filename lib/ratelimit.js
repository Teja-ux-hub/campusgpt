import { supabase } from "@/lib/supabase";

const MAX_PER_DAY = 5;

function getMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime();
}

export async function checkRateLimit(userId) {
  const now = Date.now();

  const { data, error } = await supabase
    .from("rate_limits")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!data || now > data.reset_time) {
    const newCount = 1;
    await supabase
      .from("rate_limits")
      .upsert({
        user_id: userId,
        count: newCount,
        reset_time: getMidnight(),
      });

    console.log("RATE_LIMIT_NEW_DAY", { userId, count: newCount, remaining: MAX_PER_DAY - newCount });
    return { allowed: true, count: newCount, max: MAX_PER_DAY, remaining: MAX_PER_DAY - newCount };
  }

  if (data.count >= MAX_PER_DAY) {
    const retryAfterMinutes = Math.ceil((data.reset_time - now) / 1000 / 60);
    console.log("RATE_LIMIT_BLOCKED", { userId, count: data.count, retryAfterMinutes });
    return { allowed: false, retryAfterMinutes, count: data.count, max: MAX_PER_DAY };
  }

  const newCount = data.count + 1;
  await supabase
    .from("rate_limits")
    .update({ count: newCount })
    .eq("user_id", userId);

  console.log("RATE_LIMIT_OK", { userId, count: newCount, remaining: MAX_PER_DAY - newCount });
  return { allowed: true, count: newCount, max: MAX_PER_DAY, remaining: MAX_PER_DAY - newCount };
}

export async function getRateLimit(userId) {
  const { data } = await supabase
    .from("rate_limits")
    .select("count")
    .eq("user_id", userId)
    .single();
  
  return { count: data?.count || 0, max: MAX_PER_DAY };
}
