import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { UserRepository, UserEntity } from '../repositories/user-repository.js';

export class AuthService {
  /**
   * Hashes a plain password using scrypt with a unique 16-byte salt.
   * Format: <salt_hex>:<hash_hex>
   */
  static hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  /**
   * Verifies a plain password against the stored salt:hash string.
   */
  static verifyPassword(password: string, storedHash: string): boolean {
    try {
      const [salt, hash] = storedHash.split(':');
      if (!salt || !hash) return false;

      const derived = scryptSync(password, salt, 64);
      const original = Buffer.from(hash, 'hex');

      if (derived.length !== original.length) return false;
      return timingSafeEqual(derived, original);
    } catch {
      return false;
    }
  }

  /**
   * Generates a cryptographically secure 256-bit session token.
   */
  static generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Validates username requirements: 3-32 characters, alphanumeric, dots, underscores, hyphens.
   */
  static validateUsername(username: string): boolean {
    return /^[a-zA-Z0-9._-]{3,32}$/.test(username);
  }

  /**
   * Validates basic email format.
   */
  static validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * Validates password strength: min 8 characters, at least 1 letter and 1 number.
   */
  static validatePassword(password: string): { valid: boolean; message?: string } {
    if (!password || password.length < 8) {
      return { valid: false, message: 'A senha deve conter no mínimo 8 caracteres.' };
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return { valid: false, message: 'A senha deve conter pelo menos uma letra e um número.' };
    }
    return { valid: true };
  }

  /**
   * Updates user password and resets must_change_password flag to 0.
   */
  static changePassword(
    userId: string,
    newPassword: string,
    currentPassword?: string,
    userRepo: UserRepository = new UserRepository()
  ): { success: boolean; message?: string; user?: UserEntity } {
    const user = userRepo.findById(userId);
    if (!user) {
      return { success: false, message: 'Usuário não encontrado.' };
    }

    if (user.must_change_password === 0) {
      if (!currentPassword) {
        return { success: false, message: 'A senha atual é obrigatória.' };
      }
      if (!this.verifyPassword(currentPassword, user.password_hash)) {
        return { success: false, message: 'A senha atual informada está incorreta.' };
      }
    }

    const passwordCheck = this.validatePassword(newPassword);
    if (!passwordCheck.valid) {
      return { success: false, message: passwordCheck.message };
    }

    if (this.verifyPassword(newPassword, user.password_hash)) {
      return { success: false, message: 'A nova senha não pode ser igual à senha atual.' };
    }

    const newHash = this.hashPassword(newPassword);
    const updated = userRepo.updatePasswordAndClearFlag(userId, newHash);
    if (!updated) {
      return { success: false, message: 'Falha ao atualizar a senha.' };
    }

    const updatedUser = userRepo.findById(userId);
    return { success: true, user: updatedUser || undefined };
  }

  /**
   * Deletes user account and all personal data, preventing sole active admin lockout.
   */
  static deleteSelfAccount(
    userId: string,
    userRepo: UserRepository = new UserRepository()
  ): { success: boolean; message?: string } {
    const user = userRepo.findById(userId);
    if (!user) {
      return { success: false, message: 'Usuário não encontrado.' };
    }

    if (userRepo.isSoleAdmin(userId)) {
      return {
        success: false,
        message: 'O único administrador ativo do sistema não pode excluir a própria conta para evitar bloqueio definitivo do sistema.',
      };
    }

    userRepo.deleteUserAndAllData(userId);
    return { success: true };
  }
}
