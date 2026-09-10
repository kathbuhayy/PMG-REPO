import React, { useEffect, useState, useCallback } from "react";
import { buildApiUrl } from "../config/api";
import { adminFetch } from "../utils/adminFetch";

export default function AdminBranches() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", address: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchBranches = useCallback(async () => {
    try {
      const res = await adminFetch(buildApiUrl("/api/admin/branches"));
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to fetch branches");
      setBranches(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await adminFetch(buildApiUrl("/api/branches"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to create branch");
      setForm({ name: "", address: "" });
      await fetchBranches();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (branch) => {
    try {
      const res = await adminFetch(buildApiUrl(`/api/branches/${branch.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !branch.active }),
      });
      if (!res.ok) throw new Error("Failed to update branch");
      await fetchBranches();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 700 }}>
      <h2>Branches</h2>

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Branch name (e.g. Cavite Branch)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          style={{ flex: 1, minWidth: 200, padding: 8 }}
        />
        <input
          type="text"
          placeholder="Address (optional)"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          style={{ flex: 1, minWidth: 200, padding: 8 }}
        />
        <button type="submit" disabled={submitting} style={{ padding: "8px 16px" }}>
          {submitting ? "Adding…" : "Add Branch"}
        </button>
      </form>

      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ padding: 8 }}>Name</th>
              <th style={{ padding: 8 }}>Address</th>
              <th style={{ padding: 8 }}>Status</th>
              <th style={{ padding: 8 }}></th>
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => (
              <tr key={b.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: 8 }}>{b.name}</td>
                <td style={{ padding: 8 }}>{b.address || "—"}</td>
                <td style={{ padding: 8 }}>{b.active ? "Active" : "Inactive"}</td>
                <td style={{ padding: 8 }}>
                  <button type="button" onClick={() => toggleActive(b)}>
                    {b.active ? "Deactivate" : "Reactivate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}