import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || configService.get<string>('jwt.secret'),
    });
  }

  async validate(payload: any) {
    const user = await this.userModel.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid token or user is inactive');
    }

    // Create a user object with only the necessary properties
    // This will be attached to the request object as req.user
    const userForRequest = {
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      permissions: user.permissions || [],
      accessScope: user.accessScope,
      campuses: user.campuses || [],
      rooms: user.rooms || [],
      children: user.children || [],
      isActive: user.isActive,
      isSharedAccount: user.isSharedAccount || false,
    };

    return userForRequest;
  }
}
