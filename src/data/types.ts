export type Place = { name: string; lat: number; lng: number; country?: string };

export type Role = 'owner' | 'editor' | 'member';

export type User = { uid: string; name: string; photo: string | null; email?: string | null };

export type Profile = {
  id: string;
  name: string;
  photo: string | null;
  homeCity?: string;
  home?: Place | null;
  visited?: Place[];
};

export type Trip = {
  id: string;
  name: string;
  destination: Place | null;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  currency: string;
  dailyBudget: number;
  coverColor?: string;
  ownerId: string;
  memberIds: string[];
  roles: Record<string, Role>;
  joinedVia?: string;
  createdAt: number;
};

export type LinkItem = { label: string; url: string };

export type Category = 'activity' | 'food' | 'drinks' | 'cafe' | 'sight' | 'transport' | 'stay' | 'other';

export type Activity = {
  id: string;
  date: string;
  startTime: string; // HH:mm or ''
  endTime: string;
  title: string;
  category: Category;
  location: Place | null;
  locationText: string;
  notes: string;
  cost: number;
  links: LinkItem[];
  attendeeIds: string[];
  createdBy: string;
  createdAt: number;
};

export type IdeaStatus = 'open' | 'approved' | 'rejected';

export type Idea = {
  id: string;
  title: string;
  category: Category;
  notes: string;
  cost: number;
  links: LinkItem[];
  votes: Record<string, true>;
  status: IdeaStatus;
  activityId?: string;
  createdBy: string;
  createdAt: number;
};

export type Expense = {
  id: string;
  title: string;
  amount: number;
  category: Category;
  date: string; // '' = whole trip (flights, hotel)
  paidBy: string;
  createdBy: string;
  createdAt: number;
};

export type Comment = {
  id: string;
  targetId: string;
  text: string;
  authorId: string;
  createdAt: number;
};

/** A shared photo album (Google Photos, iCloud…). Only the link is stored; the photos stay with that service. */
export type Album = {
  id: string;
  title: string;
  url: string;
  createdBy: string;
  createdAt: number;
};

export type Invite = { code: string; tripId: string; tripName: string; createdBy: string; expiresAt: number };

export type SubCollections = {
  activities: Activity;
  ideas: Idea;
  expenses: Expense;
  comments: Comment;
  albums: Album;
};
export type SubName = keyof SubCollections;

/** Fields the caller supplies when creating; the store fills id/createdBy/createdAt. */
export type NewDoc<T> = Omit<T, 'id' | 'createdBy' | 'createdAt'>;
