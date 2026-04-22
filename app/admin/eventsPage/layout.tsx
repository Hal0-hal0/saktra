import { EventProvider } from "./event-provider"
export default function MembersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <EventProvider>
      {children}
    </EventProvider>
  )
}