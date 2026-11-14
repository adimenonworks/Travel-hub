import { useToast } from '../../design/components';
import { store } from '../../data';
import { travellersOf } from '../../data/eventPeople';
import { useMe } from '../../data/hooks';
import type { Activity, Idea, NewDoc, NewNotice, SavedPlace, Trip } from '../../data/types';
import { behaviourOf, eventType } from '../../lib/categories';
import { haptic } from '../../lib/native';
import { eventCategoryOf } from '../../lib/places';
import { zoneAt, zoneOfDay } from '../../lib/timezone';

/**
 * Suggested ideas (people and sharing, item 6). An idea with a day shows on that day of everyone's Itinerary as a
 * Suggested card, with I'm in and Pass. The first I'm in makes it an event (the suggester and you in it) and takes it out
 * of Ideas for everyone; travellers who haven't answered still see the event on their day as a suggestion until they
 * say I'm in or Pass. It stays opt-in: nobody is counted as in until they tap I'm in.
 */

/** A dated idea still waiting on the board (not yet an event, not passed by everyone). */
export const isSuggestion = (i: Idea) => i.status === 'open' && !!i.date;

/** Did `uid` pass on this idea? */
export const passedIdea = (i: Idea, uid: string) => !!i.passed?.[uid];

/** An event made from a suggestion that `uid` (a traveller) hasn't answered: not in it, hasn't passed. */
export function awaitsAnswer(a: Activity, trip: Trip, uid: string) {
  return !!a.fromIdea && travellersOf(trip).includes(uid) && !(a.people ?? []).includes(uid) && !(a.passed ?? []).includes(uid);
}

/** The event a suggestion becomes: the idea's place, day and time, price, notes and links; the suggester and you in it. */
async function eventFrom(idea: Idea, place: SavedPlace | undefined, trip: Trip, activities: Activity[], me: string): Promise<NewDoc<Activity>> {
  const category = place ? eventCategoryOf(place.category) : idea.category;
  const location = place && place.lat != null && place.lng != null
    ? { name: place.name, lat: place.lat, lng: place.lng, country: place.country, countryCode: place.countryCode } : null;
  const tz = location ? await zoneAt(location).catch(() => undefined) : zoneOfDay(activities, idea.date!);
  const travellers = travellersOf(trip);
  return {
    title: place?.name ?? idea.title, category, type: eventType(category), behaviour: behaviourOf(category),
    date: idea.date!, startTime: idea.startTime ?? '', endTime: '',
    locationText: place ? [place.name, place.city].filter(Boolean).join(', ') : '', location,
    notes: idea.notes ?? '', links: idea.links ?? [], price: idea.price ?? null, cost: 0,
    ...(idea.placeId ? { placeId: idea.placeId } : {}), ...(tz ? { tz } : {}),
    people: travellers.filter((id) => id === me || id === idea.createdBy),
    fromIdea: idea.createdBy, passed: [], added: {},
  } as NewDoc<Activity>;
}

export function useSuggestions(trip: Trip, activities: Activity[]) {
  const me = useMe();
  const toast = useToast();
  const failed = () => toast({ tone: 'danger', label: "Couldn't save. Check your connection" });

  /** I'm in on a suggested idea: the first one makes the event (or joins the one someone just made). */
  const imInIdea = async (idea: Idea, place?: SavedPlace) => {
    haptic('light');
    try {
      const event = await eventFrom(idea, place, trip, activities, me.uid);
      const people = event.people ?? [];
      const about = { title: event.title, date: event.date, startTime: event.startTime };
      const waiting = travellersOf(trip).filter((id) => !people.includes(id) && !idea.passed?.[id]);
      const notices: NewNotice[] = [
        // "Sam and Priya are going to Fado night": everyone who hasn't answered, with I'm in and Pass
        { kind: 'going', to: waiting.slice(0, 50), people, ...about },
        // and the suggester hears you're going
        ...(idea.createdBy !== me.uid ? [{ kind: 'going' as const, to: [idea.createdBy], people: [me.uid], ...about }] : []),
      ];
      const { id, made } = await store.acceptIdea(trip.id, idea.id, event, notices);
      if (!made) {
        // Someone got there first: just say I'm in on theirs
        const theirs = activities.find((a) => a.id === id);
        if (theirs && !(theirs.people ?? []).includes(me.uid))
          await store.updateSub(trip.id, 'activities', id, { people: [...(theirs.people ?? []), me.uid] });
      }
      toast({ icon: 'check', label: `You’re in: ${event.title}` });
    } catch { failed(); }
  };

  /** Pass on a suggested idea: hidden for you; Passed for everyone once all the others have passed, or its suggester. */
  const passIdea = async (idea: Idea) => {
    haptic('light');
    const passed = { ...idea.passed, [me.uid]: true as const };
    const others = travellersOf(trip).filter((id) => id !== idea.createdBy);
    const done = idea.createdBy === me.uid || others.every((id) => passed[id]);
    const was = { passed: idea.passed ?? {}, status: idea.status };
    try {
      await store.updateSub(trip.id, 'ideas', idea.id, { passed, status: done ? 'rejected' : idea.status });
      toast({ label: done ? 'Moved to Passed' : 'Passed. It’s hidden from your itinerary', action: { label: 'Undo', onClick: () => { store.updateSub(trip.id, 'ideas', idea.id, was).catch(() => {}); } } });
    } catch { failed(); }
  };

  /** Pass on an event made from a suggestion: hidden from your itinerary only. */
  const passEvent = async (a: Activity) => {
    haptic('light');
    const was = a.passed ?? [];
    try {
      await store.updateSub(trip.id, 'activities', a.id, { passed: [...was.filter((id) => id !== me.uid), me.uid] });
      toast({ label: 'Passed. It’s hidden from your itinerary', action: { label: 'Undo', onClick: () => { store.updateSub(trip.id, 'activities', a.id, { passed: was }).catch(() => {}); } } });
    } catch { failed(); }
  };

  return { imInIdea, passIdea, passEvent };
}
