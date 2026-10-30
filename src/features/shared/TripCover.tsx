import type { ReactNode } from 'react';
import { AvatarStack, COVER_ILLUSTRATIONS, Illustration } from '../../design/components';
import { personName, useProfiles } from '../../data/hooks';
import type { Trip } from '../../data/types';
import { coverPosition } from '../../lib/image';
import s from './TripCover.module.css';

/**
 * A trip's cover: its photo, or else one of the illustrated scenes (always the same one for the same trip).
 * Anything passed as children (a badge, the travellers, an edit button) sits on top of it.
 */
export function TripCover({ trip, className, children }: { trip: Trip; className?: string; children?: ReactNode }) {
  let h = 0;
  for (const c of trip.id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return (
    <div className={[s.cover, className].filter(Boolean).join(' ')}>
      {trip.coverPhoto
        ? <img src={trip.coverPhoto} alt="" className={s.photo} style={{ objectPosition: coverPosition(trip) }} />
        : <Illustration name={COVER_ILLUSTRATIONS[Math.abs(h) % COVER_ILLUSTRATIONS.length]} />}
      {children}
    </div>
  );
}

/** Who's going, as a row of faces on a white pill in the cover's bottom-left corner. */
export function CoverPeople({ trip, size = 28 }: { trip: Trip; size?: number }) {
  const profiles = useProfiles(trip.memberIds);
  const n = trip.memberIds.length;
  return (
    <span className={s.people} role="img" aria-label={`${n} traveler${n === 1 ? '' : 's'}`}>
      <AvatarStack people={trip.memberIds.map((id) => ({ id, name: personName(profiles, id), photo: profiles[id]?.photo }))} size={size} />
    </span>
  );
}
