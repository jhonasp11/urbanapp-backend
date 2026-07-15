/* eslint-disable */
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

interface RequestWithUser {
  user: { rol: string };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesRequeridos = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );
    if (!rolesRequeridos) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    return rolesRequeridos.includes(request.user.rol);
  }
}