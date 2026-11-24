import { Injectable, Logger, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, timingSafeEqual } from 'crypto';

export interface TokenPayload {
  sub: string;
  role: 'admin';
  exp: number;
}

const WEEK = 7 * 24 * 60 * 60 * 1000;
const sha = (s: string) => createHash('sha256').update(s).digest();
const safeEqual = (a: string, b: string) => timingSafeEqual(sha(a), sha(b));

/**
 * Single admin user for now, configured with environment variables.
 * Replace with a users table once the database is added.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly config: ConfigService) {}

  private get isProd() {
    return process.env.NODE_ENV === 'production';
  }

  private setting(key: string, devDefault: string): string | undefined {
    const value = this.config.get<string>(key);
    if (value) return value;
    return this.isProd ? undefined : devDefault;
  }

  private get secret(): string {
    const s = this.setting('AUTH_SECRET', 'dev-only-secret-change-me');
    if (!s) throw new ServiceUnavailableException('AUTH_SECRET روی سرور تنظیم نشده است.');
    return s;
  }

  login(email: string, password: string) {
    const adminEmail = this.setting('ADMIN_EMAIL', 'admin@elite.app');
    const adminPassword = this.setting('ADMIN_PASSWORD', 'admin123');
    if (!adminEmail || !adminPassword) {
      this.logger.error('ADMIN_EMAIL / ADMIN_PASSWORD are not configured');
      throw new ServiceUnavailableException('اطلاعات ادمین روی سرور تنظیم نشده است.');
    }

    const ok =
      typeof email === 'string' &&
      typeof password === 'string' &&
      safeEqual(email.trim().toLowerCase(), adminEmail.toLowerCase()) &&
      safeEqual(password, adminPassword);
    if (!ok) throw new UnauthorizedException('ایمیل یا رمز عبور اشتباه است.');

    const token = this.sign({ sub: adminEmail, role: 'admin', exp: Date.now() + WEEK });
    return { token, user: { email: adminEmail, name: 'ادمین', role: 'admin' as const } };
  }

  sign(payload: TokenPayload): string {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = createHmac('sha256', this.secret).update(body).digest('base64url');
    return `${body}.${sig}`;
  }

  verify(token: string): TokenPayload | null {
    const [body, sig] = (token ?? '').split('.');
    if (!body || !sig) return null;
    const expected = createHmac('sha256', this.secret).update(body).digest('base64url');
    if (!safeEqual(sig, expected)) return null;
    try {
      const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as TokenPayload;
      return payload.exp > Date.now() ? payload : null;
    } catch {
      return null;
    }
  }
}
