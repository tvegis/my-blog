import { NextResponse } from "next/server";
import { authRateLimiter } from "@/lib/rate-limiter";

/** 从 Vercel / 标准代理头中提取客户端真实 IP */
function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const cfIp = request.headers.get("cf-connecting-ip"); // Cloudflare
  if (cfIp) return cfIp.trim();
  return "unknown";
}

export async function POST(request: Request) {
  const ip = getClientIP(request);

  // 速率限制检查
  const rateCheck = authRateLimiter.check(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: `尝试次数过多，请 ${rateCheck.retryAfter} 秒后重试`,
        retryAfter: rateCheck.retryAfter,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rateCheck.retryAfter) },
      }
    );
  }

  let password: string;
  try {
    const body = await request.json();
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    password = "";
  }

  // 输入验证
  if (!password || password.length === 0) {
    return NextResponse.json({ error: "请输入密码" }, { status: 400 });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json(
      { error: "服务器未配置：缺少 ADMIN_PASSWORD 环境变量" },
      { status: 500 }
    );
  }

  if (password !== adminPassword) {
    // 记录失败尝试，并添加渐进式延迟
    const delayMs = authRateLimiter.recordFailed(ip);
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    const remaining = rateCheck.remainingAttempts - 1; // 本次已消耗一次

    return NextResponse.json(
      {
        error:
          remaining > 0
            ? `密码错误，还剩 ${remaining} 次尝试机会`
            : "密码错误，已暂时锁定",
      },
      { status: 401 }
    );
  }

  // 登录成功 → 清除该 IP 的失败记录
  authRateLimiter.recordSuccess(ip);

  return NextResponse.json({ success: true });
}
