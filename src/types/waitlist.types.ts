export type WaitlistRecord = {
  id: string;
  eventId: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  position: number;
  createdAt: string;
};

export type WaitlistInput = {
  eventId: string;
  userId: string;
  name?: string;
  email?: string;
  phone?: string;
};
