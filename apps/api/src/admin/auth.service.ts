import {
  Injectable,
  UnauthorizedException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sign, verify, type JwtPayload } from 'jsonwebtoken';

export type AdminTokenPayload = JwtPayload & {
  sub: string;
  role: 'admin';
};

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private username = 'admin';
  private password = 'admin';
  private jwtSecret = 'inknova-dev-secret-change-me';

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.username = this.config.get<string>('ADMIN_USERNAME', 'admin');
    this.password = this.config.get<string>('ADMIN_PASSWORD', 'admin');
    this.jwtSecret = this.config.get<string>(
      'ADMIN_JWT_SECRET',
      'inknova-dev-secret-change-me',
    );
    if (
      this.password === 'admin' ||
      this.jwtSecret === 'inknova-dev-secret-change-me'
    ) {
      this.logger.warn(
        'Using default ADMIN_PASSWORD / ADMIN_JWT_SECRET — set them in .env for production',
      );
    }
  }

  login(username: string, password: string): { token: string } {
    if (username !== this.username || password !== this.password) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const token = sign(
      { sub: username, role: 'admin' } satisfies Omit<
        AdminTokenPayload,
        keyof JwtPayload
      > & { sub: string; role: 'admin' },
      this.jwtSecret,
      { expiresIn: '7d' },
    );
    return { token };
  }

  verifyToken(token: string): AdminTokenPayload {
    try {
      const payload = verify(token, this.jwtSecret) as AdminTokenPayload;
      if (payload.role !== 'admin' || !payload.sub) {
        throw new UnauthorizedException('Invalid token');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
