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

  // existing record fetch karo
  const { data, error } = await supabase
    .from("rate_limits")
    .select("*")
    .eq("user_id", userId)
    .single();

  // pehli baar ya din badal gaya
  if (!data || now > data.reset_time) {
    await supabase
      .from("rate_limits")
      .upsert({
        user_id: userId,
        count: 1,
        reset_time: getMidnight(),
      });

    console.log("RATE_LIMIT_NEW_DAY", { userId, count: 1, remaining: MAX_PER_DAY - 1 });
    return { allowed: true, remaining: MAX_PER_DAY - 1 };
  }

  // limit cross ho gayi
  if (data.count >= MAX_PER_DAY) {
    const retryAfterMinutes = Math.ceil((data.reset_time - now) / 1000 / 60);
    console.log("RATE_LIMIT_BLOCKED", { userId, count: data.count, retryAfterMinutes });
    return { allowed: false, retryAfterMinutes };
  }

  // increment
  await supabase
    .from("rate_limits")
    .update({ count: data.count + 1 })
    .eq("user_id", userId);

  console.log("RATE_LIMIT_OK", { userId, count: data.count + 1, remaining: MAX_PER_DAY - (data.count + 1) });
  return { allowed: true, remaining: MAX_PER_DAY - (data.count + 1) };
}