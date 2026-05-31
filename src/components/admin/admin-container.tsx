import AdminSidebar from "./admin-sidebar";

interface AdminContainerProps {
  children: React.ReactNode;
}

export default function AdminContainer({ children }: AdminContainerProps) {
  return (
    <div className="min-h-screen bg-gray-100 flex">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="w-full">
            <div className="bg-white rounded-lg shadow-sm p-6">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}

