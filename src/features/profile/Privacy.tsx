import { PageHeader, PageSection } from '../../design/components';
import { Content } from '../../app/Shell';
import s from './Profile.module.css';

/** When the policy last changed. Update it with every change to the text below. */
const UPDATED = '11 November 2026';

/**
 * Rove's privacy policy (You → Privacy policy, the small link under the version). Plain language, following the
 * Australian Privacy Principles and the GDPR's transparency rules: what is collected, why, who receives it, how long
 * it's kept, and how to see, change or delete it. Keep it true: change it whenever Rove starts sending data somewhere new.
 */
export function Privacy() {
  return (
    <Content>
      <PageHeader size="small" title="Privacy policy" subtitle={`Last updated ${UPDATED}`} back={{ to: '/profile', label: 'You' }} />
      <div className={s.policy}>
        <Section title="The short version">
          <ul>
            <li>Rove keeps what you put in it (trips, plans, saved places) so you can plan with the people you invite.</li>
            <li>Only people on a trip can see that trip. Your saved places and settings are yours, unless you share a country's collection with someone.</li>
            <li>No ads, no tracking, no selling or renting your data. Rove has no analytics tools.</li>
            <li>You can delete your account and data at any time: You → Delete account.</li>
          </ul>
        </Section>

        <Section title="What Rove collects">
          <ul>
            <li><b>Your Google sign-in:</b> your name, email address and profile photo. Rove never sees your password.</li>
            <li><b>Your profile:</b> the name and photo you choose. People on your trips see them.</li>
            <li><b>Your trips:</b> names, dates, budgets, events, booking references, prices, notes, ideas, votes, links,
              photo-album links and messages you and your trip-mates add.</li>
            <li><b>Your saved places:</b> places, links and notes you save, and which ones you star.</li>
            <li><b>Private settings:</b> your home city, places you've been, your currency and which messages you've read.
              Only you can see these.</li>
            <li><b>On your phone only:</b> your maps app, appearance, recently viewed items and a cached copy of your data
              so Rove works offline. These never leave your phone.</li>
          </ul>
          <p>Rove doesn't collect your location, contacts or photos. It reads your clipboard only when you tap Paste.</p>
        </Section>

        <Section title="Why">
          <p>Only to run Rove: to sign you in, keep your trips in sync between you and your trip-mates, and show covers,
            maps, weather, flight status and prices. Rove doesn't use your data for advertising or profiling.</p>
        </Section>

        <Section title="Who can see it">
          <ul>
            <li><b>People on your trips</b> see that trip, everything in it, and your name and photo.</li>
            <li><b>Saved places</b> you add to a trip can be seen by the people on that trip.</li>
            <li><b>A collection you share</b> (your saved places in one country) can be seen by the people you invite to it, and they see each other's names. Remove someone and they lose access.</li>
            <li><b>Nobody else.</b> This is enforced by the database itself, not just the app.</li>
          </ul>
        </Section>

        <Section title="Services Rove uses">
          <p>Rove relies on these services. Each receives only what it needs, and some see your device's internet address
            when your phone contacts them.</p>
          <ul>
            <li><b>Google Firebase</b> (sign-in and the database where your data is stored).</li>
            <li><b>Cloudflare</b> (Rove's small server, which looks up cover photos and flight status).</li>
            <li><b>Unsplash</b> (a city or country name, to find a cover photo).</li>
            <li><b>AeroDataBox</b> (a flight number and date, for flight status).</li>
            <li><b>Open-Meteo, Photon (komoot), Nominatim and OpenStreetMap</b> (place names and addresses you search
              for, weather, maps).</li>
            <li><b>ExchangeRate-API</b> (currency codes, for conversions).</li>
            <li><b>The website of a link you save</b>, which Rove opens to read its title and photo.</li>
          </ul>
          <p>Some of these services store data outside your country, including in the United States.</p>
        </Section>

        <Section title="How long it's kept">
          <p>As long as you have an account. When you delete it, Rove deletes your profile, settings, messages and saved
            places straight away. Trips you made go to another person on the trip (or are deleted if you're the only one),
            and saved places a trip still uses go to someone on that trip. Events and ideas you added to a shared trip
            stay with the trip. Some parts of deleted trips may stay in the database, unreachable by anyone, until they're
            cleaned up.</p>
        </Section>

        <Section title="Keeping it safe">
          <p>Data travels encrypted (HTTPS) and is stored by Google, encrypted. Access is controlled by security rules
            that are tested whenever they change. Secret keys stay on Rove's server, never in the app.</p>
        </Section>

        <Section title="Your choices and rights">
          <ul>
            <li><b>See and change it:</b> everything Rove holds about you is shown in the app, and you can edit it there.</li>
            <li><b>Delete it:</b> You → Delete account.</li>
            <li><b>Ask a question or make a complaint:</b> contact the developer through Rove's App Store page. If you're
              not happy with the answer, you can contact your privacy regulator (in Australia, the OAIC).</li>
          </ul>
        </Section>

        <Section title="Children">
          <p>Rove isn't meant for children under 13, and doesn't knowingly collect their data.</p>
        </Section>

        <Section title="Changes">
          <p>If this policy changes, the date at the top changes too. Big changes will be shown in the app.</p>
        </Section>
      </div>
    </Content>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <PageSection title={title}><div className={['t-body', s.policyText].join(' ')}>{children}</div></PageSection>;
}
