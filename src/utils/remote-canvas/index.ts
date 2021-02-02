export const enum MessageType {
  transfer = 'transferCanvas',
  registerEvent = 'registerEvent',
  trigger = 'domTrigger',
  resize = 'size',
}

export * from './client';
export * from './host';