import type { EventKind } from '../lib/categories';
/** `countryCode` is the ISO 3166 two-letter code (lowercase), used for flags and the trip's country badges. */
export type Place = { name: string; lat: number; lng: number; country?: string; countryCode?: string };

/**
 * Everyone on a trip is equal (people and sharing, item 1). A traveller is on the trip, even for part of it, and plans
 * everything; a follower (family at home, a friend who isn't going) sees the plan and chats, and changes nothing.
 */
export type Role = 'traveller' | 'follower';
/** What a trip's `roles` may hold: older trips still store 'owner', 'editor', 'member' (travellers) or 'viewer' (a
 *  follower) until a traveller opens them and the app migrates them. Read it through `roleOf` (src/data/roles.ts). */
export type StoredRole = Role | 'owner' | 'editor' | 'member' | 'viewer';

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

/** Which event chats you've read, synced across your devices (users/{uid}/private/reads): when you last opened each
 *  event, by event id; `since` is when this started, so older messages don't count as new. */
export type ChatReads = { since: number; at: Record<string, number> };

/** An Unsplash photo as stored on a trip: hotlinked URLs and what the credit needs. */
export type TripPhoto = { id: string; url: string; small: string; color?: string | null; name: string; username: string; downloadLocation: string };

export type Trip = {
  id: string;
  /** In Recently deleted since then (ms), by whom; gone for good after 30 days */
  deletedAt?: number; deletedBy?: string;
  name: string;
  /** The first stop: names the trip and finds its cover photo. Always `stops[0]` when there are stops. */
  destination: Place | null;
  /** Every place picked in New trip, in order (at most 30). Older trips have none: read them through `tripStops`. */
  stops?: Place[];
  startDate: string; // YYYY-MM-DD
  endDate: string;
  /** 'month': the dates are only roughly known — the whole month from startDate (shown as "March 2027"). Missing means exact. */
  dateMode?: 'exact' | 'month';
  currency: string;
  /** The trip's budget per person (New trip "Want to set a budget?" or Edit trip). null or missing: not tracking a budget.
   *  Overview's Budget card subtracts the per-person prices of the events from it. */
  budget?: Price | null;
  /** The old, removed budgeting. Older trips may still hold these until an organizer opens them (useBudgetCleanup deletes them). */
  dailyBudget?: number;
  totalBudget?: number;
  dayBudgets?: Record<string, number>;
  daySpent?: Record<string, number>;
  /** No longer saved or shown; older trips may still have it. */
  coverColor?: string;
  /** Small JPEG as a data URL (see lib/image.ts), or null for none. */
  coverPhoto?: string | null;
  /** A photo of the place from Unsplash (handover v2 B4), shown when there's no coverPhoto, with its credit. */
  cover?: TripPhoto | null;
  /** Which part of the cover photo shows when it's cropped: CSS object-position in % (50/50 = centre). */
  coverPosition?: { x: number; y: number } | null;
  /** Who started the trip: a record only, it gives no extra rights. Older trips have `ownerId` instead (migrated). */
  createdBy?: string;
  ownerId?: string;
  memberIds: string[];
  roles: Record<string, StoredRole>;
  joinedVia?: string;
  createdAt: number;
};

/** A link, PDF or booking. `emailUrl` optionally points at the email it came from (e.g. a Gmail message link). */
export type LinkItem = { label: string; url: string; emailUrl?: string };

/** Event categories (src/lib/categories.ts: 6 types → categories → behaviours). 'stay', 'activity', 'transport', 'food', 'drinks' and 'other' are older values (see LEGACY there). */
/**
 * A known price, in the currency it was entered or booked in (an amount of 0 is "Free"). Optional everywhere and never
 * added up: a price belongs to the one item it's on.
 */
export type Price = { amount: number; currency: string };

export type Category =
  | 'flight'
  | 'train' | 'bus' | 'ferry' | 'taxi' | 'transfer' | 'metro' | 'driver' | 'bike' | 'car' | 'campervan' | 'parking' | 'luggage'
  | 'hotel' | 'apartment' | 'airbnb' | 'resort' | 'hostel' | 'camping' | 'cruise' | 'friends'
  | 'restaurant' | 'cafe' | 'bar' | 'market' | 'tasting' | 'winery'
  | 'sight' | 'museum' | 'tour' | 'hike' | 'nature' | 'show' | 'sports' | 'festival' | 'themepark' | 'spa' | 'class' | 'adventure' | 'nightlife' | 'shopping' | 'meetup'
  | 'free' | 'rest' | 'note' | 'errand'
  // older values, read through LEGACY in categories.ts
  | 'stay' | 'activity' | 'transport' | 'food' | 'drinks' | 'other';

