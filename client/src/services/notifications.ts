export class NotificationService {
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Este navegador não suporta notificações de área de trabalho.');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  hasPermission(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  notifyLimitWarning(currentHours: number, maxHours: number): void {
    if (!this.hasPermission()) return;

    new Notification('Minhas Horas - Alerta de Limite!', {
      body: `Atenção: você já acumulou ${currentHours}h extras, aproximando-se do teto permitido de ${maxHours}h.`,
      icon: '/icons/icon-192x192.png',
      tag: 'limit-warning',
    });
  }

  notifyLimitExceeded(currentHours: number, maxHours: number): void {
    if (!this.hasPermission()) return;

    new Notification('Minhas Horas - Limite Excedido!', {
      body: `Crítico: seu banco de horas atingiu ${currentHours}h extras e ultrapassou o teto de ${maxHours}h.`,
      icon: '/icons/icon-192x192.png',
      tag: 'limit-exceeded',
    });
  }

  notifyUpcomingCompensation(dateStr: string, hours: number): void {
    if (!this.hasPermission()) return;

    new Notification('Minhas Horas - Lembrete de Compensação', {
      body: `Você tem uma compensação agendada de ${hours}h para a data de amanhã (${dateStr}).`,
      icon: '/icons/icon-192x192.png',
      tag: 'compensation-reminder',
    });
  }
}

export const notificationService = new NotificationService();
