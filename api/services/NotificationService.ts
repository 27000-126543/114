import axios from 'axios';
import { config } from '../lib/config';
import prisma from '../lib/prisma';
import { auditLogService } from './AuditLogService';

class NotificationService {
  async sendToWeChat(message: string, mentionedList?: string[]) {
    if (!config.wechat.webhookUrl) {
      console.warn('WeChat webhook not configured, skipping notification:', message);
      return false;
    }

    try {
      const payload: any = {
        msgtype: 'text',
        text: {
          content: message,
        },
      };

      if (mentionedList && mentionedList.length > 0) {
        payload.text.mentioned_mobile_list = mentionedList;
      }

      await axios.post(config.wechat.webhookUrl, payload);
      
      await this.createNotificationRecord({
        type: 'WECHAT_ALERT',
        title: '企业微信群通知',
        content: message,
        recipients: mentionedList || [],
        channels: ['wechat'],
        status: 'SENT',
      });

      return true;
    } catch (error) {
      console.error('Failed to send WeChat notification:', error);
      
      await this.createNotificationRecord({
        type: 'WECHAT_ALERT',
        title: '企业微信群通知',
        content: message,
        recipients: mentionedList || [],
        channels: ['wechat'],
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      await auditLogService.log({
        action: 'NOTIFICATION_FAILED',
        resource: 'Notification',
        resourceId: 'wechat',
        details: message,
        level: 'WARNING',
      });

      return false;
    }
  }

  async sendAlert(title: string, details: string, severity: 'info' | 'warning' | 'critical' = 'warning') {
    const severityMap = {
      info: 'ℹ️ 信息',
      warning: '⚠️ 警告',
      critical: '🔴 紧急',
    };

    const message = `【${severityMap[severity]}】${title}\n\n${details}\n\n时间: ${new Date().toLocaleString('zh-CN')}`;

    return this.sendToWeChat(message);
  }

  async sendBiddingAlert(procurementTitle: string, alertType: string, details: string) {
    const message = `【竞价系统通知】\n\n项目: ${procurementTitle}\n类型: ${alertType}\n详情: ${details}\n\n时间: ${new Date().toLocaleString('zh-CN')}`;

    return this.sendToWeChat(message);
  }

  async sendApprovalNotification(procurementTitle: string, approverRole: string, budgetOverrun: number) {
    const message = `【审批通知】\n\n项目: ${procurementTitle}\n需要审批角色: ${approverRole}\n预算超支: ${(budgetOverrun * 100).toFixed(2)}%\n\n请及时处理审批。\n时间: ${new Date().toLocaleString('zh-CN')}`;

    return this.sendToWeChat(message);
  }

  private async createNotificationRecord(params: {
    type: string;
    title: string;
    content: string;
    recipients: string[];
    channels: string[];
    status: string;
    errorMessage?: string;
  }) {
    try {
      await prisma.notification.create({
        data: {
          type: params.type,
          title: params.title,
          content: params.content,
          recipients: params.recipients,
          channels: params.channels,
          status: params.status,
          errorMessage: params.errorMessage,
          sentAt: params.status === 'SENT' ? new Date() : null,
        },
      });
    } catch (error) {
      console.error('Failed to create notification record:', error);
    }
  }
}

export const notificationService = new NotificationService();