export type Activity = {
  id: string;
  /** In Recently deleted since then (ms), by whom; gone for good after 30 days */
  deletedAt?: number; deletedBy?: string;
  date: string;
  startTime: string; // HH:mm or ''
  endTime: string;
  title: string;
  category: Category;
  /** Derived from `category` when saved (its type and behaviour, see categories.ts); never typed in. Read through
   *  eventType() / behaviourOf(), which also handle older events without them. */
  type?: string;
  behaviour?: string;
  /** The IANA time zone of where it happens ("Europe/Lisbon"), looked up from its place when saved; a journey's
   *  arrival zone is `toTz`. Times stay as typed (local to the place); the zone works out the exact moment
   *  (src/lib/timezone.ts). Older events have none and use the phone's zone. */
  tz?: string;
  toTz?: string;
  /** Legs of one booking (a flight with a connection) share this id; the layover between them is worked out, never stored. */
  journeyId?: string;
  location: Place | null;
  locationText: string;
  notes: string;
  /** Optional price (tickets, flights, stays). */
  price?: Price | null;
  /** Older events: a per-person cost in the trip's currency, shown as the price when there's no `price`. */
  cost?: number;
  links: LinkItem[];
  /** Who's in: the travellers this event is for (people and sharing, item 3). Only they edit it; anyone else on the trip
   *  sees it with I'm in. Read through peopleOf() (src/data/eventPeople.ts), which also handles older events. */
  people?: string[];
  /** Who added whom: `{ [uid]: addedByUid }` for people put in it by someone else, until they open it (the card's
   *  "New · added by Sam" Tag). */
  added?: Record<string, string>;
  /** Older events: who's going (usually just whoever added it). Migrated to `people` by the first traveller to open the trip. */
  attendeeIds?: string[];
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
  /** From the booking (forwarded confirmation emails, later; shown only when present): reference, seats, bags, the
   *  airline or train operator, and the "Manage booking" link from the email. */
  bookingRef?: string;
  seats?: string;
  bags?: string;
  operator?: string;
  manageUrl?: string;
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
  /** Set when the author edits it ("edited" shows by the bubble). */
  editedAt?: number;
};

/** A shared photo album (Google Photos, iCloud…). Only the link is stored; the photos stay with that service. */
export type Album = {
  id: string;
  title: string;
  url: string;
  createdBy: string;
  createdAt: number;
};

/** An invite link: to a trip (the default), or to someone's collection (`kind: 'collection'`, with the role it gives). */
/** A link to join a trip (its `role`: travelling or following; older links have none and mean travelling) or a shared
 *  collection (its `role`: Can edit / Can view). */
export type Invite = {
  code: string; tripId: string; tripName: string; createdBy: string; expiresAt: number;
  kind?: 'trip' | 'collection'; shareId?: string; countryCode?: string; role?: CollectionRole | Role;
};

/** In a shared collection: a Member adds, moves and favourites places; a Viewer looks, favourites and opens Maps. */
export type CollectionRole = 'member' | 'viewer';

/** Something that can go to Recently deleted (and come back) */
/** The parts of an event its change history covers (people and sharing, item 2): each change records one of them. */
export type TrackedField = 'title' | 'date' | 'time' | 'place' | 'price' | 'people';
export type TrackedValue = string | { startTime: string; endTime: string } | { location: Place | null; locationText: string } | Price | null | string[];
/**
 * One change to an event (`trips/{tripId}/activities/{eventId}/history/{id}`): who changed which part, when, from what to
 * what. Written in the same batch as the change itself; append-only (nobody edits or deletes one). A Restore is a change
 * too, with `restoredFrom` pointing at the change it undid.
 */
export type EventChange = { id: string; by: string; at: number; field: TrackedField; before: TrackedValue; after: TrackedValue; restoredFrom?: string };

export type Deletable = { kind: 'trip'; id: string } | { kind: 'event'; tripId: string; id: string } | { kind: 'place'; id: string };
/** How long Recently deleted keeps things */
export const KEEP_DELETED_MS = 30 * 86400_000;
/**
 * A shared country collection (`collectionShares/{ownerId}_{countryCode}`): its owner's places in that country and the
 * places its Members add, all marked `sharedIn: id`, seen by everyone in `memberIds`.
 */
export type CollectionShare = { id: string; ownerId: string; countryCode: string; memberIds: string[]; roles: Record<string, CollectionRole>; createdAt: number };

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
/** A saved Place's category: an event category (Food & drink, Stays or Activities; see placeKind()). Older saves may hold 'shop' or 'stay'. */
export type PlaceCategory = EventKind | 'shop' | 'stay';

/**
 * A saved Place (Collections): a café, bar, restaurant, shop, stay or sight, filed under country → city → category.
 * Personal: it belongs to the person who saved it. It's the single source of truth: Ideas and Events point at it
 * (`placeId`) and never copy it. Anyone signed in can read one by id, so trip-mates see a Place added to their trip.
 * `starredBy`: everyone who starred it (each person's favourites). Deleting a trip never deletes Places.
 */
export type SavedPlace = {
  id: string;
  /** In Recently deleted since then (ms), by whom; gone for good after 30 days */
  deletedAt?: number; deletedBy?: string;
  ownerId: string;
  /** 'place' (a real place; the default when missing), 'link' (an article or video with no place) or 'note'.
   *  Links and notes sit on their country, in "Links & notes", and have no city. */
  type?: 'place' | 'link' | 'note';
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
  /** The shared collection it's in (`collectionShares` id), so everyone in it can see it */
  sharedIn?: string;
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
