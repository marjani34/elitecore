import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService, type TokenPayload } from './auth.service';

interface AuthedRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: TokenPayload;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers['authorization'];
    const value = Array.isArray(header) ? header[0] : (header ?? '');
    const token = value.startsWith('Bearer ') ? value.slice(7) : '';
    const payload = this.auth.verify(token);
    if (!payload) throw new UnauthorizedException('نشست منقضی شده است؛ دوباره وارد شو.');
    req.user = payload;
    return true;
  }
}
