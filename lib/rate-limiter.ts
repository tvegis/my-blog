/**
 * 内存速率限制器 — 用于管理后台登录的暴力破解防护。
 *
 * 基于 IP 追踪失败尝试次数，15 分钟内最多 5 次，
 * 超过后返回 429。第 3 次起增加渐进式延迟。
 * 服务重启后状态丢失（Vercel Serverless），适合个人博客场景。
 */

interface AttemptRecord {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
}

export class RateLimiter {
  private attempts = new Map<string, AttemptRecord>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 15 * 60 * 1000 // 15 分钟
  ) {}

  /** 检查该 IP 是否允许继续尝试 */
  check(identifier: string): {
    allowed: boolean;
    retryAfter?: number; // 秒
    remainingAttempts: number;
  } {
    const record = this.attempts.get(identifier);

    if (!record) {
      return { allowed: true, remainingAttempts: this.maxAttempts };
    }

    const elapsed = Date.now() - record.firstAttempt;

    // 超出时间窗口 → 重置
    if (elapsed > this.windowMs) {
      this.attempts.delete(identifier);
      return { allowed: true, remainingAttempts: this.maxAttempts };
    }

    const remaining = this.maxAttempts - record.count;

    if (record.count >= this.maxAttempts) {
      const retryAfter = Math.ceil(
        (record.firstAttempt + this.windowMs - Date.now()) / 1000
      );
      return { allowed: false, retryAfter: Math.max(retryAfter, 1), remainingAttempts: 0 };
    }

    return { allowed: true, remainingAttempts: remaining };
  }

  /** 记录一次失败尝试，返回应等待的延迟（毫秒） */
  recordFailed(identifier: string): number {
    this.ensureCleanup();

    const record = this.attempts.get(identifier);
    const now = Date.now();

    if (!record || now - record.firstAttempt > this.windowMs) {
      this.attempts.set(identifier, { count: 1, firstAttempt: now, lastAttempt: now });
      return 0;
    }

    record.count++;
    record.lastAttempt = now;

    // 渐进式延迟: 第3次=1s, 第4次=2s, 第5次+=5s
    if (record.count === 3) return 1000;
    if (record.count === 4) return 2000;
    if (record.count >= 5) return 5000;
    return 0;
  }

  /** 登录成功后清除该 IP 的记录 */
  recordSuccess(identifier: string): void {
    this.attempts.delete(identifier);
  }

  /** 定期清理过期记录 */
  private ensureCleanup(): void {
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    // 允许进程退出（不阻止 Node 事件循环）
    if (this.cleanupTimer.unref) this.cleanupTimer.unref();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.attempts) {
      if (now - record.firstAttempt > this.windowMs) {
        this.attempts.delete(key);
      }
    }
    if (this.attempts.size === 0 && this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

/** 管理后台登录专用的全局速率限制器 */
export const authRateLimiter = new RateLimiter(5, 15 * 60 * 1000);
