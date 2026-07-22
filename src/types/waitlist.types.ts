export type WaitlistRecord = {
  entryId: string;
  eventId: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  createdAt: string;
};

export type WaitlistInput = {
  eventId: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
};
