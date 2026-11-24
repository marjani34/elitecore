import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService, type TokenPayload } from './auth.service';
import { AuthGuard } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() body: { email?: string; password?: string }) {
    return this.auth.login(body?.email ?? '', body?.password ?? '');
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() req: { user: TokenPayload }) {
    return { email: req.user.sub, name: 'ادمین', role: req.user.role };
  }
}
