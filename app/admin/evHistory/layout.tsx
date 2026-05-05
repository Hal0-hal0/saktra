import { EventProvider } from "../eventsPage/event-provider"

export default function EventHistoryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <EventProvider>{children}</EventProvider>
}
