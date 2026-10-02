export type { UserEntity } from '../repositories/user-repository.js';

export interface ChangePasswordRequest {
  new_password: string;
}

export interface UserResponseDto {
  id: string;
  username: string;
  email: string;
  display_name: string;
  role: 'admin' | 'user';
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
}

export interface AuthSuccessResponse {
  token: string;
  user: UserResponseDto;
}
