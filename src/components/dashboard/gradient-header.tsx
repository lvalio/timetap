interface GradientHeaderProps {
  name: string
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function getFormattedDate(): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date())
}

export function GradientHeader({ name }: GradientHeaderProps) {
  return (
    <header
      role="status"
      className="bg-gradient-to-r from-[#4facfe] to-[#00f2fe] px-5 pb-5 pt-6 md:hidden"
    >
      <h1 className="text-lg font-semibold text-white">
        {getGreeting()}, {name}
      </h1>
      <p className="mt-0.5 text-sm text-white/80">{getFormattedDate()}</p>

      <div className="mt-4 flex gap-3">
        <StatPill label="Sessions today" value={0} />
        <StatPill label="Active clients" value={0} />
        <StatPill label="New bookings" value={0} />
      </div>
    </header>
  )
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 rounded-xl bg-white/20 px-3 py-2 text-center">
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-[10px] text-white/80">{label}</p>
    </div>
  )
}
