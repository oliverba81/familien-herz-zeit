interface UserInfoProps {
  email: string;
  role: string;
}

export default function UserInfo({ email, role }: UserInfoProps) {
  return (
    <div className="p-4 bg-rose-50 rounded-lg">
      <p className="text-gray-700">
        <span className="font-semibold">Willkommen,</span> {email}
      </p>
      <p className="text-sm text-gray-600 mt-1">
        Rolle: <span className="font-semibold">{role}</span>
      </p>
    </div>
  );
}

