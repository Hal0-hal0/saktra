import { ProfileProvider } from "./profile-provider"
export default function MembersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProfileProvider>
      {children}
    </ProfileProvider>
  )
}