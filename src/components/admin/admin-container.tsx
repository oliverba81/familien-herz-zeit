interface AdminContainerProps {
  children: React.ReactNode;
}

export default function AdminContainer({ children }: AdminContainerProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">{children}</div>
        </div>
      </div>
    </div>
  );
}


