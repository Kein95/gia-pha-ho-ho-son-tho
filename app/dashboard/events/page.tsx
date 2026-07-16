import { DashboardProvider } from "@/components/DashboardContext";
import EventsList from "@/components/EventsList";
import MemberDetailModal from "@/components/MemberDetailModal";
import { db } from "@/lib/db";
import { persons, customEvents } from "@/lib/db/schema";
import { canSeeSensitive } from "@/lib/auth/permissions";
import { sanitizePersons } from "@/lib/person-visibility";

export const metadata = {
  title: "Sự kiện gia phả",
};

export default async function EventsPage() {
  const [personsRows, eventsRows] = await Promise.all([
    db
      .select({
        id: persons.id,
        full_name: persons.fullName,
        birth_year: persons.birthYear,
        birth_month: persons.birthMonth,
        birth_day: persons.birthDay,
        death_year: persons.deathYear,
        death_month: persons.deathMonth,
        death_day: persons.deathDay,
        death_lunar_year: persons.deathLunarYear,
        death_lunar_month: persons.deathLunarMonth,
        death_lunar_day: persons.deathLunarDay,
        is_deceased: persons.isDeceased,
        avatar_url: persons.avatarUrl,
      })
      .from(persons),
    db
      .select({
        id: customEvents.id,
        name: customEvents.name,
        content: customEvents.content,
        event_date: customEvents.eventDate,
        location: customEvents.location,
        created_by: customEvents.createdBy,
      })
      .from(customEvents),
  ]);

  return (
    <DashboardProvider>
      <div className="flex-1 w-full relative flex flex-col pb-12">
        <div className="w-full relative z-20 py-6 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
          <h1 className="title">Sự kiện gia phả</h1>
          <p className="text-stone-500 mt-1 text-sm">
            Sinh nhật, ngày giỗ (âm lịch) và các sự kiện tuỳ chỉnh
          </p>
        </div>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1">
          <EventsList
            persons={sanitizePersons(personsRows, await canSeeSensitive())}
            customEvents={eventsRows}
          />
        </main>
      </div>

      <MemberDetailModal />
    </DashboardProvider>
  );
}
