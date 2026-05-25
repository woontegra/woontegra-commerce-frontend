export type PopupTriggerType = 'time' | 'exit_intent' | 'scroll';
export type PopupPosition = 'center' | 'top' | 'bottom';

export interface Popup {
  id: string;
  title: string;
  content: string;
  triggerType: PopupTriggerType;
  triggerValue: number;
  isActive: boolean;
  buttonText?: string;
  buttonLink?: string;
  imageUrl?: string;
  position: PopupPosition;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePopupDto {
  title: string;
  content: string;
  triggerType?: PopupTriggerType;
  triggerValue?: number;
  isActive?: boolean;
  buttonText?: string;
  buttonLink?: string;
  imageUrl?: string;
  position?: PopupPosition;
}

export interface UpdatePopupDto extends Partial<CreatePopupDto> {}
