import { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { LayoutGrid, LogOut } from "lucide-react";
import { api, type AuthUser, type PortalApp } from "../lib/api";
import logoFull from "../assets/logo-full.png";

type Props = { auth: AuthUser; onLogout: () => void };

function AppIcon({ name }: { name: string }) {
  const Icon = (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[name];
  return Icon ? <Icon size={22} /> : <LayoutGrid size={22} />;
}

export default function DashboardPage({ auth, onLogout }: Props) {
  const [apps, setApps] = useState<PortalApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .myApps(auth.token)
      .then(setApps)
      .catch((err) => setError(err instanceof Error ? err.message : "Gagal memuat daftar aplikasi"))
      .finally(() => setLoading(false));
  }, [auth.token]);

  return (
    <div className="min-h-screen" style={{ background: "var(--surface)" }}>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <img src={logoFull} alt="PT Dukuh Raya Shipyard" className="h-8 w-auto" />
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">
              Masuk sebagai <span className="font-semibold text-slate-700">{auth.username}</span>
            </span>
            <button onClick={onLogout} className="btn btn-secondary btn-sm">
              <LogOut size={14} />
              Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-display mb-1 text-2xl font-semibold" style={{ color: "var(--ink)" }}>
          Aplikasi Kamu
        </h1>
        <p className="mb-8 text-sm text-slate-500">Pilih aplikasi yang ingin dibuka.</p>

        {loading && <p className="text-sm text-slate-500">Memuat...</p>}
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}

        {!loading && !error && apps.length === 0 && (
          <div className="app-card items-center text-center">
            <p className="text-sm text-slate-500">
              Belum ada aplikasi yang di-assign ke akunmu. Hubungi admin untuk mendapat akses.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => (
            <a
              key={app.id}
              href={`${app.base_url}#token=${encodeURIComponent(auth.token)}`}
              className="app-card"
            >
              <span className="app-card-icon">
                <AppIcon name={app.icon} />
              </span>
              <div>
                <h2 className="font-display text-base font-semibold" style={{ color: "var(--ink)" }}>
                  {app.name}
                </h2>
                {app.description && <p className="mt-1 text-sm text-slate-500">{app.description}</p>}
              </div>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}
