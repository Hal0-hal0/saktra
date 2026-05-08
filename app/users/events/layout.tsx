import { UserEventProvider } from './user-event-provider'

export default function UserEventsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <UserEventProvider>{children}</UserEventProvider>
}