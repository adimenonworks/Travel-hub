/** `countryCode` is the ISO 3166 two-letter code (lowercase), used for flags and the trip's country badges. */
export type Place = { name: string; lat: number; lng: number; country?: string; countryCode?: string };

export type Role = 'owner' | 'editor' | 'member';

export type User = { uid: string; name: string; photo: string | null; email?: string | null };

export type Profile = {
  id: string;
  name: string;
  photo: string | null;
  homeCity?: string;
  home?: Place | null;
  visited?: Place[];
  /** Home currency (Settings → Currency): prices are also shown converted to it. Private. */
  currency?: string;
};

export type Trip = {
  id: string;
  name: string;
  destination: Place | null;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  currency: string;
  /** Budgeting was removed. Older trips may still hold these until an organizer opens them (useBudgetCleanup deletes them). */
  dailyBudget?: number;
  totalBudget?: number;
  dayBudgets?: Record<string, number>;
  daySpent?: Record<string, number>;
  /** No longer saved or shown; older trips may still have it. */
  coverColor?: string;
  /** Small JPEG as a data URL (see lib/image.ts), or null for none. */
  coverPhoto?: string | null;
  /** Which part of the cover photo shows when it's cropped: CSS object-position in % (50/50 = centre). */
  coverPosition?: { x: number; y: number } | null;
  ownerId: string;
  memberIds: string[];
  roles: Record<string, Role>;
  joinedVia?: string;
  createdAt: number;
};

/** A link, PDF or booking. `emailUrl` optionally points at the email it came from (e.g. a Gmail message link). */
export type LinkItem = { label: string; url: string; emailUrl?: string };

/** The six event types (src/lib/categories.ts). 'cafe', 'drinks', 'sight' and 'other' are older values, read as Food & drink or Activity. */
/**
 * A known price, in the currency it was entered or booked in (an amount of 0 is "Free"). Optional everywhere and never
 * added up: a price belongs to the one item it's on.
 */
export type Price = { amount: number; currency: string };

export type Category = 'flight' | 'stay' | 'transport' | 'food' | 'activity' | 'note' | 'drinks' | 'cafe' | 'sight' | 'other';

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
  /** Optional price (tickets, flights, stays). */
  price?: Price | null;
  /** Older events: a per-person cost in the trip's currency, shown as the price when there's no `price`. */
  cost?: number;
  links: LinkItem[];
  attendeeIds: string[];
  /** The saved Place this event is at, when it came from Collections or was starred. Starring the event stars the Place. */
  placeId?: string;
  /** Older events: people who starred this event. Moved to the event's Place (see useStarMigration). */
  starredBy?: string[];
  /** A Stay's check-out day (one Stay shows as check-in on `date` and check-out on `endDate`); a Flight's arrival day when it lands on a later day. */
  endDate?: string;
  /** Flight and Transport: where it leaves from and arrives (`location` is the departure place). Typed text and the place it found. */
  fromText?: string;
  toText?: string;
  to?: Place | null;
  /** Flight number (Flight). */
  ref?: string;
  createdBy: string;
  createdAt: number;
};

/** 1 = thumbs up, -1 = thumbs down, 0 = no vote. */
export type Vote = 1 | -1 | 0;

export type IdeaStatus = 'open' | 'approved' | 'rejected';

export type Idea = {
  id: string;
  title: string;
  /** The saved Place this idea is about (Collections). The Place is the source of truth; the idea only points at it. */
  placeId?: string;
  category: Category;
  notes: string;
  /** Optional price; an Event made from this idea shows the same one. */
  price?: Price | null;
  /** Older ideas: an estimated cost per person in the trip's currency. */
  cost?: number;
  links: LinkItem[];
  votes: Record<string, true>;
  /** Thumbs-down votes. Older ideas don't have this field. */
  downvotes?: Record<string, true>;
  status: IdeaStatus;
  activityId?: string;
  createdBy: string;
  createdAt: number;
};

/** Removed with budgeting; older trips' expenses are deleted by useBudgetCleanup. */
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

/** The fixed Collections categories. Set from the place type Rove detects when saving; the person can change it. */
export type PlaceCategory = 'restaurant' | 'cafe' | 'bar' | 'shop' | 'stay' | 'sight';

/**
 * A saved Place (Collections): a café, bar, restaurant, shop, stay or sight, filed under country → city → category.
 * Personal: it belongs to the person who saved it. It's the single source of truth: Ideas and Events point at it
 * (`placeId`) and never copy it. Anyone signed in can read one by id, so trip-mates see a Place added to their trip.
 * `starredBy`: everyone who starred it (each person's favourites). Deleting a trip never deletes Places.
 */
export type SavedPlace = {
  id: string;
  ownerId: string;
  name: string;
  category: PlaceCategory;
  city: string;
  country: string;
  /** ISO code, lower case; '' when no country was found (the Unsorted collection). */
  countryCode: string;
  lat: number | null;
  lng: number | null;
  url?: string;
  image?: string;
  /** Where it was saved from ("TikTok", "Google Maps"). */
  source?: string;
  /** What kind of place the map data calls it ("Ramen", "Museum"). */
  kind?: string;
  notes?: string;
  starredBy?: string[];
  createdAt: number;
};

/** What the readLink Cloud Function (or the in-app fallback) found in a shared link. */
export type LinkPreview = {
  url: string;
  site: string;
  title: string;
  image: string;
  description?: string;
  place: { name: string; city: string; country: string; countryCode: string; lat: number; lng: number; type: string; kind: string; isArea?: boolean; category?: PlaceCategory } | null;
};
