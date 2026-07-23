export type PushNotificationPayload = {
  title: string;
  body: string;
  icon: string;
  badge: string;
  url: string;
  type: string;
  benefitId?: string;
};

export type ExpiryMessageInput = {
  id: string;
  merchant: string | null;
  brand: string | null;
  title: string;
  category: string | null;
};
