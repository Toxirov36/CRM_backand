import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || process.env.ClientID || 'dummy_client_id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.ClientSecret || 'dummy_client_secret',
      callbackURL: 'http://localhost:3000/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {
    const { name, emails, photos } = profile;
    const user = {
      email: emails[0].value,
      first_name: name?.givenName || '',
      last_name: name?.familyName || '',
      photo: photos?.[0]?.value || null,
    };
    done(null, user);
  }
}
