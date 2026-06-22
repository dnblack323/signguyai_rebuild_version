/**
 * Example Section page.
 *
 * Convention notes (match the rest of SignGuy):
 * - Rendered INSIDE MainLayout via a <Route> in App.js ProtectedRoutes (the layout
 *   provides the ribbon nav + chrome). Don't re-add nav here.
 * - Use Shadcn UI components from "../components/ui/*" and lucide-react icons.
 * - API base is process.env.REACT_APP_BACKEND_URL + "/api" (never hardcode a URL).
 * - Every interactive / data element gets a unique kebab-case data-testid.
 *
 * ⚠️ ONE LINE TO ALIGN WITH SIGNGUY'S AUTH:
 *   SignGuy already has an axios/auth setup (AuthContext + a shared client in
 *   src/lib or src/utils). Prefer importing THAT client instead of the local
 *   axios instance below, so the Authorization header + 401 handling match the
 *   rest of the app. The local version (reading the JWT from localStorage) is a
 *   safe fallback if you can't find the shared client.
 */
import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "../components/ui/card";
import { Loader2, Plus, Trash2 } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Fallback auth client — replace with SignGuy's shared api client if present.
const api = axios.create({ baseURL: API });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token"); // align key with AuthContext if different
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function ExampleSection() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/example-section");
      setItems(data);
    } catch (e) {
      console.error("Failed to load example section", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.post("/example-section", { name });
      setName("");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    await api.delete(`/example-section/${id}`);
    await load();
  };

  return (
    <div className="p-6 space-y-6" data-testid="example-section-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" data-testid="example-section-title">
          Example Section
        </h1>
      </div>

      <Card data-testid="example-section-create-card">
        <CardHeader><CardTitle>Add item</CardTitle></CardHeader>
        <CardContent className="flex gap-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Item name"
            data-testid="example-section-name-input"
          />
          <Button onClick={create} disabled={saving} data-testid="example-section-create-btn">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-10" data-testid="example-section-loading">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-3" data-testid="example-section-list">
          {items.map((item) => (
            <Card key={item.id} data-testid={`example-section-item-${item.id}`}>
              <CardContent className="flex items-center justify-between py-4">
                <span>{item.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(item.id)}
                  data-testid={`example-section-delete-${item.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
          {items.length === 0 && (
            <p className="text-muted-foreground" data-testid="example-section-empty">
              No items yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
