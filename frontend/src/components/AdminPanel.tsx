import { useEffect, useState } from "react";
import { KeyRound, Plus, ShieldPlus, Trash2, UserPlus } from "lucide-react";
import { api, type AccessGrant, type AuthUser, type PortalApp, type PortalUser } from "../lib/api";

type Props = { auth: AuthUser };

export default function AdminPanel({ auth }: Props) {
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [apps, setApps] = useState<PortalApp[]>([]);
  const [grants, setGrants] = useState<AccessGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "user" as "user" | "admin" });
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  const [showAddApp, setShowAddApp] = useState(false);
  const [newApp, setNewApp] = useState({ key: "", name: "", description: "", icon: "LayoutGrid", base_url: "" });

  const [grantForm, setGrantForm] = useState({ username: "", app_id: "" });

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [u, a, g] = await Promise.all([
        api.listUsers(auth.token),
        api.listAllApps(auth.token),
        api.listAccess(auth.token),
      ]);
      setUsers(u);
      setApps(a);
      setGrants(g);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createUser() {
    if (!newUser.username.trim() || newUser.password.length < 4) {
      setError("Username wajib diisi dan password minimal 4 karakter");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.createUser(auth.token, newUser);
      setNewUser({ username: "", password: "", role: "user" });
      setShowAddUser(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat user");
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(username: string) {
    if (!confirm(`Hapus akun "${username}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setBusy(true);
    setError("");
    try {
      await api.deleteUser(auth.token, username);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus user");
    } finally {
      setBusy(false);
    }
  }

  async function submitReset() {
    if (!resetTarget || resetPassword.length < 4) {
      setError("Password baru minimal 4 karakter");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.changePassword(auth.token, resetTarget, resetPassword);
      setResetTarget(null);
      setResetPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal reset password");
    } finally {
      setBusy(false);
    }
  }

  async function createApp() {
    if (!newApp.key.trim() || !newApp.name.trim() || !newApp.base_url.trim()) {
      setError("Key, nama, dan URL app wajib diisi");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.createApp(auth.token, { ...newApp, sort_order: apps.length });
      setNewApp({ key: "", name: "", description: "", icon: "LayoutGrid", base_url: "" });
      setShowAddApp(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat app");
    } finally {
      setBusy(false);
    }
  }

  async function submitGrant() {
    if (!grantForm.username || !grantForm.app_id) {
      setError("Pilih user dan app dulu");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.grantAccess(auth.token, { username: grantForm.username, app_id: Number(grantForm.app_id), role: "user" });
      setGrantForm({ username: "", app_id: "" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memberi akses");
    } finally {
      setBusy(false);
    }
  }

  async function revokeGrant(username: string, app_id: number) {
    setBusy(true);
    setError("");
    try {
      await api.revokeAccess(auth.token, { username, app_id });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mencabut akses");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="py-8 text-center text-sm text-slate-500">Memuat...</p>;

  return (
    <div className="max-w-4xl space-y-6">
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      {/* Users */}
      <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-bold text-slate-900">Akun</h3>
            <p className="mt-1 text-sm text-slate-500">Akun yang bisa login ke Portal (dan semua app yang di-assign).</p>
          </div>
          <button type="button" onClick={() => setShowAddUser((s) => !s)} className="btn btn-primary btn-md">
            <UserPlus size={15} />
            Tambah Akun
          </button>
        </div>

        {showAddUser && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block text-xs font-medium text-slate-600">
                Username
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                  value={newUser.username}
                  onChange={(e) => setNewUser((u) => ({ ...u, username: e.target.value }))}
                />
              </label>
              <label className="block text-xs font-medium text-slate-600">
                Password
                <input
                  type="password"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                  value={newUser.password}
                  onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))}
                />
              </label>
              <label className="block text-xs font-medium text-slate-600">
                Role
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"
                  value={newUser.role}
                  onChange={(e) => setNewUser((u) => ({ ...u, role: e.target.value as "user" | "admin" }))}
                >
                  <option value="user">User (cuma app yang di-assign)</option>
                  <option value="admin">Admin (lihat semua app)</option>
                </select>
              </label>
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" disabled={busy} onClick={createUser} className="btn btn-primary btn-sm">
                <Plus size={14} />
                Simpan
              </button>
              <button type="button" onClick={() => setShowAddUser(false)} className="btn btn-secondary btn-sm">
                Batal
              </button>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{u.username}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        u.role === "admin" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setResetTarget(u.username);
                        setResetPassword("");
                      }}
                      className="btn btn-ghost btn-sm"
                    >
                      <KeyRound size={13} />
                      Reset Password
                    </button>
                    {u.username !== "admin" && u.username !== auth.username && (
                      <button type="button" disabled={busy} onClick={() => deleteUser(u.username)} className="btn btn-danger btn-sm ml-2">
                        <Trash2 size={13} />
                        Hapus
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Apps */}
      <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-bold text-slate-900">Aplikasi</h3>
            <p className="mt-1 text-sm text-slate-500">Aplikasi yang bisa muncul di dashboard Portal.</p>
          </div>
          <button type="button" onClick={() => setShowAddApp((s) => !s)} className="btn btn-primary btn-md">
            <Plus size={15} />
            Tambah App
          </button>
        </div>

        {showAddApp && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-xs font-medium text-slate-600">
                Key (unik, huruf kecil)
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                  placeholder="misal: dukuh-raya-hr"
                  value={newApp.key}
                  onChange={(e) => setNewApp((a) => ({ ...a, key: e.target.value }))}
                />
              </label>
              <label className="block text-xs font-medium text-slate-600">
                Nama
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                  value={newApp.name}
                  onChange={(e) => setNewApp((a) => ({ ...a, name: e.target.value }))}
                />
              </label>
              <label className="block text-xs font-medium text-slate-600 sm:col-span-2">
                URL Aplikasi
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                  placeholder="https://..."
                  value={newApp.base_url}
                  onChange={(e) => setNewApp((a) => ({ ...a, base_url: e.target.value }))}
                />
              </label>
              <label className="block text-xs font-medium text-slate-600 sm:col-span-2">
                Deskripsi (opsional)
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                  value={newApp.description}
                  onChange={(e) => setNewApp((a) => ({ ...a, description: e.target.value }))}
                />
              </label>
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" disabled={busy} onClick={createApp} className="btn btn-primary btn-sm">
                <Plus size={14} />
                Simpan App
              </button>
              <button type="button" onClick={() => setShowAddApp(false)} className="btn btn-secondary btn-sm">
                Batal
              </button>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">URL</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((a) => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{a.name}</td>
                  <td className="px-4 py-3 text-slate-500">{a.base_url}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Access grants */}
      <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <h3 className="font-display text-lg font-bold text-slate-900">Akses per App</h3>
          <p className="mt-1 text-sm text-slate-500">
            Batasi akun non-admin supaya cuma bisa lihat app tertentu. Admin otomatis lihat semua app aktif.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <label className="block text-xs font-medium text-slate-600">
            Akun
            <select
              className="mt-1 w-48 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"
              value={grantForm.username}
              onChange={(e) => setGrantForm((f) => ({ ...f, username: e.target.value }))}
            >
              <option value="">Pilih akun</option>
              {users.map((u) => (
                <option key={u.id} value={u.username}>
                  {u.username}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-600">
            App
            <select
              className="mt-1 w-48 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"
              value={grantForm.app_id}
              onChange={(e) => setGrantForm((f) => ({ ...f, app_id: e.target.value }))}
            >
              <option value="">Pilih app</option>
              {apps.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" disabled={busy} onClick={submitGrant} className="btn btn-primary btn-sm">
            <ShieldPlus size={14} />
            Beri Akses
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Akun</th>
                <th className="px-4 py-3">App</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {grants.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                    Belum ada akses spesifik yang diberikan.
                  </td>
                </tr>
              )}
              {grants.map((g) => (
                <tr key={g.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{g.username}</td>
                  <td className="px-4 py-3 text-slate-600">{g.app_name}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => revokeGrant(g.username, g.app_id)}
                      className="btn btn-danger btn-sm"
                    >
                      <Trash2 size={13} />
                      Cabut
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {resetTarget && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
            <h4 className="font-display text-base font-bold text-slate-900">Reset password "{resetTarget}"</h4>
            <input
              type="password"
              autoFocus
              className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Password baru (min. 4 karakter)"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setResetTarget(null)} className="btn btn-secondary btn-sm">
                Batal
              </button>
              <button type="button" disabled={busy} onClick={submitReset} className="btn btn-primary btn-sm">
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
