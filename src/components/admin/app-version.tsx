import { appVersion } from "@/generated/version";

interface AppVersionProps {
  collapsed?: boolean;
}

export default function AppVersion({ collapsed = false }: AppVersionProps) {
  return (
    <a
      href={appVersion.versionUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={appVersion.buildInfo}
      className={`mt-2 block text-xs text-gray-500 hover:text-gray-300 transition-colors ${
        collapsed ? "text-center px-1" : "px-4"
      }`}
    >
      {appVersion.version}
    </a>
  );
}
