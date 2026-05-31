import LogoutButton from "@/components/logout-button";

export default function AdminHeader() {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-3xl font-bold text-gray-900">Admin Bereich</h1>
      <LogoutButton />
    </div>
  );
}


