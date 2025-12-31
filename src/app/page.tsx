import Clock from "@/components/widgets/Clock";
import Weather from "@/components/widgets/Weather";
import Calendar from "@/components/widgets/Calendar";
import News from "@/components/widgets/News";
import AISummary from "@/components/widgets/AISummary";
import Spotify from "@/components/widgets/Spotify";

export default function MirrorPage() {
  return (
    <main className="mirror-container mx-auto bg-black flex flex-col">

      {/* Top Section - Clock */}
      <section className="pt-16">
        <Clock />
      </section>

      {/* Divider with shimmer animation */}
      <div className="divider-shimmer mx-12 my-8" />

      {/* AI Summary - Daily Briefing */}
      <section>
        <AISummary />
      </section>

      {/* Divider with shimmer animation */}
      <div className="divider-shimmer mx-12 my-8" />

      {/* Spotify Now Playing (only shows when configured and playing) */}
      <section>
        <Spotify />
      </section>

      {/* Weather Section */}
      <section>
        <Weather />
      </section>

      {/* Divider with shimmer animation */}
      <div className="divider-shimmer mx-12 my-8" />

      {/* Calendar Section */}
      <section className="flex-1">
        <Calendar />
      </section>

      {/* Divider with shimmer animation */}
      <div className="divider-shimmer mx-12 my-8" />

      {/* News Section */}
      <section>
        <News />
      </section>

      {/* Bottom spacing */}
      <div className="pb-16" />
    </main>
  );
}
